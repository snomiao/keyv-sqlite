// Test using storage directly WITHOUT Keyv wrapper
// This reproduces the user's actual error
import { KeyvSqlite } from "./index";

const testDirectStorage = async () => {
  console.log("Testing storage used DIRECTLY (without Keyv wrapper)...\n");

  const store = new KeyvSqlite({
    uri: ":memory:",
    driver: "bun:sqlite"
  });

  try {
    console.log("1. Testing with plain object (should fail without fix):");
    const obj = { a: 1, b: "test" };
    await store.set("test-obj", obj);
    console.log("✓ Pass\n");

    console.log("2. Testing with array:");
    const arr = [1, 2, 3];
    await store.set("test-arr", arr);
    console.log("✓ Pass\n");

    console.log("3. Testing with string:");
    await store.set("test-str", "hello");
    console.log("✓ Pass\n");

    console.log("4. Testing with number:");
    await store.set("test-num", 123);
    console.log("✓ Pass\n");

    console.log("5. Testing with undefined:");
    await store.set("test-undefined", undefined);
    console.log("✓ Pass\n");

    console.log("6. Testing retrieval:");
    const retrievedObj = await store.get("test-obj");
    console.log("  Object:", retrievedObj);
    const retrievedArr = await store.get("test-arr");
    console.log("  Array:", retrievedArr);
    const retrievedStr = await store.get("test-str");
    console.log("  String:", retrievedStr);
    const retrievedNum = await store.get("test-num");
    console.log("  Number:", retrievedNum);
    console.log("✓ Pass\n");

    console.log("✅ All tests passed!");
  } catch (error) {
    console.error("\n❌ Test failed:");
    console.error(error);
    throw error;
  }
};

// Run if executed directly
if (import.meta.main) {
  testDirectStorage().catch(console.error);
}

export { testDirectStorage };
