// OFFLINE MCP fixture: entire credentials module replaced; all writes prohibited.
import { mock } from 'node:test';
const fullText = '😀SYNTHETIC long text '.repeat(20) + '\n\nhttps://t.co/fake';
const shortText = 'SYNTHETIC preview https://t.co/preview';
const entity = (text, url, expanded_url) => ({
  start: Array.from(text.slice(0, text.indexOf(url))).length,
  end: Array.from(text.slice(0, text.indexOf(url) + url.length)).length,
  url, expanded_url,
});
mock.module('../build/client.js', { namedExports: {
  getClient: async () => ({ v2: {
    me: async options => {
      if (JSON.stringify(options) !== JSON.stringify({ 'user.fields': ['id', 'name', 'username'] })) throw new Error('Unexpected identity fields');
      return { data: { id: '123', name: 'SYNTHETIC Fixture', username: 'synthetic_fixture' } };
    },
    singleTweet: async (id, options) => {
      const data = { id, author_id: '123', text: shortText };
      if (options['tweet.fields'].includes('entities')) data.entities = { urls: [entity(shortText, 'https://t.co/preview', 'https://example.invalid/preview')] };
      if (options['tweet.fields'].includes('note_tweet')) data.note_tweet = { text: fullText, entities: { urls: [entity(fullText, 'https://t.co/fake', 'https://example.invalid/full')] } };
      return { data };
    },
    tweet: async () => { throw new Error('ALL WRITES DISABLED in offline protocol fixture'); },
  } }),
  getAuthenticatedUserId: async () => { throw new Error('Cached identity prohibited'); },
  getOAuth2Token: async () => { throw new Error('Media authentication prohibited'); },
  hasOAuth2Config: () => false,
} });
await import('../build/index.js');