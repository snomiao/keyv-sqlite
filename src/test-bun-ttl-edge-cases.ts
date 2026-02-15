// Test TTL edge cases that might cause binding errors
import Keyv from "keyv";
import { KeyvSqlite } from "./index";

const testTTLEdgeCases = async () => {
  console.log("Testing Bun SQLite with TTL edge cases...\n");

  const store = new KeyvSqlite({
    uri: ":memory:",
    driver: "bun:sqlite",
  });

  const keyv = new Keyv({ store });

  try {
    // Test with various TTL values
    console.log("1. Testing with undefined TTL:");
    await keyv.set("test-1", "value", undefined);
    console.log("✓ Pass\n");

    console.log("2. Testing with null TTL:");
    await keyv.set("test-2", "value", null as any);
    console.log("✓ Pass\n");

    console.log("3. Testing with 0 TTL:");
    await keyv.set("test-3", "value", 0);
    console.log("✓ Pass\n");

    console.log("4. Testing with negative TTL:");
    await keyv.set("test-4", "value", -1);
    console.log("✓ Pass\n");

    console.log("5. Testing with NaN TTL:");
    try {
      await keyv.set("test-5", "value", NaN);
      console.log("✓ Pass (NaN handled)\n");
    } catch (e) {
      console.log("❌ Failed with NaN:", e.message, "\n");
      throw e;
    }

    console.log("6. Testing with Infinity TTL:");
    try {
      await keyv.set("test-6", "value", Infinity);
      console.log("✓ Pass (Infinity handled)\n");
    } catch (e) {
      console.log("❌ Failed with Infinity:", e.message, "\n");
      throw e;
    }

    console.log("7. Testing with very large TTL:");
    await keyv.set("test-7", "value", Number.MAX_SAFE_INTEGER);
    console.log("✓ Pass\n");

    console.log("8. Testing with string TTL (type coercion):");
    await keyv.set("test-8", "value", "1000" as any);
    console.log("✓ Pass\n");

    console.log("✅ All TTL edge case tests passed!");
  } catch (error) {
    console.error("\n❌ Test failed:");
    console.error(error);
    throw error;
  }
};

// Run if executed directly
if (import.meta.main) {
  testTTLEdgeCases().catch(console.error);
}

export { testTTLEdgeCases };
