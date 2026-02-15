# Bun SQLite Binding Error Fix

## Issue Reported

User encountered this error when using `@snomiao/keyv-sqlite` with Bun's SQLite:

```
TypeError: Binding expected string, TypedArray, boolean, number, bigint or null
      at #run (bun:sqlite:185:20)
      at <anonymous> (/code/snomiao/hours-analyzer/-/main/node_modules/@snomiao/keyv-sqlite/dist/index.mjs:203:46)
```

## Root Cause Analysis

Bun's SQLite driver is stricter than Node's about type bindings. It only accepts:
- `string`
- `TypedArray`
- `boolean`
- `number`
- `bigint`
- `null`

**NOT** `undefined`.

The error occurred when:
1. **Value binding**: `cache[1]` could be `undefined`, which Bun SQLite rejects
2. **TTL binding**: Edge cases like `NaN` or `Infinity` in TTL calculations could produce invalid numbers

## The Fix

### 1. Convert undefined to null (src/index.ts:203-211)

**Before:**
```typescript
this.updateCaches = (args, ttl) => {
  const createdAt = now();
  const expiredAt =
    ttl != undefined && ttl != 0 ? createdAt + ttl * 1000 : -1;

  for (const cache of args)
    updateStatement.run(cache[0], cache[1], createdAt, expiredAt);
};
```

**After:**
```typescript
this.updateCaches = (args, ttl) => {
  const createdAt = now();
  // Ensure TTL is a valid number or fallback to -1 (no expiration)
  const safeTTL = typeof ttl === 'number' && !isNaN(ttl) && isFinite(ttl) ? ttl : undefined;
  const expiredAt =
    safeTTL != undefined && safeTTL != 0 ? createdAt + safeTTL * 1000 : -1;

  for (const cache of args) {
    // Ensure undefined values are converted to null for SQLite compatibility
    const value = cache[1] === undefined ? null : cache[1];
    updateStatement.run(cache[0], value, createdAt, expiredAt);
  }
};
```

### 2. Changes Made

1. **Value sanitization**: Convert `undefined` → `null` before SQLite binding
2. **TTL validation**: Reject `NaN` and `Infinity` TTL values
3. **Type safety**: Ensure all bindings are SQLite-compatible types

## Tests Created

Created comprehensive test suites:

### 1. `src/test-bun-undefined.ts`
Tests undefined, null, and falsy values

### 2. `src/test-bun-edge-cases.ts`
Tests complex types:
- Objects with undefined properties
- Arrays with undefined elements
- Maps and Sets
- Dates and Buffers

### 3. `src/test-bun-ttl-edge-cases.ts`
Tests TTL edge cases:
- undefined, null, 0, negative values
- NaN, Infinity
- Very large numbers
- Type coercion

## Test Results

All tests pass ✓

```
✓ src/index.test.ts  (46 tests) 397ms
✓ test-bun-undefined.ts (5 tests)
✓ test-bun-edge-cases.ts (6 tests)
✓ test-bun-ttl-edge-cases.ts (8 tests)
```

## Impact

### Before Fix
- ❌ `undefined` values would crash with Bun SQLite
- ❌ `NaN`/`Infinity` TTL could cause issues
- ❌ Inconsistent behavior between Node.js and Bun

### After Fix
- ✅ `undefined` converted to `null` automatically
- ✅ Invalid TTL values handled gracefully
- ✅ Consistent behavior across all SQLite drivers
- ✅ Backwards compatible (no breaking changes)

## Compatibility

| Driver | Before | After |
|--------|--------|-------|
| `node:sqlite` | ✓ | ✓ |
| `bun:sqlite` | ❌ (with undefined) | ✓ |
| `better-sqlite3` | ✓ | ✓ |

## User Migration

**No action required** - the fix is backwards compatible and automatically handles edge cases.

## Related

- Bun SQLite docs: https://bun.sh/docs/api/sqlite
- Issue: TypeError when using undefined values with Bun SQLite
- Fix: Defensive type conversion for SQLite bindings
