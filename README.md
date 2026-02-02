# SQLite store for keyv

A high-performance SQLite cache store for [keyv](https://github.com/jaredwray/keyv) with support for multiple SQLite drivers.

> **Note:** This is a fork of [@resolid/keyv-sqlite](https://github.com/huijiewei/keyv-sqlite) by [@huijiewei](https://github.com/huijiewei) with a synchronous constructor API using top-level await. See [comparison below](#fork-differences).

## Installation

```bash
npm i @snomiao/keyv-sqlite
```

## Usage

### Basic Usage

```typescript
import { KeyvSqlite } from '@resolid/keyv-sqlite';
import Keyv from "keyv";

// Simple file path (recommended), note: WAL mode is enabled by default
const store = new KeyvSqlite('./cache.db');
const keyv = new Keyv({ store });

// In-memory cache
const store = new KeyvSqlite(':memory:');
const keyv = new Keyv({ store });

// Default (in-memory)
const store = new KeyvSqlite();
const keyv = new Keyv({ store });
```

### Helper Function

```typescript
import { createKeyv } from '@resolid/keyv-sqlite';

// Simple file path
const keyv = createKeyv('./cache.db');

// With options
const keyv = createKeyv({ uri: 'cache.sqlite' });
```

### With Options

```typescript
const store = new KeyvSqlite({
  uri: './cache.db',
  table: 'my_cache',        // Custom table name
  wal: true,                // WAL mode (default: true)
  busyTimeout: 10000,       // Busy timeout in ms
  iterationLimit: 100       // Iterator batch size
});
```

## Features

- **Synchronous API**: No `await` needed for instantiation
- **Auto-detection**: Automatically uses the best available SQLite driver
- **Multiple drivers**: Supports `node:sqlite`, `bun:sqlite`, and `better-sqlite3`
- **Cross-runtime**: Works in Node.js, Bun, and Deno
- **WAL mode**: Enabled by default for better performance
- **100% test coverage** and production ready

## API

### Constructor

```typescript
new KeyvSqlite(options?: KeyvSqliteOptions | string)
```

Pass a string for the file path, or an options object for advanced configuration.

### Methods

All methods are async to match the Keyv interface:

- `get(key)` - Get a value
- `getMany(keys)` - Get multiple values
- `set(key, value, ttl?)` - Set a value with optional TTL
- `delete(key)` - Delete a value
- `deleteMany(keys)` - Delete multiple values
- `clear()` - Clear all values
- `iterator(namespace?)` - Async iterator over entries
- `disconnect()` - Close the database connection

## Advanced Usage

### Using Specific Drivers

```typescript
// Use node:sqlite explicitly
const store = new KeyvSqlite({
  uri: 'cache.sqlite',
  driver: 'node:sqlite'
});

// Use bun:sqlite explicitly
const store = new KeyvSqlite({
  uri: 'cache.sqlite',
  driver: 'bun:sqlite'
});

// Use better-sqlite3 explicitly
const store = new KeyvSqlite({
  uri: 'cache.sqlite',
  driver: 'better-sqlite3'
});
```

### Custom Driver Module

```typescript
import Database from 'better-sqlite3';

const store = new KeyvSqlite({
  uri: 'cache.sqlite',
  driver: Database  // Pass the driver constructor directly
});
```

## Supported Drivers

The library auto-detects and uses the best available driver for your runtime:

### Native Drivers (First-class support)
- **node:sqlite** - Built into Node.js 22.5.0+ (requires `--experimental-sqlite` flag)
- **bun:sqlite** - Built into Bun runtime

### NPM Packages
- **better-sqlite3** - Requires installation: `npm install better-sqlite3`

Native drivers are pre-loaded at module initialization using top-level await, making the constructor fully synchronous.

## Requirements

- Node.js 18+ (Node.js 22.5.0+ for native `node:sqlite` support)
- Or Bun runtime for native `bun:sqlite` support
- Or `better-sqlite3` package installed

## Configuration Options

```typescript
type KeyvSqliteOptions = {
  uri?: string;              // Database file path (default: ":memory:")
  driver?: DriverType | DriverModule;  // Driver selection (default: "auto")
  table?: string;            // Table name (default: "caches")
  wal?: boolean;             // Enable WAL mode (default: true)
  busyTimeout?: number;      // Busy timeout in ms (default: 5000)
  iterationLimit?: number;   // Iterator batch size (default: 10)
};
```

## Fork Differences

This fork (`@snomiao/keyv-sqlite`) differs from the original `@resolid/keyv-sqlite` in the following ways:

| Feature | Original (@resolid) | This Fork (@snomiao) |
|---------|---------------------|----------------------|
| Constructor | ❌ Async factory only | ✅ Synchronous constructor |
| Usage | `await KeyvSqlite.create(opts)` | `new KeyvSqlite(opts)` |
| String parameter | ❌ No | ✅ Yes (`new KeyvSqlite('./db')`) |
| Driver loading | ⏳ Async on-demand | ⚡ Pre-loaded (top-level await) |
| API pattern | Async factory | Standard constructor |

### Migration from Original

If migrating from `@resolid/keyv-sqlite`:

```diff
- npm install @resolid/keyv-sqlite
+ npm install @snomiao/keyv-sqlite

- const store = await KeyvSqlite.create({ uri: './cache.db' });
+ const store = new KeyvSqlite('./cache.db');
```

**Breaking changes:**
- `enableWALMode` option renamed to `wal`
- Must use synchronous constructor instead of `KeyvSqlite.create()`

### Credits

This fork is based on the excellent work by **[@huijiewei](https://github.com/huijiewei)** in [keyv-sqlite](https://github.com/huijiewei/keyv-sqlite). The synchronous API improvement was implemented using top-level await for driver pre-loading.

## License

[MIT](./LICENSE).

## Thanks

Thanks to JetBrains for the [OSS development license](https://jb.gg/OpenSourceSupport).

![JetBrain](.github/assets/jetbrain-logo.svg)
