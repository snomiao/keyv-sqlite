# Semantic Release Setup

The project now uses [semantic-release](https://github.com/semantic-release/semantic-release) for fully automated version management and package publishing.

## How It Works

semantic-release automatically:
1. Analyzes commit messages to determine version bump
2. Generates release notes and changelog
3. Updates `package.json` version
4. Creates git tag
5. Pushes changes back to repo
6. Creates GitHub release
7. Publishes to npm

## Commit Message Format

Uses [Conventional Commits](https://www.conventionalcommits.org/):

### Patch Release (Bug Fixes)
```bash
fix: resolve memory leak in cache cleanup
fix(sqlite): prevent database lock timeout
docs: update installation guide
perf: optimize query performance
```

### Minor Release (New Features)
```bash
feat: add getMany and deleteMany methods
feat(api): support custom TTL per entry
```

### Major Release (Breaking Changes)
```bash
feat!: remove deprecated SQLite driver

BREAKING CHANGE: The old SQLite driver API has been removed.
Please migrate to the new driver interface.
```

Or shorter syntax:
```bash
feat!: remove Node.js 16 support
fix!: change default timeout behavior
```

### No Release (No Version Bump)
```bash
chore: update README
ci: fix workflow syntax
test: add integration tests
refactor: simplify iterator logic
build: update dependencies
```

## Commit Type Reference

| Type | Release | Description | Example |
|------|---------|-------------|---------|
| `fix:` | Patch | Bug fixes | `fix: handle null values` |
| `feat:` | Minor | New features | `feat: add batch operations` |
| `perf:` | Patch | Performance improvements | `perf: optimize queries` |
| `BREAKING CHANGE:` | Major | Breaking API changes | See examples above |
| `feat!:` / `fix!:` | Major | Breaking changes (shorthand) | `feat!: new API` |
| `docs:` | None | Documentation only | `docs: update README` |
| `style:` | None | Code style/formatting | `style: run prettier` |
| `refactor:` | None | Code refactoring | `refactor: simplify logic` |
| `test:` | None | Adding/fixing tests | `test: add unit tests` |
| `build:` | None | Build system changes | `build: update tsconfig` |
| `ci:` | None | CI configuration | `ci: add test workflow` |
| `chore:` | None | Other changes | `chore: update deps` |
| `revert:` | Patch | Revert previous commit | `revert: undo feature X` |

## Configuration

### `.releaserc.json`
```json
{
  "branches": ["main"],
  "plugins": [
    "@semantic-release/commit-analyzer",        // Analyze commits
    "@semantic-release/release-notes-generator", // Generate changelog
    "@semantic-release/changelog",               // Update CHANGELOG.md
    "@semantic-release/npm",                     // Publish to npm
    "@semantic-release/github",                  // Create GitHub release
    ["@semantic-release/git", {                  // Commit version bump
      "assets": ["package.json", "CHANGELOG.md"],
      "message": "chore(release): ${nextRelease.version} [skip ci]"
    }]
  ]
}
```

### GitHub Workflow

Simple workflow in `.github/workflows/npm-publish.yml`:

```yaml
- name: Release
  env:
    GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
    NPM_TOKEN: ${{ secrets.NPM_TOKEN }}
  run: bunx semantic-release
```

## Features

### ✅ Automated Version Management
- No manual `package.json` editing
- Follows semantic versioning strictly
- Determined entirely from commit messages

### ✅ Changelog Generation
- Automatically generates `CHANGELOG.md`
- Groups commits by type (Features, Bug Fixes, etc.)
- Includes commit hashes and links

### ✅ GitHub Releases
- Creates release for every version
- Includes release notes from commits
- Links to commits and issues

### ✅ npm Publishing
- Publishes only when there are releasable commits
- Supports provenance (requires `NPM_TOKEN`)
- Handles pre-releases (alpha, beta, rc)

### ✅ Git Integration
- Creates git tags automatically
- Commits version bump back to repo
- Uses `[skip ci]` to prevent loops

## Usage Examples

### Regular Bug Fix
```bash
git commit -m "fix: resolve statement finalization error"
git push
# → Publishes v5.0.5
```

### New Feature
```bash
git commit -m "feat: add iterator support for custom limits"
git push
# → Publishes v5.1.0
```

### Breaking Change with Details
```bash
git commit -m "feat!: redesign configuration API

BREAKING CHANGE: The configuration format has changed.
Old format: { uri: string }
New format: { database: { path: string } }

See migration guide in docs/migration.md"
git push
# → Publishes v6.0.0
```

### Multiple Commits
```bash
git commit -m "feat: add getMany method"
git commit -m "feat: add deleteMany method"
git commit -m "docs: update API reference"
git push
# → Publishes v5.1.0 (one release with all changes)
```

### No Release
```bash
git commit -m "chore: update dependencies"
git push
# → No release (no version bump)
```

## Requirements

### npm Token
semantic-release needs an npm token to publish:

1. Create token at https://www.npmjs.com/settings/YOUR_USERNAME/tokens
   - Type: **Automation** (recommended) or **Publish**
   - Permissions: Read and write

2. Add to GitHub secrets:
   - Go to https://github.com/snomiao/keyv-sqlite/settings/secrets/actions
   - Create secret named `NPM_TOKEN`
   - Paste your npm token

### GitHub Token
Uses `GITHUB_TOKEN` automatically provided by GitHub Actions (no setup needed).

## Dry Run (Test Locally)

Test semantic-release without publishing:

```bash
bunx semantic-release --dry-run
```

This will show what version would be released and what changes would be made.

## Benefits vs Custom Workflow

| Feature | Custom Workflow | semantic-release |
|---------|----------------|------------------|
| Setup complexity | Simple | Moderate |
| Conventional commits | ✓ | ✓ |
| Auto version bump | ✓ | ✓ |
| Changelog generation | Basic | Advanced |
| Community support | DIY | Large ecosystem |
| Plugin system | N/A | 100+ plugins |
| Pre-releases | Manual | Built-in |
| Monorepo support | N/A | Available |
| Maintenance | Manual | Community |

## Troubleshooting

### "No release published"
This means no commits triggered a release. Check:
- Are commits using conventional format?
- Are commits only chore/docs/test (non-releasing types)?

### "ENOTOKEN" or "Invalid npm token"
- Verify `NPM_TOKEN` secret is set in GitHub
- Check token hasn't expired
- Ensure token has publish permissions

### "EGITNOPERMISSION"
- Check workflow has `contents: write` permission
- Verify `GITHUB_TOKEN` has write access

### Workflow loops infinitely
- semantic-release uses `[skip ci]` in commits automatically
- If looping, check workflow trigger configuration

## Advanced: Pre-releases

To publish beta/alpha versions:

1. Create a beta branch:
```bash
git checkout -b beta
```

2. Update `.releaserc.json`:
```json
{
  "branches": [
    "main",
    { "name": "beta", "prerelease": true }
  ]
}
```

3. Commit and push to beta:
```bash
git commit -m "feat: new experimental feature"
git push origin beta
# → Publishes v5.1.0-beta.1
```

## Migration from Custom Workflow

The custom workflow has been replaced. semantic-release will:
- Start from current version (5.0.4)
- Analyze all commits since last tag
- Determine appropriate version bump

No manual migration needed!

## Learn More

- [semantic-release docs](https://semantic-release.gitbook.io/semantic-release/)
- [Conventional Commits](https://www.conventionalcommits.org/)
- [Available plugins](https://semantic-release.gitbook.io/semantic-release/extending/plugins-list)
