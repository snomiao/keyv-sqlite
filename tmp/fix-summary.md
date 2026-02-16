# Direct Storage Auto-Deserialization Fix

## Problem
Previously, direct storage usage (without Keyv wrapper) returned JSON strings instead of objects:
```typescript
await store.set("key", {a: 1});
const value = await store.get("key");
// Before: '{"a":1}' (string) ❌
// After:  {a: 1} (object) ✅
```

## Solution
Implemented smart deserialization in `get()`, `getMany()`, and `iterator()` that:

1. **Detects Keyv format**: Returns strings for Keyv to handle its own deserialization
   - Special encodings: `:base64:...`, `:symbol:...`, etc.
   - Keyv wrapper: `{value: ..., expires: ...}` (has "value" at top level)

2. **Deserializes for direct usage**: Returns objects for all other JSON
   - Plain objects: `{a: 1}` → object
   - Arrays: `[1,2,3]` → array
   - Nested structures: automatic

## No Double Serialization ✅

The `set()` method already handled this correctly:
```typescript
const serializedValue = typeof rawValue === "string"
  ? rawValue              // Keyv pre-serialized → store as-is
  : JSON.stringify(rawValue); // Direct usage → serialize once
```

## Test Results

All 57 tests passing:
- ✅ Keyv wrapper tests (46 tests) - buffers, BigInt, namespaces, all work
- ✅ Direct storage tests (6 tests) - objects, arrays, numbers, strings
- ✅ Comparison tests (5 tests) - verifies both modes work correctly

## Usage Examples

### Direct Storage (NEW behavior)
```typescript
const store = new KeyvSqlite({ uri: 'db.sqlite' });

// Objects are automatically deserialized
await store.set("user", { name: "Alice", age: 30 });
const user = await store.get("user");
console.log(user); // { name: "Alice", age: 30 } ✅

// Arrays too
await store.set("items", [1, 2, 3]);
const items = await store.get("items");
console.log(items); // [1, 2, 3] ✅
```

### Keyv Wrapper (unchanged)
```typescript
const keyv = new Keyv({ store });

await keyv.set("key", { value: "data" });
const value = await keyv.get("key");
console.log(value); // { value: "data" } ✅
```

## Files Changed
- `src/index.ts`: Added smart deserialization logic to `get()`, `getMany()`, `iterator()`
- `src/direct-storage.test.ts`: New tests for direct storage usage
- `src/keyv-vs-direct.test.ts`: Comparison tests between both modes

## Breaking Change?
**NO** - This is a fix, not a breaking change:
- Keyv wrapper usage unchanged
- Direct storage now works as expected (returns objects, not strings)
- Previous direct storage behavior was considered a bug
