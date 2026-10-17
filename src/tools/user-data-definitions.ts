import { Tool } from '@modelcontextprotocol/sdk/types.js';

export type LimitRange = { readonly min: number; readonly max: number };

export const DEFAULT_LIMIT_RANGE: LimitRange = { min: 1, max: 100 };
// X API rejects max_results < 5 for posts, mentions and liked posts.
export const TIMELINE_LIMIT_RANGE: LimitRange = { min: 5, max: 100 };
// X API allows up to 1000 for followers, following, blocking and muting.
export const USER_LIST_LIMIT_RANGE: LimitRange = { min: 1, max: 1000 };

export const PAGINATION_TOKEN_PROPERTY = {
  type: 'string',
  description:
    "Token from the previous response's meta.next_token, to fetch the next page. Omit for the first page.",
} as const;

function usernameLimitTool(
  name: string,
  description: string,
  limitDescription: string,
  defaultLimit: number,
  range: LimitRange = DEFAULT_LIMIT_RANGE
): Tool {
  return {
    name,
    description,
    inputSchema: {
      type: 'object',
      properties: {
        username: {
          type: 'string',
          description: 'The username (without @)',
        },
        limit: {
          type: 'number',
          description: `${limitDescription} (${range.min}-${range.max}, default ${defaultLimit})`,
          minimum: range.min,
          maximum: range.max,
        },
        pagination_token: PAGINATION_TOKEN_PROPERTY,
      },
      required: ['username'],
    },
  };
}

function limitOnlyTool(
  name: string,
  description: string,
  limitDescription: string,
  range: LimitRange = DEFAULT_LIMIT_RANGE
): Tool {
  return {
    name,
    description,
    inputSchema: {
      type: 'object',
      properties: {
        limit: {
          type: 'number',
          description: `${limitDescription} (${range.min}-${range.max}, default 20)`,
          minimum: range.min,
          maximum: range.max,
        },
        pagination_token: PAGINATION_TOKEN_PROPERTY,
      },
    },
  };
}

export const USER_DATA_TOOL_DEFINITIONS: Tool[] = [
  usernameLimitTool(
    'get_user_mentions',
    'Get recent posts mentioning a user by username',
    'Number of mentions to retrieve',
    10,
    TIMELINE_LIMIT_RANGE
  ),
  usernameLimitTool(
    'get_user_liked_tweets',
    "Get a user's recently liked posts by username",
    'Number of liked posts to retrieve',
    10,
    TIMELINE_LIMIT_RANGE
  ),
  usernameLimitTool(
    'get_user_followers',
    "Get a user's followers by username",
    'Number of followers to retrieve',
    20,
    USER_LIST_LIMIT_RANGE
  ),
  usernameLimitTool(
    'get_user_following',
    'Get accounts a user follows by username',
    'Number of followed accounts to retrieve',
    20,
    USER_LIST_LIMIT_RANGE
  ),
  limitOnlyTool(
    'get_blocking_users',
    'Get users blocked by the authenticated account',
    'Number of blocked users to retrieve',
    USER_LIST_LIMIT_RANGE
  ),
  limitOnlyTool(
    'get_muting_users',
    'Get users muted by the authenticated account',
    'Number of muted users to retrieve',
    USER_LIST_LIMIT_RANGE
  ),
  usernameLimitTool(
    'get_owned_lists',
    'Get lists owned by a user by username',
    'Number of lists to retrieve',
    20
  ),
  usernameLimitTool(
    'get_followed_lists',
    'Get lists followed by a user by username',
    'Number of lists to retrieve',
    20
  ),
  usernameLimitTool(
    'get_list_memberships',
    'Get lists a user belongs to by username',
    'Number of lists to retrieve',
    20
  ),
];
