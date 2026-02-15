// Test edge cases with Bun SQLite
import Keyv from "keyv";
import { KeyvSqlite } from "./index";

const testEdgeCases = async () => {
  console.log("Testing Bun SQLite edge cases...\n");

  const store = new KeyvSqlite({
    uri: ":memory:",
    driver: "bun:sqlite"
  });

  const keyv = new Keyv({ store });

  try {
    // Test with objects containing undefined
    console.log("1. Testing object with undefined property:");
    const objWithUndefined = { a: 1, b: undefined, c: "test" };
    await keyv.set("obj-undefined", objWithUndefined);
    const retrieved1 = await keyv.get("obj-undefined");
    console.log("Stored:", objWithUndefined);
    console.log("Retrieved:", retrieved1);
    console.log("✓ Pass\n");

    // Test with array containing undefined
    console.log("2. Testing array with undefined:");
    const arrayWithUndefined = [1, undefined, "test", null];
    await keyv.set("array-undefined", arrayWithUndefined);
    const retrieved2 = await keyv.get("array-undefined");
    console.log("Stored:", arrayWithUndefined);
    console.log("Retrieved:", retrieved2);
    console.log("✓ Pass\n");

    // Test with Map
    console.log("3. Testing Map:");
    const map = new Map([["key1", "value1"], ["key2", undefined]]);
    await keyv.set("map-test", map);
    const retrieved3 = await keyv.get("map-test");
    console.log("Stored:", map);
    console.log("Retrieved:", retrieved3);
    console.log("✓ Pass\n");

    // Test with Set
    console.log("4. Testing Set:");
    const set = new Set([1, 2, undefined, null]);
    await keyv.set("set-test", set);
    const retrieved4 = await keyv.get("set-test");
    console.log("Stored:", set);
    console.log("Retrieved:", retrieved4);
    console.log("✓ Pass\n");

    // Test with Date
    console.log("5. Testing Date:");
    const date = new Date();
    await keyv.set("date-test", date);
    const retrieved5 = await keyv.get("date-test");
    console.log("Stored:", date);
    console.log("Retrieved:", retrieved5);
    console.log("✓ Pass\n");

    // Test with Buffer/TypedArray
    console.log("6. Testing Buffer:");
    const buffer = Buffer.from("hello world");
    await keyv.set("buffer-test", buffer);
    const retrieved6 = await keyv.get("buffer-test");
    console.log("Stored:", buffer);
    console.log("Retrieved:", retrieved6);
    console.log("✓ Pass\n");

    console.log("✅ All edge case tests passed!");
  } catch (error) {
    console.error("\n❌ Test failed:");
    console.error(error);
    throw error;
  }
};

// Run if executed directly
if (import.meta.main) {
  testEdgeCases().catch(console.error);
}

export { testEdgeCases };
