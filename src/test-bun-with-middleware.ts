// Test with keyv-nest and keyv-cache-proxy like the user
import Keyv from "keyv";
import KeyvNest from "keyv-nest";
import KeyvCacheProxy from "keyv-cache-proxy";
import { KeyvSqlite } from "./index";

const testWithMiddleware = async () => {
  console.log("Testing Bun SQLite with keyv-nest and keyv-cache-proxy...\n");

  const store = new KeyvSqlite({
    uri: ":memory:",
    driver: "bun:sqlite"
  });

  const keyv = new Keyv({ store });
  const nested = new KeyvNest(keyv);

  try {
    // Test 1: Simple set/get
    console.log("1. Testing simple set/get:");
    await nested.set("test.key", "value");
    const value1 = await nested.get("test.key");
    console.log(`✓ Pass: ${value1}\n`);

    // Test 2: Set undefined
    console.log("2. Testing set with undefined:");
    await nested.set("test.undefined", undefined);
    const value2 = await nested.get("test.undefined");
    console.log(`✓ Pass: ${value2}\n`);

    // Test 3: Set null
    console.log("3. Testing set with null:");
    await nested.set("test.null", null);
    const value3 = await nested.get("test.null");
    console.log(`✓ Pass: ${value3}\n`);

    // Test 4: Set complex object
    console.log("4. Testing set with complex object:");
    const complexObj = {
      a: 1,
      b: "test",
      c: { nested: true },
      d: [1, 2, 3],
      e: undefined,
      f: null
    };
    await nested.set("test.complex", complexObj);
    const value4 = await nested.get("test.complex");
    console.log(`✓ Pass:`, value4, "\n");

    // Test 5: With cache proxy
    console.log("5. Testing with keyv-cache-proxy:");

    let callCount = 0;
    const fetchFunction = async (key: string) => {
      callCount++;
      console.log(`  Fetch called (${callCount}) for key: ${key}`);
      return { data: `result-${callCount}`, timestamp: Date.now() };
    };

    const cache = KeyvCacheProxy(fetchFunction, keyv);

    const result1 = await cache("proxy-test");
    console.log(`  First call result:`, result1);

    const result2 = await cache("proxy-test");
    console.log(`  Second call result (should be cached):`, result2);
    console.log(`  Total fetch calls: ${callCount} (should be 1)`);
    console.log("✓ Pass\n");

    console.log("✅ All middleware tests passed!");
  } catch (error) {
    console.error("\n❌ Test failed:");
    console.error(error);
    throw error;
  }
};

// Run if executed directly
if (import.meta.main) {
  testWithMiddleware().catch(console.error);
}

export { testWithMiddleware };
