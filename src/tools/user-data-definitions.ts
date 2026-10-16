import { Tool } from '@modelcontextprotocol/sdk/types.js';

// X API rejects max_results < 5 for posts, mentions and liked posts.
export const TIMELINE_MIN_LIMIT = 5;

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
  minLimit = 1
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
          description: `${limitDescription} (${minLimit}-100, default ${defaultLimit})`,
          minimum: minLimit,
          maximum: 100,
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
  limitDescription: string
): Tool {
  return {
    name,
    description,
    inputSchema: {
      type: 'object',
      properties: {
        limit: {
          type: 'number',
          description: `${limitDescription} (1-100, default 20)`,
          minimum: 1,
          maximum: 100,
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
    TIMELINE_MIN_LIMIT
  ),
  usernameLimitTool(
    'get_user_liked_tweets',
    "Get a user's recently liked posts by username",
    'Number of liked posts to retrieve',
    10,
    TIMELINE_MIN_LIMIT
  ),
  usernameLimitTool(
    'get_user_followers',
    "Get a user's followers by username",
    'Number of followers to retrieve',
    20
  ),
  usernameLimitTool(
    'get_user_following',
    'Get accounts a user follows by username',
    'Number of followed accounts to retrieve',
    20
  ),
  limitOnlyTool(
    'get_blocking_users',
    'Get users blocked by the authenticated account',
    'Number of blocked users to retrieve'
  ),
  limitOnlyTool(
    'get_muting_users',
    'Get users muted by the authenticated account',
    'Number of muted users to retrieve'
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
