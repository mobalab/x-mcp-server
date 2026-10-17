// OFFLINE TESTS ONLY: the client module is replaced by a labelled fake.
// Run with: node --experimental-test-module-mocks --test test/pagination.test.mjs
import assert from 'node:assert/strict';
import { test, mock } from 'node:test';

const calls = [];
const rawPage = { data: [{ id: '1' }], meta: { result_count: 1, next_token: 'NEXT_TOKEN_1234567' } };
const record = name => async (...args) => { calls.push([name, ...args]); return name === 'userByUsername' ? { data: { id: '42' } } : fakeResponse(name); };
// followers/following return the raw response; the others return a paginator exposing it as `.data`.
const fakeResponse = name => ['followers', 'following'].includes(name) ? rawPage : { data: rawPage };
const names = ['userByUsername', 'followers', 'following', 'userTimeline', 'userMentionTimeline', 'userLikedTweets', 'listsOwned', 'listFollowed', 'listMemberships'];
const fakeClient = { v2: Object.fromEntries(names.map(n => [n, record(n)])) };
mock.module('../build/client.js', { namedExports: {
  getClient: async () => fakeClient,
  getAuthenticatedUserId: async () => '42',
  getOAuth2Token: async () => { throw new Error('unused'); },
  hasOAuth2Config: () => false,
} });
const h = await import('../build/tools/user-data-handlers.js');
const decode = r => JSON.parse(r.content[0].text);
const lastCall = name => calls.filter(c => c[0] === name).at(-1)[2];

const cases = [
  ['handleGetUserFollowers', 'followers', 1],
  ['handleGetUserFollowing', 'following', 1],
  ['handleGetUserTweets', 'userTimeline', 5],
  ['handleGetUserMentions', 'userMentionTimeline', 5],
  ['handleGetUserLikedTweets', 'userLikedTweets', 5],
  ['handleGetOwnedLists', 'listsOwned', 1],
  ['handleGetFollowedLists', 'listFollowed', 1],
  ['handleGetListMemberships', 'listMemberships', 1],
];

for (const [handler, method, min] of cases) {
  test(`${handler} exposes meta.next_token, forwards pagination_token and enforces min limit ${min}`, async () => {
    calls.length = 0;
    const out = decode(await h[handler]({ username: 'someone', limit: 1, pagination_token: 'PAGE2_TOKEN_123456' }));
    assert.equal(out.meta.next_token, 'NEXT_TOKEN_1234567');
    assert.equal(lastCall(method).pagination_token, 'PAGE2_TOKEN_123456');
    assert.equal(lastCall(method).max_results, min);
  });
}

test('pagination_token is omitted from the request when not given, and rejected when invalid', async () => {
  calls.length = 0;
  await h.handleGetUserFollowers({ username: 'someone' });
  assert.ok(!('pagination_token' in lastCall('followers')));
  await assert.rejects(h.handleGetUserFollowers({ username: 'someone', pagination_token: 5 }), /pagination_token/);
});
