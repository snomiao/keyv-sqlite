// Test to compare Keyv wrapper vs direct storage usage
import Keyv from "keyv";
import { KeyvSqlite } from "./index";

const testKeyvVsDirect = async () => {
  console.log("Comparing Keyv wrapper vs direct storage usage...\n");

  const store = new KeyvSqlite({
    uri: ":memory:",
    driver: "bun:sqlite",
  });

  const keyv = new Keyv({ store });

  try {
    // Test 1: Store with Keyv wrapper
    console.log("1. Storing with Keyv wrapper:");
    await keyv.set("keyv-test", { a: 1, b: "test" });
    const keyvResult = await keyv.get("keyv-test");
    console.log("  Result:", keyvResult);
    console.log("  Type:", typeof keyvResult);
    console.log("");

    // Test 2: Store directly
    console.log("2. Storing directly (without Keyv):");
    await store.set("direct-test", { a: 1, b: "test" });
    const directResult = await store.get("direct-test");
    console.log("  Result:", directResult);
    console.log("  Type:", typeof directResult);
    console.log("");

    // Test 3: Cross-retrieve
    console.log("3. Retrieve Keyv-stored value directly:");
    const crossResult1 = await store.get("keyv-test");
    console.log("  Result:", crossResult1);
    console.log("  Type:", typeof crossResult1);
    console.log("");

    console.log("4. Retrieve directly-stored value with Keyv:");
    const crossResult2 = await keyv.get("direct-test");
    console.log("  Result:", crossResult2);
    console.log("  Type:", typeof crossResult2);
    console.log("");

    console.log("✅ Test complete!");
  } catch (error) {
    console.error("\n❌ Test failed:");
    console.error(error);
    throw error;
  }
};

// Run if executed directly
if (import.meta.main) {
  testKeyvVsDirect().catch(console.error);
}

export { testKeyvVsDirect };
