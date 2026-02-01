# Migration Plan

## Overview
This document outlines the migration plan for upgrading the keyv-sqlite project with the following changes:
1. Build tool: tsup → tsdown
2. Linter/Formatter: biome → oxlint+oxfmt
3. SQLite library: better-sqlite3 → node:sqlite (native)
4. Default WAL mode: enabled by default

## 1. Build Tool Migration: tsup → tsdown

### Comparison
| Aspect | tsup | tsdown |
|--------|------|--------|
| Speed | Fast (esbuild) | Faster (optimized for modern TS) |
| Bundle size | Good | Better (more aggressive tree-shaking) |
| Configuration | Simple | Simpler (zero-config focus) |
| Type generation | Yes | Yes |
| Maintenance | Active | Active (newer) |

### Decision: tsdown
**Pros:**
- Better performance for TypeScript-first projects
- More aggressive tree-shaking
- Simpler configuration
- Modern defaults aligned with project needs

**Cons:**
- Newer tool (less battle-tested)
- Smaller community

**Scenarios:** Best for TypeScript-first libraries with ESM/CJS dual output needs.

## 2. Linter/Formatter Migration: biome → oxlint+oxfmt

### Comparison
| Aspect | biome | oxlint+oxfmt |
|--------|-------|--------------|
| Speed | Very fast (Rust) | Extremely fast (Rust, oxc-based) |
| Features | Linter + Formatter | Separate tools |
| Configuration | Single file | Two configs (can be combined) |
| Rules coverage | Good | Excellent (ESLint-compatible) |
| Formatting | Custom | Prettier-compatible |

### Decision: oxlint+oxfmt
**Pros:**
- Faster performance (oxc parser is extremely optimized)
- Better ESLint rule compatibility
- Prettier-compatible formatting (more familiar)
- More granular control (separate tools)

**Cons:**
- Two tools instead of one
- Requires two configurations

**Scenarios:** Best for projects prioritizing maximum performance and ESLint/Prettier compatibility.

## 3. SQLite Library Migration: better-sqlite3 → node:sqlite

### Comparison
| Aspect | better-sqlite3 | node:sqlite |
|--------|----------------|-------------|
| Installation | Native addon (compile) | Built-in (Node 22.5+) |
| Performance | Excellent | Excellent |
| API | Sync + Async | Sync + Async |
| Maintenance | Community | Node.js core |
| Dependencies | Requires compilation | Zero dependencies |
| Node version | Any | ≥22.5.0 |

### Decision: node:sqlite
**Pros:**
- Zero installation overhead (no compilation)
- No native dependencies to manage
- Official Node.js support
- Simpler deployment
- Better long-term maintenance

**Cons:**
- Requires Node.js 22.5.0+ (current requirement is 18.0.0)
- API differences require code changes

**Alternative: Bun support**
- For Bun users, `bun:sqlite` will be used automatically
- Similar API to node:sqlite

**Scenarios:** Best for modern Node.js projects (22.5+) that want zero-dependency native SQLite.

## 4. Enable WAL Mode by Default

### Comparison
| Mode | DELETE (default) | WAL |
|------|------------------|-----|
| Concurrency | Limited | Excellent (readers don't block writers) |
| Performance | Good | Better (especially for writes) |
| Compatibility | Universal | Requires filesystem support |
| File count | 1 | 3 (main, -wal, -shm) |

### Decision: Enable WAL by default
**Pros:**
- Better concurrency (critical for Keyv use cases)
- Better write performance
- Reduced disk I/O
- Industry standard for modern SQLite usage

**Cons:**
- Creates additional files
- Requires checkpoint management (handled automatically)

**Implementation:**
- Change `enableWALMode` default from `undefined` to `true`
- Keep option to disable for edge cases

**Scenarios:** Best for all concurrent access scenarios, which is the primary use case for a key-value store.

## Implementation Steps

1. ✅ Create docs/ directory
2. Update package.json
   - Remove: tsup, @biomejs/biome, better-sqlite3, @types/better-sqlite3
   - Add: tsdown, oxlint, @oxlint/fmt
   - Update scripts: build → tsdown, check → oxlint + oxfmt
   - Update engines: node ≥22.5.0
   - Update peerDependencies: remove better-sqlite3
3. Create tsdown.config.ts (replace tsup.config.ts)
4. Create oxlint.json and .oxfmtrc.json (replace biome.json)
5. Update src/index.ts
   - Replace `import Database from "better-sqlite3"` with native node:sqlite
   - Update database initialization code
   - Set enableWALMode default to true
6. Update tsconfig.json (remove better-sqlite3 types)
7. Update tests to use node:sqlite
8. Run tests to verify migrations
9. Commit and push

## Risk Assessment

**Low Risk:**
- tsup → tsdown (similar APIs, output compatibility)
- biome → oxlint+oxfmt (formatting/linting only)
- WAL mode default (opt-out available)

**Medium Risk:**
- better-sqlite3 → node:sqlite (API changes, version requirement)

**Mitigation:**
- Comprehensive testing
- Document Node.js version requirement clearly
- Provide migration guide for users
