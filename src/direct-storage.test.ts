// Test using storage directly WITHOUT Keyv wrapper
import * as test from "vitest";
import { KeyvSqlite } from "./index";

test.describe("Direct storage usage (without Keyv wrapper)", () => {
  let store: KeyvSqlite;

  test.beforeEach(() => {
    store = new KeyvSqlite({
      uri: ":memory:",
      // Auto-detect driver
    });
  });

  test.afterEach(async () => {
    await store.disconnect();
  });

  test.it("should store and retrieve plain objects", async (t) => {
    const obj = { a: 1, b: "test" };
    await store.set("test-obj", obj);

    const retrieved = await store.get("test-obj");
    t.expect(retrieved).toEqual(obj);
    t.expect(typeof retrieved).toBe("object");
  });

  test.it("should store and retrieve arrays", async (t) => {
    const arr = [1, 2, 3];
    await store.set("test-arr", arr);

    const retrieved = await store.get("test-arr");
    t.expect(retrieved).toEqual(arr);
    t.expect(Array.isArray(retrieved)).toBe(true);
  });

  test.it("should store and retrieve strings", async (t) => {
    await store.set("test-str", "hello");

    const retrieved = await store.get("test-str");
    t.expect(retrieved).toBe("hello");
    t.expect(typeof retrieved).toBe("string");
  });

  test.it("should store and retrieve numbers", async (t) => {
    await store.set("test-num", 123);

    const retrieved = await store.get("test-num");
    t.expect(retrieved).toBe(123);
    t.expect(typeof retrieved).toBe("number");
  });

  test.it("should store and retrieve complex nested objects", async (t) => {
    const complex = {
      nested: {
        array: [1, 2, { deep: "value" }],
        string: "test",
      },
      number: 42,
    };

    await store.set("test-complex", complex);

    const retrieved = await store.get("test-complex");
    t.expect(retrieved).toEqual(complex);
  });

  test.it("should handle getMany with direct storage", async (t) => {
    await store.set("key1", { a: 1 });
    await store.set("key2", { b: 2 });
    await store.set("key3", { c: 3 });

    const results = await store.getMany(["key1", "key2", "key3"]);

    t.expect(results).toEqual([{ a: 1 }, { b: 2 }, { c: 3 }]);
  });
});
