import { ErrorCode, McpError } from '@modelcontextprotocol/sdk/types.js';
import type { TListV2Field, TweetV2, UserV2 } from 'twitter-api-v2';
import { getAuthenticatedUserId, getClient } from '../client.js';
import { withRateLimit } from '../rate-limit.js';
import { TIMELINE_MIN_LIMIT } from './user-data-definitions.js';

type HandlerResult = {
  readonly content: ReadonlyArray<{ readonly type: 'text'; readonly text: string }>;
};

type Client = Awaited<ReturnType<typeof getClient>>;
type DataResult = { readonly data: unknown };
type UserScopedLoader = (
  client: Client,
  userId: string,
  page: PageParams
) => Promise<DataResult>;
type PageParams = {
  readonly max_results: number;
  readonly pagination_token?: string;
};

const USERNAME_RE = /^[A-Za-z0-9_]{1,15}$/;
const DEFAULT_TWEET_FIELDS: Array<keyof TweetV2> = [
  'author_id',
  'created_at',
  'public_metrics',
];
const DEFAULT_USER_FIELDS: Array<keyof UserV2> = [
  'description',
  'public_metrics',
  'created_at',
  'location',
  'url',
  'verified',
];
const DEFAULT_LIST_FIELDS: TListV2Field[] = [
  'created_at',
  'description',
  'follower_count',
  'member_count',
];

function jsonResult(data: unknown): HandlerResult {
  return {
    content: [{ type: 'text', text: JSON.stringify(data, null, 2) }],
  };
}

function requireUsername(args: Record<string, unknown>): string {
  const value = args.username;
  if (typeof value !== 'string' || !USERNAME_RE.test(value)) {
    throw new McpError(
      ErrorCode.InvalidRequest,
      "Missing or invalid required parameter: 'username'"
    );
  }
  return value;
}

function optionalNumber(args: Record<string, unknown>, fallback: number): number {
  const value = args.limit;
  if (value === undefined || value === null) return fallback;
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new McpError(
      ErrorCode.InvalidRequest,
      "Invalid parameter: 'limit' (expected number)"
    );
  }
  return value;
}

function normalizedLimit(
  args: Record<string, unknown>,
  fallback: number,
  minLimit = 1
): number {
  const limit = optionalNumber(args, fallback);
  return Math.max(minLimit, Math.min(limit, 100));
}

function optionalPaginationToken(args: Record<string, unknown>): string | undefined {
  const value = args.pagination_token;
  if (value === undefined || value === null) return undefined;
  if (typeof value !== 'string' || value.length === 0) {
    throw new McpError(
      ErrorCode.InvalidRequest,
      "Invalid parameter: 'pagination_token' (expected non-empty string)"
    );
  }
  return value;
}

function pageParams(
  args: Record<string, unknown>,
  fallback: number,
  minLimit = 1
): PageParams {
  const paginationToken = optionalPaginationToken(args);
  return {
    max_results: normalizedLimit(args, fallback, minLimit),
    ...(paginationToken ? { pagination_token: paginationToken } : {}),
  };
}

async function resolveUserIdByUsername(client: Client, username: string): Promise<string> {
  const user = await withRateLimit('get_user', () =>
    client.v2.userByUsername(username)
  );

  if (!user.data) {
    throw new McpError(ErrorCode.InvalidRequest, `User @${username} not found`);
  }

  return user.data.id;
}

async function loadUserScopedResult(
  args: Record<string, unknown>,
  rateLimitKey: string,
  defaultLimit: number,
  loader: UserScopedLoader,
  minLimit = 1
): Promise<HandlerResult> {
  const username = requireUsername(args);
  const page = pageParams(args, defaultLimit, minLimit);
  const client = await getClient();
  const userId = await resolveUserIdByUsername(client, username);
  const result = await withRateLimit(rateLimitKey, () => loader(client, userId, page));

  return jsonResult(result.data);
}

async function loadAuthenticatedResult(
  args: Record<string, unknown>,
  rateLimitKey: string,
  loader: UserScopedLoader
): Promise<HandlerResult> {
  const page = pageParams(args, 20);
  const client = await getClient();
  const userId = await getAuthenticatedUserId();
  const result = await withRateLimit(rateLimitKey, () => loader(client, userId, page));

  return jsonResult(result.data);
}

export async function handleGetUser(
  args: Record<string, unknown>
): Promise<HandlerResult> {
  const username = requireUsername(args);
  const client = await getClient();

  const user = await withRateLimit('get_user', () =>
    client.v2.userByUsername(username, {
      'user.fields': DEFAULT_USER_FIELDS,
    })
  );

  return jsonResult(user.data);
}

export async function handleGetUserTweets(
  args: Record<string, unknown>
): Promise<HandlerResult> {
  return loadUserScopedResult(
    args,
    'user_tweets',
    10,
    (client, userId, page) =>
      client.v2.userTimeline(userId, {
        ...page,
        'tweet.fields': ['created_at', 'public_metrics', 'referenced_tweets'],
      }),
    TIMELINE_MIN_LIMIT
  );
}

export async function handleGetUserMentions(
  args: Record<string, unknown>
): Promise<HandlerResult> {
  return loadUserScopedResult(
    args,
    'user_mentions',
    10,
    (client, userId, page) =>
      client.v2.userMentionTimeline(userId, {
        ...page,
        'tweet.fields': DEFAULT_TWEET_FIELDS,
        expansions: ['author_id'],
        'user.fields': ['name', 'username'],
      }),
    TIMELINE_MIN_LIMIT
  );
}

export async function handleGetUserLikedTweets(
  args: Record<string, unknown>
): Promise<HandlerResult> {
  return loadUserScopedResult(
    args,
    'user_liked_tweets',
    10,
    (client, userId, page) =>
      client.v2.userLikedTweets(userId, {
        ...page,
        'tweet.fields': DEFAULT_TWEET_FIELDS,
        expansions: ['author_id'],
        'user.fields': ['name', 'username'],
      }),
    TIMELINE_MIN_LIMIT
  );
}

export async function handleGetUserFollowers(
  args: Record<string, unknown>
): Promise<HandlerResult> {
  return loadUserScopedResult(args, 'user_followers', 20, (client, userId, page) =>
    client.v2.followers(userId, {
      ...page,
      'user.fields': DEFAULT_USER_FIELDS,
    })
  );
}

export async function handleGetUserFollowing(
  args: Record<string, unknown>
): Promise<HandlerResult> {
  return loadUserScopedResult(args, 'user_following', 20, (client, userId, page) =>
    client.v2.following(userId, {
      ...page,
      'user.fields': DEFAULT_USER_FIELDS,
    })
  );
}

export async function handleGetBlockingUsers(
  args: Record<string, unknown>
): Promise<HandlerResult> {
  return loadAuthenticatedResult(args, 'blocking_users', (client, userId, page) =>
    client.v2.userBlockingUsers(userId, {
      ...page,
      'user.fields': DEFAULT_USER_FIELDS,
    })
  );
}

export async function handleGetMutingUsers(
  args: Record<string, unknown>
): Promise<HandlerResult> {
  return loadAuthenticatedResult(args, 'muting_users', (client, userId, page) =>
    client.v2.userMutingUsers(userId, {
      ...page,
      'user.fields': DEFAULT_USER_FIELDS,
    })
  );
}

export async function handleGetOwnedLists(
  args: Record<string, unknown>
): Promise<HandlerResult> {
  return loadUserScopedResult(args, 'owned_lists', 20, (client, userId, page) =>
    client.v2.listsOwned(userId, {
      ...page,
      'list.fields': DEFAULT_LIST_FIELDS,
    })
  );
}

export async function handleGetFollowedLists(
  args: Record<string, unknown>
): Promise<HandlerResult> {
  return loadUserScopedResult(args, 'followed_lists', 20, (client, userId, page) =>
    client.v2.listFollowed(userId, {
      ...page,
      'list.fields': DEFAULT_LIST_FIELDS,
    })
  );
}

export async function handleGetListMemberships(
  args: Record<string, unknown>
): Promise<HandlerResult> {
  return loadUserScopedResult(args, 'list_memberships', 20, (client, userId, page) =>
    client.v2.listMemberships(userId, {
      ...page,
      'list.fields': DEFAULT_LIST_FIELDS,
    })
  );
}
