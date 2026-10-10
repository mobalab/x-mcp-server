# X MCP Server

A Model Context Protocol (MCP) server for X (Twitter) integration. Provides 26 tools for reading timelines, posting, searching, engagement (likes, retweets, bookmarks), user lookup, follower export, mentions, likes, articles, and lists. Designed for use with Claude desktop and other MCP-compatible clients.

This fork is maintained at [mobalab/x-mcp-server](https://github.com/mobalab/x-mcp-server) and published as `@mobalab/x-mcp-server`. The original project is [DataWhisker/x-mcp-server](https://github.com/DataWhisker/x-mcp-server).

<a href="https://glama.ai/mcp/servers/5nx3qqiunw"><img width="380" height="200" src="https://glama.ai/mcp/servers/5nx3qqiunw/badge" alt="X Server MCP server" /></a>

## Features

- **Timeline & Search** - Home timeline, search recent posts (7-day window)
- **Post Management** - Create, reply, quote, delete posts with optional media
- **Engagement** - Like/unlike, retweet/undo, bookmark/unbookmark
- **User Data** - Mentions, liked posts, followers, following, blocks, mutes, owned lists, followed lists, and list memberships
- **User Lookup** - Get user profiles and their recent posts
- **Media Upload** - Images (PNG, JPEG, GIF, WEBP) and videos (MP4, MOV, AVI, WEBM, M4V) via v2 upload API
- **Dual Auth** - OAuth 1.0a for post operations, OAuth 2.0 for media upload (v1.1 upload was sunset June 2025)
- **Rate Limiting** - Automatic per-endpoint rate limit tracking with clear error messages
- **TypeScript** - Full type safety, modular file structure

## Prerequisites

- Node.js >= 20.0.0 (use a currently supported LTS release)
- X (Twitter) Developer Account
- Claude desktop app (or any MCP-compatible client)

## X API Access & Pricing

| Tier | Cost | Post Reads | Post Writes | Notes |
|------|------|-----------|-------------|-------|
| **Free** | $0 | ~100/month | ~500/month | No likes/follows; media upload requires OAuth 2.0 |
| **Basic** | $200/month | 10,000/month | 3,000/month | Search, limited read access |
| **Pro** | $5,000/month | 1,000,000/month | 300,000/month | Full search, filtered stream |
| **Pay-Per-Use** | Credit-based | ~$0.005/read | Varies | Launched Feb 2026, 2M reads cap |

> Like and Follow endpoints were removed from the Free tier in August 2025.
> Follows/Blocks endpoints are Enterprise-only as of 2025.

## Installation

### Run with npx

Once this fork has been published to npm, run:

```bash
npx -y @mobalab/x-mcp-server
```

`npx` downloads the package and runs its command without a global install.
`-y` accepts the installation prompt, which is needed when an MCP client launches
the server. Configure the X credentials described below in your MCP client or
shell environment. The server communicates over standard input/output; it does
not open a browser or show an interactive prompt.

For a specific release, use `npx -y @mobalab/x-mcp-server@2.0.0`.

### Build from source

```bash
git clone https://github.com/mobalab/x-mcp-server.git
cd x-mcp-server
npm ci
npm start
```

`npm ci` installs the locked dependencies and automatically builds the server.

## Authentication

The server supports two authentication methods. You need **at least one** configured.

### OAuth 1.0a (Required for basic operations)

Works for all post/engagement/search/user operations.

| Environment Variable | Description |
|---------------------|-------------|
| `TWITTER_API_KEY` | Consumer Key (API Key) |
| `TWITTER_API_SECRET` | Consumer Secret (API Key Secret) |
| `TWITTER_ACCESS_TOKEN` | User Access Token |
| `TWITTER_ACCESS_SECRET` | User Access Token Secret |

**Setup:** In the [X Developer Portal](https://developer.x.com/en/portal/dashboard):
1. Create a project and app
2. Enable OAuth 1.0a under "User authentication settings"
3. Set permissions to "Read and Write"
4. Generate Consumer Keys and Access Tokens

### OAuth 2.0 (Required for media upload)

The v1.1 media upload endpoint was sunset in June 2025. Media upload now requires OAuth 2.0 via the v2 upload API.

**Option A - Direct access token:**

| Variable | Description |
|----------|-------------|
| `TWITTER_OAUTH2_ACCESS_TOKEN` | OAuth 2.0 user access token (expires in 2 hours) |

**Option B - Auto-refresh (recommended for long-running servers):**

| Variable | Description |
|----------|-------------|
| `TWITTER_CLIENT_ID` | OAuth 2.0 Client ID |
| `TWITTER_CLIENT_SECRET` | OAuth 2.0 Client Secret (optional for public clients) |
| `TWITTER_OAUTH2_REFRESH_TOKEN` | OAuth 2.0 Refresh Token |

Tokens are auto-refreshed and persisted to `~/.x-mcp-tokens.json`.

**Setup:** In the [X Developer Portal](https://developer.x.com/en/portal/dashboard):
1. In your app settings, enable OAuth 2.0
2. Set type to "Confidential client" or "Public client"
3. Add a callback URL
4. Request scopes: `tweet.read`, `tweet.write`, `users.read`, `media.write`, `offline.access`, `like.read`, `like.write`, `bookmark.read`, `bookmark.write`, `follows.read`, `block.read`, `mute.read`, `list.read`

## Claude Desktop Configuration

Add to `~/Library/Application Support/Claude/claude_desktop_config.json` on
macOS or `%APPDATA%/Claude/claude_desktop_config.json` on Windows:

```json
{
  "mcpServers": {
    "x": {
      "command": "npx",
      "args": ["-y", "@mobalab/x-mcp-server@2.0.0"],
      "env": {
        "TWITTER_API_KEY": "your-api-key",
        "TWITTER_API_SECRET": "your-api-secret",
        "TWITTER_ACCESS_TOKEN": "your-access-token",
        "TWITTER_ACCESS_SECRET": "your-access-secret",
        "TWITTER_OAUTH2_ACCESS_TOKEN": "your-oauth2-token"
      }
    }
  }
}
```

This configuration requires the package to be published first. Restart Claude
Desktop after saving it. For a local source build, use `"command": "node"` and
`"args": ["/absolute/path/to/x-mcp-server/build/index.js"]` instead.

### Optional Xquik Search Backend

`search_tweets` can use Xquik while the rest of the server keeps the default
X API client. Set:

| Variable | Description |
|----------|-------------|
| `X_MCP_SEARCH_BACKEND=xquik` | Routes only `search_tweets` to Xquik |
| `XQUIK_API_KEY` | Xquik API key |
| `XQUIK_API_BASE_URL` | Optional base URL, defaults to `https://xquik.com/api/v1` |

## Available Tools (26)

### Timeline & Search

| Tool | Description | Key Parameters |
|------|-------------|---------------|
| `get_home_timeline` | Get recent posts from home timeline | `limit` (1-100) |
| `search_tweets` | Search recent posts (7-day window) | `query`, `limit` |

### Post Management

| Tool | Description | Key Parameters |
|------|-------------|---------------|
| `get_tweet` | Look up a post by ID | `tweet_id` |
| `create_tweet` | Create a post with optional media | `text`, `image_path?`, `video_path?` |
| `reply_to_tweet` | Reply to a post with optional media | `tweet_id`, `text`, `image_path?`, `video_path?` |
| `quote_tweet` | Quote a post with commentary | `tweet_id`, `text` |
| `delete_tweet` | Delete your post | `tweet_id` |

### Engagement

| Tool | Description | Key Parameters |
|------|-------------|---------------|
| `like_tweet` | Like a post (Basic+ tier) | `tweet_id` |
| `unlike_tweet` | Remove a like | `tweet_id` |
| `retweet` | Repost to your timeline | `tweet_id` |
| `undo_retweet` | Remove a repost | `tweet_id` |
| `bookmark_tweet` | Bookmark for later | `tweet_id` |
| `unbookmark_tweet` | Remove a bookmark | `tweet_id` |
| `get_bookmarks` | Get your bookmarks | `limit` (1-100) |

### Users

| Tool | Description | Key Parameters |
|------|-------------|---------------|
| `get_user` | Look up user by username | `username` |
| `get_user_tweets` | Get a user's recent posts | `username`, `limit` |
| `get_user_mentions` | Get posts mentioning a user | `username`, `limit` |
| `get_user_liked_tweets` | Get a user's liked posts | `username`, `limit` |
| `get_user_followers` | Get a user's followers | `username`, `limit` |
| `get_user_following` | Get accounts a user follows | `username`, `limit` |
| `get_blocking_users` | Get users blocked by the authenticated account | `limit` |
| `get_muting_users` | Get users muted by the authenticated account | `limit` |
| `get_owned_lists` | Get lists owned by a user | `username`, `limit` |
| `get_followed_lists` | Get lists followed by a user | `username`, `limit` |
| `get_list_memberships` | Get lists a user belongs to | `username`, `limit` |

### Articles

| Tool | Description | Key Parameters |
|------|-------------|---------------|
| `get_article` | Fetch the full body content of an X Article post | `tweet_id` |

## Media Support

- **Images:** PNG, JPEG, GIF, WEBP (max 5MB)
- **Videos:** MP4, MOV, AVI, WEBM, M4V (max 512MB, streamed chunked upload)
- Cannot attach both image and video to the same post
- Requires OAuth 2.0 credentials (v1.1 upload sunset June 2025)
- **Path restriction:** Only files within your home directory or system temp directory can be uploaded (prevents path traversal)

## Security

- **Input validation:** Tweet IDs must be numeric (1-20 digits), usernames must match `[A-Za-z0-9_]{1,15}`
- **Media path restriction:** Upload paths are validated against an allow-list (home directory, temp directory)
- **Token storage:** OAuth 2.0 tokens persisted to `~/.x-mcp-tokens.json` with `0o600` permissions (Unix). On Windows, file permissions are not enforced by the OS - protect the file via NTFS ACLs or use environment variables instead.
- **Error sanitization:** X API error details are logged server-side only; sanitized messages are returned to MCP clients
- **Refresh mutex:** Concurrent token refresh attempts are deduplicated to prevent race conditions

## Development

```bash
npm ci           # Install locked dependencies and build
npm run build    # Compile TypeScript
npm run dev      # Watch mode
npm start        # Run the server
```

## Publishing this fork to npm

The npm **package** is named `@mobalab/x-mcp-server`; the executable **command**
inside it is named `x-mcp-server`. The `@mobalab` scope belongs to your npm
organization. Your npm user must have permission to publish packages in that
organization.

For the first release, run these commands from this repository:

```bash
npm ci
npm pack --dry-run
npm login
npm whoami
npm publish --access public
```

`npm pack --dry-run` previews the files that will be uploaded. The package
includes compiled JavaScript, `package.json`, the README, and the MIT license.
The `prepare` script builds automatically before packing or publishing, so users
running the npm package do not need TypeScript or a local build.

`npm login` signs your CLI into your npmjs.com account. Follow npm's login and
verification prompts. Direct publishing requires account two-factor
authentication (2FA), or a granular access token with bypass 2FA enabled; see
[npm's publishing guide](https://docs.npmjs.com/creating-and-publishing-scoped-public-packages/).
`--access public` makes this scoped package publicly available.

After publishing, you can run it from any directory:

```bash
npx -y @mobalab/x-mcp-server@2.0.0
```

Each published version is unique and cannot be overwritten. For subsequent
bug-fix releases, start with a clean, committed working tree and run:

```bash
npm version patch
npm publish --access public
```

`npm version patch` increments the version (for example, `2.0.0` to `2.0.1`),
updates the lockfile, and creates a Git commit and tag. Update any MCP client
configuration that pins a version when you want to use the new release.

## Project Structure

```
src/
  index.ts              # MCP server entry point & handler dispatch
  client.ts             # Twitter client setup (OAuth 1.0a + OAuth 2.0)
  media.ts              # v2 media upload (simple + chunked)
  rate-limit.ts         # Per-endpoint rate limiting
  tools/
    definitions.ts      # All 16 tool schemas
    handlers.ts         # Tool handler implementations
```

## Pairing with GetXAPI for Cheaper Read Operations (Optional)

For users who need a cheaper or higher-rate-limit option for read-only Twitter (X) operations such as tweet search, profile lookup, and follower lists, this project can be paired with [GetXAPI](https://getxapi.com), a budget Twitter / X data API priced at $0.05 per 1K tweets versus the official X API basic tier at $200 / month.

Two integration patterns:

1. **Run side-by-side in your AI client.** Keep this project for its primary workflow and add the [official GetXAPI MCP server](https://github.com/getxapi/getxapi-mcp) for read-heavy tasks. Each tool name routes to the backend best suited for that operation.

2. **Add a backend toggle.** For a code-level reference of an optional alternative backend behind a single env variable, see the [PR pattern merged into a sibling project](https://github.com/GenAIwithMS/twitter-mcp/pull/3).

GetXAPI quick start:

- Signup with $0.50 free credit (no card required): https://getxapi.com/signup
- Official GetXAPI MCP server: https://github.com/getxapi/getxapi-mcp
- npm: `@getxapi/mcp`
- Pay-per-call pricing: $0.001 / call, $0.05 / 1K tweets

This pairing is fully optional. No behavior change for existing users.

## License

MIT

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request
