// Generate actual MCP discovery and handler responses; all X responses are synthetic.
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
const transport = new StdioClientTransport({ command: process.execPath,
  args: ['--experimental-test-module-mocks', new URL('./offline-server.mjs', import.meta.url).pathname],
  env: { PATH: process.env.PATH }, stderr: 'pipe' });
const client = new Client({ name: 'SYNTHETIC-readonly-export', version: '1' }, { capabilities: {} });
const decode = response => JSON.parse(response.content[0].text);
try {
  await client.connect(transport);
  const tools = (await client.listTools()).tools;
  const identity = tools.some(t => t.name === 'get_me') ? decode(await client.callTool({ name:'get_me', arguments:{} })) : null;
  const post = decode(await client.callTool({ name:'get_tweet', arguments:{tweet_id:'2100957766441734424'} }));
  console.log(JSON.stringify({ scope:'SYNTHETIC X fixtures through actual MCP server discovery/dispatch. NO WRITES.', tools, identity, post }));
} finally { await client.close(); }
