# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [2.1.0] - 2026-10-18

### Added

- Pagination support (`pagination_token`) for list tools.

### Fixed

- Invalid minimum `limit` for posts, mentions and liked-posts.
- Incorrect pagination in following and followers.
- Maximum `limit` values for some tools.

## [2.0.3] - 2026-10-13

### Added

- `get_me` tool.
- Optional `expected_author_id` parameter for `create_tweet`.
- Tests.

### Changed

- `get_tweet` now returns entities and `note_tweet`.

## [2.0.2] - 2026-10-12

### Changed

- Raised the maximum length of posts, reposts and quotes for X Premium users.
- README now shows how to pin a version.

## [2.0.1] - 2026-10-11

### Changed

- Renamed and published as `@mobalab/x-mcp-server`; runnable with `npx`.
- Minimum Node.js version is now 20.

[Unreleased]: https://github.com/mobalab/x-mcp-server/compare/v2.1.0...HEAD
[2.1.0]: https://github.com/mobalab/x-mcp-server/compare/v2.0.3...v2.1.0
[2.0.3]: https://github.com/mobalab/x-mcp-server/compare/v2.0.2...v2.0.3
[2.0.2]: https://github.com/mobalab/x-mcp-server/compare/v2.0.1...v2.0.2
[2.0.1]: https://github.com/mobalab/x-mcp-server/releases/tag/v2.0.1
