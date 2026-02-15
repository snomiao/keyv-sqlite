# Auto-Publish Workflow

## Overview

The project now has **automatic publishing** on every push to `main`. The workflow automatically:
1. Runs tests
2. Builds the project
3. Bumps the version
4. Creates a git tag
5. Creates a GitHub release
6. Publishes to npm

## How It Works

### Trigger
```yaml
on:
  push:
    branches:
      - main
```

Every push to `main` triggers the workflow.

### Version Bumping with Conventional Commits

The workflow automatically determines the version bump type using [Conventional Commits](https://www.conventionalcommits.org/):

- **Patch** (5.0.4 → 5.0.5): Bug fixes and minor changes
  ```bash
  fix: resolve memory leak in cache cleanup
  fix(sqlite): prevent database lock timeout
  docs: update installation instructions
  chore: update dependencies
  ```

- **Minor** (5.0.4 → 5.1.0): New features (backwards compatible)
  ```bash
  feat: add getMany and deleteMany methods
  feat(iterator): support custom limit parameter
  ```

- **Major** (5.0.4 → 6.0.0): Breaking changes
  ```bash
  feat!: remove deprecated SQLite driver API
  feat(api)!: change iterator return type

  # Or with BREAKING CHANGE in body:
  feat: redesign configuration API

  BREAKING CHANGE: the config format has changed
  ```

### Commit Type Reference

| Type | Version Bump | Example |
|------|--------------|---------|
| `fix:` | patch | `fix: handle null values in cache` |
| `feat:` | minor | `feat: add TTL support for entries` |
| `feat!:` | major | `feat!: remove Node 16 support` |
| `docs:` | patch | `docs: update README examples` |
| `style:` | patch | `style: format code with prettier` |
| `refactor:` | patch | `refactor: simplify query builder` |
| `perf:` | patch | `perf: optimize batch operations` |
| `test:` | patch | `test: add integration tests` |
| `build:` | patch | `build: update build configuration` |
| `ci:` | patch | `ci: add workflow for benchmarks` |
| `chore:` | patch | `chore: bump dependencies` |
| Any `BREAKING CHANGE:` | major | See example above |

### Infinite Loop Prevention

The workflow includes `[skip ci]` in version bump commits:
```
Bump version to 5.0.5 [skip ci]
```

This prevents the version bump commit from triggering another publish cycle.

### GitHub Release

Auto-generated releases include:
- Version number as title (e.g., `v5.0.5`)
- Changelog from commits since last release
- Each commit listed with hash

Example release notes:
```markdown
## Changes

- Update npm-publish workflow to use bun and add tests (9471942)
- Switch from npm to bun as primary package manager (21eb451)

---
🤖 Auto-generated release
```

## Workflow Steps

1. **Skip Check**: Checks if last commit contains `[skip ci]`
2. **Setup**: Installs Bun and dependencies
3. **Test**: Runs `bun run test --run` (must pass)
4. **Build**: Runs `bun run build`
5. **Version Bump**: Bumps version in `package.json`
6. **Push**: Commits version change and pushes to main
7. **Tag**: Creates git tag (e.g., `v5.0.5`)
8. **Release**: Creates GitHub release
9. **Publish**: Publishes to npm with provenance

## Requirements

### GitHub Secrets
- `NPM_TOKEN`: Required for publishing to npm
  - Get from https://www.npmjs.com/settings/YOUR_USERNAME/tokens
  - Set at https://github.com/snomiao/keyv-sqlite/settings/secrets/actions

### Permissions
The workflow needs:
- `contents: write` - To push version bumps and create releases
- `id-token: write` - For npm provenance

## Usage Examples

### Bug Fix (Patch)
```bash
git add .
git commit -m "fix: statement finalization error in Node.js"
git push
# Automatically publishes v5.0.5
```

### New Feature (Minor)
```bash
git add .
git commit -m "feat: add getMany and deleteMany methods"
git push
# Automatically publishes v5.1.0
```

### Breaking Change (Major)
```bash
git add .
git commit -m "feat!: remove Node.js 16 support"
git push
# Automatically publishes v6.0.0
```

Or with detailed breaking change:
```bash
git commit -m "feat: redesign configuration API

BREAKING CHANGE: The configuration format has changed from a flat object to a structured format. See migration guide in docs/migration.md"
git push
# Automatically publishes v6.0.0
```

## Pros & Cons

### Pros
✅ Fully automated - no manual version bumping
✅ Tests always run before publish
✅ Consistent release process
✅ Automatic changelog generation
✅ npm provenance for better security
✅ Fast CI with Bun

### Cons
⚠️ Every push to main triggers publish (be careful with force push)
⚠️ Must ensure tests are comprehensive
⚠️ Need to remember version bump tags for major/minor changes

## Comparison: Before vs After

### Before
1. Manually edit `package.json` version
2. Commit version change
3. Create git tag manually
4. Push tag
5. Create GitHub release manually
6. Wait for release workflow to publish

### After
1. Push to main
2. ☕ Relax - everything is automated

## Troubleshooting

### Workflow Fails at Push Step
- Check that `GITHUB_TOKEN` has write permissions
- Verify branch protection rules allow github-actions bot to push

### NPM Publish Fails
- Verify `NPM_TOKEN` secret is set correctly
- Check npm account has publish rights to `@snomiao/keyv-sqlite`
- Ensure version doesn't already exist on npm

### Tests Fail
- Workflow stops before version bump
- Fix tests and push again

### Want to Push Without Publishing
Currently not supported. Options:
1. Push to a feature branch, then merge to main when ready
2. Modify workflow to check for `[no-publish]` tag in commit message

## Alternative Release Toolchains

Instead of a custom workflow, you could use these popular release automation tools:

### 1. **semantic-release** (Most Popular)
- Fully automated semantic versioning and publishing
- Supports conventional commits natively
- Generates detailed changelogs
- Plugins for npm, GitHub releases, Slack, etc.

```bash
bun add -D semantic-release @semantic-release/git @semantic-release/github
```

**Pros**: Battle-tested, huge ecosystem, very configurable
**Cons**: Heavy (many dependencies), complex configuration

### 2. **release-please** (Google's Tool)
- Creates release PRs automatically
- Updates changelog and version in PR
- Only publishes when PR is merged
- Supports conventional commits

```yaml
- uses: google-github-actions/release-please-action@v3
```

**Pros**: PR-based workflow (review before release), simpler than semantic-release
**Cons**: Less flexible, Google-opinionated

### 3. **changesets** (Vercel/Modern.js)
- Designed for monorepos but works for single packages
- Manual changelog writing with version inference
- Great for projects where you want editorial control

```bash
bun add -D @changesets/cli
```

**Pros**: Best for monorepos, human-readable changelogs, editorial control
**Cons**: Manual changelog writing, more setup for single packages

### 4. **np** (Sindre Sorhus)
- Interactive CLI for publishing npm packages
- Manual version selection with validation
- Good for controlled releases

```bash
bunx np
```

**Pros**: Simple, interactive, good for manual workflows
**Cons**: Not automated, requires human to trigger

### 5. **Custom Workflow** (Current Implementation)
- Lightweight, no dependencies
- Full control over the process
- Conventional commits support ✓

**Pros**: No extra dependencies, simple, fast
**Cons**: Manual maintenance, fewer features than semantic-release

### Recommendation

| Project Type | Recommended Tool |
|--------------|-----------------|
| Need full automation + rich features | semantic-release |
| Want PR-based review workflow | release-please |
| Monorepo or want editorial changelogs | changesets |
| Simple single package (current) | Custom workflow ✓ |
| Manual controlled releases | np |

## Future Enhancements

Possible improvements to the current custom workflow:
- [ ] Support `[no-publish]` or `[skip-release]` tag to skip publishing
- [ ] Generate grouped changelogs (Features, Bug Fixes, etc.)
- [ ] Add pre-release versions (beta, alpha) support
- [ ] Notify on Discord/Slack after publish
- [ ] Validate conventional commit format in PR CI
