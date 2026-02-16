// Test to compare Keyv wrapper vs direct storage usage
import Keyv from "keyv";
import * as test from "vitest";
import { KeyvSqlite } from "./index";

test.describe("Keyv wrapper vs direct storage", () => {
  let store: KeyvSqlite;
  let keyv: Keyv;

  test.beforeEach(() => {
    store = new KeyvSqlite({
      uri: ":memory:",
      // Auto-detect driver (will use node:sqlite or bun:sqlite based on runtime)
    });
    keyv = new Keyv({ store });
  });

  test.afterEach(async () => {
    await store.disconnect();
  });

  test.it("should store and retrieve with Keyv wrapper (deserializes automatically)", async (t) => {
    const testValue = { a: 1, b: "test" };

    // Store with Keyv
    await keyv.set("keyv-test", testValue);

    // Get with Keyv - should return deserialized object
    const keyvResult = await keyv.get("keyv-test");
    t.expect(keyvResult).toEqual(testValue);
    t.expect(typeof keyvResult).toBe("object");

    // Check raw database value - Keyv adds "keyv:" namespace prefix
    const rawStored = getRawDatabaseValue(store, "keyv:keyv-test");
    t.expect(rawStored).toBe(JSON.stringify({ value: testValue }));
  });

  test.it("should store and retrieve directly (returns deserialized object)", async (t) => {
    const testValue = { a: 1, b: "test" };

    // Store directly
    await store.set("direct-test", testValue);

    // Get directly - returns deserialized object
    const directResult = await store.get("direct-test");
    t.expect(directResult).toEqual(testValue);
    t.expect(typeof directResult).toBe("object");

    // Check raw database value - should be JSON string
    const rawStored = getRawDatabaseValue(store, "direct-test");
    t.expect(rawStored).toBe(JSON.stringify(testValue));
  });

  test.it("should retrieve Keyv-stored value directly as string (Keyv format detected)", async (t) => {
    const testValue = { a: 1, b: "test" };

    // Store with Keyv
    await keyv.set("keyv-test", testValue);

    // Retrieve with direct storage using the namespaced key
    // Returns as string because Keyv format is detected (contains "value" key)
    const crossResult = await store.get("keyv:keyv-test");
    t.expect(crossResult).toBe(JSON.stringify({ value: testValue }));
    t.expect(typeof crossResult).toBe("string");

    // You can manually parse it if needed for direct usage
    const parsed = JSON.parse(crossResult as string);
    t.expect(parsed).toEqual({ value: testValue });
  });

  test.it("should NOT retrieve directly-stored value with Keyv (namespace mismatch)", async (t) => {
    const testValue = { a: 1, b: "test" };

    // Store directly (no namespace prefix)
    await store.set("direct-test", testValue);

    // Retrieve with Keyv - won't find it because Keyv looks for "keyv:direct-test"
    const crossResult = await keyv.get("direct-test");
    t.expect(crossResult).toBeUndefined();

    // But we can retrieve it directly as deserialized object
    const directResult = await store.get("direct-test");
    t.expect(directResult).toEqual(testValue);
  });

  test.it("should store different formats: Keyv wraps in {value:...}, direct stores as-is", async (t) => {
    const testValue = { a: 1, b: "test" };

    // Store with both methods
    await keyv.set("test-key", testValue);
    await store.set("direct-key", testValue);

    // Get raw database values (remember Keyv adds "keyv:" namespace)
    const keyvRaw = getRawDatabaseValue(store, "keyv:test-key");
    const directRaw = getRawDatabaseValue(store, "direct-key");

    // Both should be JSON strings
    t.expect(typeof keyvRaw).toBe("string");
    t.expect(typeof directRaw).toBe("string");

    // Keyv wraps in { value: ... }
    t.expect(keyvRaw).toBe(JSON.stringify({ value: testValue }));

    // Direct storage stores as-is
    t.expect(directRaw).toBe(JSON.stringify(testValue));

    // Show the difference
    t.expect(keyvRaw).not.toBe(directRaw);
  });
});

/**
 * Helper function to get raw value from database
 */
function getRawDatabaseValue(store: KeyvSqlite, key: string): string | undefined {
  const result = store.sqlite
    .prepare("SELECT cacheData FROM caches WHERE cacheKey = ?")
    .get(key) as { cacheData: string } | undefined;

  return result?.cacheData;
}
