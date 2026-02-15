// Test case to reproduce Bun SQLite undefined binding error
import { Database } from "bun:sqlite";
import Keyv from "keyv";
import { KeyvSqlite } from "./index";

const testBunUndefined = async () => {
  console.log("Testing Bun SQLite with undefined values...");

  const store = new KeyvSqlite({
    uri: ":memory:",
    driver: "bun:sqlite"
  });

  const keyv = new Keyv({ store });

  try {
    // Test 1: Setting undefined value directly
    console.log("\n1. Testing set with undefined value:");
    await keyv.set("test-undefined", undefined);
    console.log("✓ Successfully set undefined value");

    const value = await keyv.get("test-undefined");
    console.log(`Retrieved value:`, value);

    // Test 2: Setting various falsy values
    console.log("\n2. Testing set with null:");
    await keyv.set("test-null", null);
    console.log("✓ Successfully set null value");

    console.log("\n3. Testing set with empty string:");
    await keyv.set("test-empty", "");
    console.log("✓ Successfully set empty string");

    console.log("\n4. Testing set with 0:");
    await keyv.set("test-zero", 0);
    console.log("✓ Successfully set zero");

    console.log("\n5. Testing set with false:");
    await keyv.set("test-false", false);
    console.log("✓ Successfully set false");

    console.log("\n✅ All tests passed!");
  } catch (error) {
    console.error("\n❌ Test failed:");
    console.error(error);
    process.exit(1);
  }
};

// Run if executed directly
if (import.meta.main) {
  testBunUndefined();
}
