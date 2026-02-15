# Breaking Change Analysis - v5.1.2

## Question
Is the JSON serialization fix a breaking change?

## Answer: NO - It's backwards compatible ✅

## Analysis

### Database Schema
```sql
CREATE TABLE IF NOT EXISTS ${tableName} (
  'cacheKey' TEXT PRIMARY KEY,
  'cacheData' TEXT,      -- Stored as TEXT
  'createdAt' INTEGER,
  'expiredAt' INTEGER
);
```

The `cacheData` column is **TEXT**, not a JSON type. SQLite does support JSON functions, but JSON is still stored as TEXT.

### Before Fix (v5.1.1)

**With Keyv wrapper:**
```javascript
const keyv = new Keyv({ store });
await keyv.set("key", { a: 1 });  // Keyv serializes: '{"value":{"a":1},...}'
// Stored in SQLite: TEXT = '{"value":{"a":1},...}'
```

**Direct usage (would fail):**
```javascript
const store = new KeyvSqlite();
await store.set("key", { a: 1 });  // ❌ Error: Binding expected string...
```

### After Fix (v5.1.2)

**With Keyv wrapper (UNCHANGED):**
```javascript
const keyv = new Keyv({ store });
await keyv.set("key", { a: 1 });  // Keyv serializes: '{"value":{"a":1},...}'
// Stored in SQLite: TEXT = '{"value":{"a":1},...}'
// ✅ Same behavior as before
```

**Direct usage (NOW WORKS):**
```javascript
const store = new KeyvSqlite();
await store.set("key", { a: 1 });  // We serialize: '{"a":1}'
// Stored in SQLite: TEXT = '{"a":1}'
// ✅ New feature, was broken before
```

## The Fix Logic

```typescript
const serializedValue = typeof rawValue === 'string'
  ? rawValue                  // Already serialized by Keyv → unchanged
  : JSON.stringify(rawValue); // Direct usage → new behavior
```

## Compatibility Matrix

| Usage Pattern | v5.1.1 | v5.1.2 | Breaking? |
|---------------|--------|--------|-----------|
| Keyv wrapper with objects | ✓ Works | ✓ Works | ✅ No change |
| Keyv wrapper with strings | ✓ Works | ✓ Works | ✅ No change |
| Keyv wrapper with primitives | ✓ Works | ✓ Works | ✅ No change |
| Direct usage with strings | ✓ Works | ✓ Works | ✅ No change |
| Direct usage with objects | ❌ Error | ✓ Works | ✅ New feature |
| Direct usage with primitives | ❌ Error | ✓ Works | ✅ New feature |

## Test Results

All **46 existing tests pass** without modification:
```
 ✓ src/index.test.ts  (46 tests) 373ms
```

These tests use Keyv wrapper extensively. If there was a breaking change, they would fail.

## Why It's Not Breaking

1. **Same storage format**: Everything is still TEXT in SQLite
2. **Same serialization for Keyv**: Keyv still serializes, we just pass it through
3. **New capability added**: Direct usage now works (was broken before)
4. **No migration needed**: Existing data reads/writes the same way
5. **All tests pass**: No existing functionality broken

## SQLite JSON Support

SQLite DOES support JSON, but as TEXT:
- `json_extract()`, `json_array()`, etc. are functions that operate on TEXT
- JSON is stored as TEXT, not a native type
- Our approach (JSON strings as TEXT) is the standard SQLite way

## Semantic Versioning

According to SemVer, this is a:
- **PATCH** (5.1.1 → 5.1.2): Bug fix ✓
- NOT a MINOR: No new API
- NOT a MAJOR: No breaking changes

## Conclusion

**NOT A BREAKING CHANGE**

The fix is:
- ✅ Backwards compatible
- ✅ Adds new functionality (direct usage)
- ✅ Fixes a bug (Bun SQLite binding error)
- ✅ All existing tests pass
- ✅ Correctly versioned as PATCH

semantic-release analyzed the commit and correctly bumped it as a **patch** version (5.1.1 → 5.1.2).
