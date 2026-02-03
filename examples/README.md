# keyv-sqlite Examples

This directory contains comprehensive examples demonstrating various features and usage patterns for `@snomiao/keyv-sqlite`.

## Running the Examples

### Using Node.js (22.5.0+)

```bash
# Install dependencies first
npm install

# Run all examples
node --experimental-sqlite examples/index.ts
```

### Using Bun

```bash
# Install dependencies
bun install

# Run all examples
bun examples/index.ts
```

### Using tsx (for older Node.js versions)

```bash
npm install -g tsx
tsx examples/index.ts
```

## What's Included

The `index.ts` file includes 12 comprehensive examples:

1. **Basic File Usage** - Creating a file-based cache
2. **In-Memory Cache** - Using `:memory:` for temporary storage
3. **Helper Function** - Using `createKeyv()` for simpler setup
4. **TTL Support** - Setting expiration times on cached values
5. **Multiple Operations** - Working with multiple keys
6. **Delete Operations** - Removing specific keys
7. **Clear All Data** - Wiping the entire cache
8. **Custom Options** - Configuring table names, WAL mode, timeouts, etc.
9. **Specific Driver** - Choosing between node:sqlite, bun:sqlite, or better-sqlite3
10. **Namespaces** - Organizing data with namespaces
11. **Complex Data Types** - Storing arrays and nested objects
12. **Error Handling** - Proper try-catch patterns

## Running Individual Examples

You can also import and run specific examples:

```typescript
import { basicFileExample, ttlExample } from './examples/index.ts';

await basicFileExample();
await ttlExample();
```

## Notes

- Examples that create database files (like `cache.db`) will persist between runs
- In-memory examples (`:memory:`) are cleared when the process exits
- The TTL example includes a 3-second delay to demonstrate expiration
- All examples properly clean up by calling `disconnect()`
