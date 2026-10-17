---
name: bump-version
description: Bump the release version of this npm package (package.json, package-lock.json and the version strings in src/index.ts) on a new branch, then guide tagging and publishing after merge. Use when the user asks to bump/ver up/release a new version, e.g. "bump patch", "release 2.1.0".
argument-hint: "[patch|minor|major|x.y.z]"
disable-model-invocation: true
---

# Bump version

Version lives in four places that must agree in a single commit:

- `package.json` `version`
- `package-lock.json` (top-level `version` and `packages[""].version`)
- `src/index.ts`: the `Server` constructor `version: 'x.y.z'` and the startup `console.error('X MCP server vx.y.z running on stdio')`

Do NOT use plain `npm version patch` on its own: it commits and tags immediately, before the
source strings are updated, so the tag would point at a commit with stale strings.
Instead, bump without git actions, edit the source, then make one commit. Tag later, after merge.

## Steps

1. **Pick the bump.** Use the argument (`patch`, `minor`, `major`, or an explicit `x.y.z`). If none was given, look at `git log <last-tag>..HEAD --oneline` and propose one (bug fixes → patch, new tools/features → minor, breaking tool/config changes → major), then confirm with the user.
2. **Preconditions.** Working tree must be clean (`git status --porcelain` empty); otherwise stop and tell the user. Run `git fetch origin`, then use `main` as the release branch (call it `<default>` below). Do NOT use `master` or whatever `origin/HEAD` points to: that is the upstream fork's line and lacks this repo's merged PRs. Check `git log -1 origin/main` looks right before branching.
3. **Branch.** Create a temporary branch from the up-to-date default branch: `git switch -c release/next origin/<default>`. It is renamed to `release/vX.Y.Z` in step 4 once the new version is known.
4. **Bump package files, no git side effects:**
   ```bash
   npm version <bump> --no-git-tag-version
   NEW=$(node -p "require('./package.json').version")
   ```
   This updates `package.json` and `package-lock.json`. Then rename the branch: `git branch -m release/v$NEW`.
5. **Update source strings** in `src/index.ts` to `$NEW` (both the `version:` field and the startup log message). Use the Edit tool, then verify nothing stale remains: `grep -rn "<old version>" src package.json package-lock.json README.md` should return nothing relevant.
6. **Verify.** `npm run build` must succeed. Run `git diff --stat`: expect only `package.json`, `package-lock.json`, `src/index.ts`.
7. **Commit** all three files as one commit with message `Bump version to $NEW` (plus the Co-Authored-By line from the session's attribution rules). Do not tag yet.
8. **Push and PR** only if the user wants: `git push -u origin release/v$NEW`, then `gh pr create` against `main`. Pushing is outward-facing, so ask first unless the user already said to.

## After the PR is merged (tell the user; do each step only on their go-ahead)

Tag and publish from the merged `main`, so the tag matches what is released:

```bash
git switch <default> && git pull
git tag vX.Y.Z            # on the merge commit, whose source already says X.Y.Z
git push origin vX.Y.Z
npm publish --access public   # needs npm login + 2FA one-time code; the user must run this themselves (suggest `! npm publish --access public`)
```

`npm publish` runs `prepare` (→ `tsc`), so `build/` is regenerated automatically. Published versions are immutable; if something is wrong, bump again rather than trying to republish.

## Notes for the user (new to npm)

- `npm version` edits `package.json` + lockfile, and by default also commits and tags. `--no-git-tag-version` turns the git part off.
- Semver: patch = bug fix, minor = backward-compatible feature, major = breaking change.
