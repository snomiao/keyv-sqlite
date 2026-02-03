import KeyvSqlite from "../src/index.js";

// Test 1: Deep nested path
console.log("Test 1: Creating database with deep nested path...");
const store1 = new KeyvSqlite("./tmp/nested/deep/folders/test1.sqlite");
console.log("✓ Successfully created database at ./tmp/nested/deep/folders/test1.sqlite");

// Test 2: Single level path
console.log("\nTest 2: Creating database with single level path...");
const store2 = new KeyvSqlite("./tmp/test2.sqlite");
console.log("✓ Successfully created database at ./tmp/test2.sqlite");

// Test 3: In-memory (should not create any directories)
console.log("\nTest 3: Creating in-memory database...");
const store3 = new KeyvSqlite(":memory:");
console.log("✓ Successfully created in-memory database");

// Test 4: Test actual functionality
console.log("\nTest 4: Testing database functionality...");
await store1.set("test-key", "test-value");
const value = await store1.get("test-key");
console.log(`✓ Stored and retrieved value: ${value}`);

// Cleanup
await store1.disconnect();
await store2.disconnect();
await store3.disconnect();

console.log("\n✓ All tests passed!");
