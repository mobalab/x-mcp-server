// OFFLINE TESTS ONLY: the client module is replaced by a labelled fake.
// No X credentials are loaded and no X HTTP requests can be made by these handlers.
import assert from 'node:assert/strict';
import { test, mock } from 'node:test';
import { readFile } from 'node:fs/promises';

const calls = [];
let fakeResponse;
let fakeError;
let clientSelections = 0;
const fakeClient = { v2: {
  me: async (...args) => { calls.push(['me', ...args]); if (fakeError) throw fakeError; return fakeResponse; },
  singleTweet: async (...args) => { calls.push(['singleTweet', ...args]); if (fakeError) throw fakeError; return fakeResponse; },
  tweet: async (...args) => { calls.push(['tweet', ...args]); if (fakeError) throw fakeError; return fakeResponse; },
} };
mock.module('../build/client.js', { namedExports: {
  getClient: async () => { clientSelections++; return fakeClient; },
  getAuthenticatedUserId: async () => { throw new Error('Cached identity must not be used for preflight'); },
  getOAuth2Token: async () => { throw new Error('Media authentication is outside these offline tests'); },
  hasOAuth2Config: () => false,
} });
const { TOOL_DEFINITIONS } = await import('../build/tools/definitions.js');
const handlers = await import('../build/tools/handlers.js');
const decode = result => JSON.parse(result.content[0].text);
const reset = () => { calls.length = 0; fakeError = undefined; fakeResponse = undefined; clientSelections = 0; };

test('get_me is discoverable and wired to a fresh authenticated identity handler', async () => {
  const tool = TOOL_DEFINITIONS.find(tool => tool.name === 'get_me');
  assert.ok(tool, 'get_me must be listed');
  assert.equal(tool.inputSchema.type, 'object');
  assert.deepEqual(tool.inputSchema.properties, {});
  const source = await readFile(new URL('../src/index.ts', import.meta.url), 'utf8');
  assert.match(source, /get_me:\s*handleGetMe/);
  reset();
  fakeResponse = { data: { id: '123', name: 'SYNTHETIC User', username: 'synthetic_user' } };
  const me = decode(await handlers.handleGetMe({}));
  const { publisher_contract, ...identity } = me;
  assert.equal(publisher_contract.version, 1);
  assert.deepEqual(identity, fakeResponse.data);
  assert.deepEqual(calls, [['me', { 'user.fields': ['id', 'name', 'username'] }]]);
  fakeResponse = { data: { id: '456', name: 'SYNTHETIC Different User', username: 'synthetic_other' } };
  assert.equal(decode(await handlers.handleGetMe({})).id, '456');
  assert.equal(calls.length, 2, 'preflight must not use the cached user ID');
});

test('get_me propagates an authentication failure without fabricating an identity', async () => {
  assert.equal(typeof handlers.handleGetMe, 'function');
  reset();
  fakeError = new Error('SYNTHETIC authentication failed');
  await assert.rejects(handlers.handleGetMe({}), error => error === fakeError);
  assert.equal(calls.length, 1);
});

test('get_tweet requests long-text and URL entities and preserves the existing inner-data result shape', async () => {
  reset();
  const syntheticFullText = 'SYNTHETIC long post '.repeat(30) + 'https://t.co/fake';
  const syntheticTweet = {
    id: '123', author_id: '456', text: 'https://t.co/preview',
    entities: { urls: [{ start: 0, end: Array.from('https://t.co/preview').length, url: 'https://t.co/preview', expanded_url: 'https://example.invalid/preview' }] },
    note_tweet: { text: syntheticFullText, entities: { urls: [{ start: Array.from(syntheticFullText.slice(0, syntheticFullText.indexOf('https://t.co/fake'))).length, end: Array.from(syntheticFullText).length, url: 'https://t.co/fake', expanded_url: 'https://example.invalid/full', unwound_url: 'https://example.invalid/full' }] } },
  };
  fakeResponse = { data: syntheticTweet, includes: { users: [{ id: '456', username: 'synthetic_user' }] } };
  const result = decode(await handlers.handleGetTweet({ tweet_id: '123' }));
  assert.deepEqual(result, syntheticTweet);
  assert.equal(result.note_tweet.text, syntheticFullText);
  assert.equal(result.note_tweet.entities.urls[0].expanded_url, 'https://example.invalid/full');
  assert.equal(result.includes, undefined, 'existing singleTweet().data output contract stays unchanged');
  assert.equal(calls[0][0], 'singleTweet');
  assert.equal(calls[0][1], '123');
  const options = calls[0][2];
  for (const field of ['author_id', 'created_at', 'public_metrics', 'referenced_tweets', 'conversation_id', 'entities', 'note_tweet']) {
    assert.ok(options['tweet.fields'].includes(field), `must request ${field}`);
  }
  assert.deepEqual(options.expansions, ['author_id', 'referenced_tweets.id']);
  assert.deepEqual(options['user.fields'], ['name', 'username']);
});

test('get_tweet preserves ordinary posts without inventing long text', async () => {
  reset();
  fakeResponse = { data: { id: '123', text: 'SYNTHETIC ordinary post', entities: { urls: [] } } };
  assert.deepEqual(decode(await handlers.handleGetTweet({ tweet_id: '123' })), fakeResponse.data);
  assert.equal(calls.length, 1);
});

test('get_tweet rejects malformed IDs before invoking the fake API', async () => {
  reset();
  for (const tweet_id of ['', '123x', 'https://x.com/user/status/123', '1'.repeat(21)]) {
    await assert.rejects(handlers.handleGetTweet({ tweet_id }), /Invalid tweet ID|expected non-empty string/);
  }
  assert.equal(calls.length, 0);
});

test('offline MCP protocol discovers upgraded tools and executes read-only identity and full read-back', async () => {
  const { Client } = await import('@modelcontextprotocol/sdk/client/index.js');
  const { StdioClientTransport } = await import('@modelcontextprotocol/sdk/client/stdio.js');
  const transport = new StdioClientTransport({
    command: process.execPath,
    args: ['--experimental-test-module-mocks', new URL('./offline-server.mjs', import.meta.url).pathname],
    env: { PATH: process.env.PATH },
    stderr: 'pipe',
  });
  const client = new Client({ name: 'synthetic-offline-upgrade-test', version: '1' }, { capabilities: {} });
  try {
    await client.connect(transport);
    const listed = await client.listTools();
    assert.ok(listed.tools.find(tool => tool.name === 'get_me'));
    assert.equal(listed.tools.find(tool => tool.name === 'create_tweet').inputSchema.properties.text.maxLength, 25000);
    const me = decode(await client.callTool({ name: 'get_me', arguments: {} }));
    assert.equal(me.id, '123');
    assert.equal(me.username, 'synthetic_fixture');
    assert.equal(me.publisher_contract.version, 1);
    const tweet = decode(await client.callTool({ name: 'get_tweet', arguments: { tweet_id: '123' } }));
    assert.equal(tweet.note_tweet.text, '😀SYNTHETIC long text '.repeat(20) + '\n\nhttps://t.co/fake');
    assert.equal(tweet.note_tweet.entities.urls[0].expanded_url, 'https://example.invalid/full');
  } finally {
    await client.close();
  }
});

test('create_tweet preserves user deployed 25000 schema cap without inferring API entitlement', () => {
  const schema = TOOL_DEFINITIONS.find(tool => tool.name === 'create_tweet').inputSchema;
  assert.equal(schema.properties.text.type, 'string');
  assert.ok(schema.required.includes('text'));
  assert.equal(schema.properties.text.maxLength, 25000);
});

test('create_tweet forwards exact synthetic longer text once; rejects invalid text', async () => {
  reset();
  const syntheticText = '🧪'.repeat(293); // deliberately synthetic, NOT CAL002r2
  fakeResponse = { data: { id: '100', text: syntheticText } };
  assert.deepEqual(decode(await handlers.handleCreateTweet({ text: syntheticText })), fakeResponse.data);
  assert.deepEqual(calls, [['tweet', syntheticText]]);
  for (const text of ['', null, 42, undefined]) {
    await assert.rejects(handlers.handleCreateTweet({ text }), /expected non-empty string/);
  }
  assert.equal(calls.length, 1);
});

test('create_tweet preserves upstream failure without automatic write retry', async () => {
  reset();
  fakeError = new Error('SYNTHETIC upstream entitlement rejection');
  await assert.rejects(handlers.handleCreateTweet({ text: 'synthetic text' }), error => error === fakeError);
  assert.equal(calls.length, 1);
});


test('guarded create captures one client, freshly checks exact author, then writes once', async () => {
  reset();
  const schema = TOOL_DEFINITIONS.find(tool => tool.name === 'create_tweet').inputSchema;
  assert.equal(schema.properties.expected_author_id.type, 'string');
  fakeResponse = { data: { id: '42', text: 'SYNTHETIC exact' } };
  const result = decode(await handlers.handleCreateTweet({ text: 'SYNTHETIC exact', expected_author_id: '42' }));
  assert.equal(result.id, '42');
  assert.equal(clientSelections, 1);
  assert.deepEqual(calls, [['me', { 'user.fields': ['id', 'name', 'username'] }], ['tweet', 'SYNTHETIC exact']]);
});

test('guarded create rejects changed identity or invalid unchanged ID without writes', async () => {
  reset();
  fakeResponse = { data: { id: '99' } };
  await assert.rejects(handlers.handleCreateTweet({ text: 'synthetic', expected_author_id: '42' }), /author.*mismatch/i);
  assert.deepEqual(calls.map(call => call[0]), ['me']);
  reset();
  for (const expected_author_id of [' 42', '42x', 42, null, '']) {
    await assert.rejects(handlers.handleCreateTweet({ text: 'synthetic', expected_author_id }), /author|ID|parameter/i);
  }
  assert.equal(calls.length, 0);
});

test('guarded create fails closed when fresh me fails', async () => {
  reset();fakeError = new Error('SYNTHETIC me failure');
  await assert.rejects(handlers.handleCreateTweet({ text: 'synthetic', expected_author_id: '42' }), error => error === fakeError);
  assert.deepEqual(calls.map(call => call[0]), ['me']);
});


test('get_me declares versioned publisher field-request and author-guard policy without entitlements', async () => {
  reset(); fakeResponse = { data: { id: '42', username: 'synthetic' } };
  const me = decode(await handlers.handleGetMe({}));
  assert.deepEqual(me.publisher_contract, {
    version: 1, length_policy: 'x-api-enforced',
    requested_readback_fields: ['entities', 'note_tweet'],
    expected_author_parameter: 'expected_author_id',
  });
  assert.equal(me.id, '42');
});
