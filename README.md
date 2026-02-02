# SQLite store for keyv

A high-performance SQLite cache store for [keyv](https://github.com/jaredwray/keyv) with support for multiple SQLite drivers.

## Features

- **Multiple SQLite drivers**: Auto-detects and supports `node:sqlite`, `bun:sqlite`, and `better-sqlite3`
- **Synchronous API**: No `await` needed for instantiation - native drivers pre-loaded via top-level await
- **Custom drivers**: Pass your own driver module for maximum flexibility
- **100% test coverage** and production ready
- **WAL mode** enabled by default for better performance
- **Cross-runtime**: Works in Node.js, Bun, and Deno

## Installation

```bash
npm i @resolid/keyv-sqlite
```

## Supported Drivers

### Native Drivers (First-class support)
- **node:sqlite** - Built into Node.js 22.5.0+ (requires `--experimental-sqlite` flag)
- **bun:sqlite** - Built into Bun runtime

### NPM Packages
- **better-sqlite3** - Requires installation: `npm install better-sqlite3`

The library will auto-detect and use the best available driver for your runtime.

## Requirements

- Node.js 18+ (Node.js 22.5.0+ for native `node:sqlite` support)
- Or Bun runtime for native `bun:sqlite` support
- Or `better-sqlite3` package installed

## Usage

### Basic Usage

```typescript
import { KeyvSqlite } from '@resolid/keyv-sqlite';
import Keyv from "keyv";

// Simple file path
const store = new KeyvSqlite('./cache.db');
const keyv = new Keyv({ store });

// In-memory cache (auto-detects best driver)
const store = new KeyvSqlite();
const keyv = new Keyv({ store });

// With options object
const store = new KeyvSqlite({ uri: 'cache.sqlite' });
const keyv = new Keyv({ store });
```

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

### Using Custom Driver Module

```typescript
import Database from 'better-sqlite3';

const store = new KeyvSqlite({
  uri: 'cache.sqlite',
  driver: Database  // Pass the driver constructor directly
});
```

### Helper Function

```typescript
import { createKeyv } from '@resolid/keyv-sqlite';

// Simple file path
const keyv = createKeyv('./cache.db');

// With options
const keyv = createKeyv({ uri: 'cache.sqlite' });
```

## Configuration Options

```typescript
type KeyvSqliteOptions = {
  uri?: string;              // Database file path (default: ":memory:")
  driver?: DriverType | DriverModule;  // Driver selection (default: "auto")
  table?: string;            // Table name (default: "caches")
  enableWALMode?: boolean;   // Enable WAL mode (default: true)
  busyTimeout?: number;      // Busy timeout in ms (default: 5000)
  iterationLimit?: number;   // Iterator batch size (default: 10)
};
```

## API

### Synchronous Constructor

```typescript
const store = new KeyvSqlite(options);
```

Native drivers (`node:sqlite`, `bun:sqlite`) are pre-loaded at module initialization using top-level await, making the constructor fully synchronous.

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

## License

[MIT](./LICENSE).

## Thanks

Thanks to JetBrains for the [OSS development license](https://jb.gg/OpenSourceSupport).

![JetBrain](.github/assets/jetbrain-logo.svg)
