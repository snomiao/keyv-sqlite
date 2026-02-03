#!/usr/bin/env bun
/**
 * Examples for @snomiao/keyv-sqlite
 *
 * This file demonstrates various usage patterns for the keyv-sqlite package.
 * Run with: node --experimental-sqlite examples/index.ts (for Node.js 22.5+)
 */

import Keyv from "keyv";
import KeyvSqlite, { createKeyv } from "../src/index.ts";

// =============================================================================
// Example 1: Basic Usage with File Path
// =============================================================================
async function basicFileExample() {
  console.log("\n=== Example 1: Basic File Usage ===");

  // Create a store with a simple file path
  const store = new KeyvSqlite('./.cache/db.sqlite');
  const keyv = new Keyv({ store });

  // Set a value
  await keyv.set('user:1', { name: 'Alice', age: 30 });

  // Get the value back
  const user = await keyv.get('user:1');
  console.log('Retrieved user:', user);

  // Clean up
  await keyv.disconnect();
}

// =============================================================================
// Example 2: In-Memory Cache
// =============================================================================
async function inMemoryExample() {
  console.log("\n=== Example 2: In-Memory Cache ===");

  // Using ':memory:' for an in-memory database
  const store = new KeyvSqlite(':memory:');
  const keyv = new Keyv({ store });

  await keyv.set('temp:data', { value: 'temporary' });
  const data = await keyv.get('temp:data');
  console.log('Temporary data:', data);

  await keyv.disconnect();
}

// =============================================================================
// Example 3: Using the Helper Function
// =============================================================================
async function helperFunctionExample() {
  console.log("\n=== Example 3: Helper Function ===");

  // Simplest way to create a Keyv instance
  const keyv = createKeyv('./.cache/cache-helper.db');

  await keyv.set('config:theme', 'dark');
  const theme = await keyv.get('config:theme');
  console.log('Theme:', theme);

  await keyv.disconnect();
}

// =============================================================================
// Example 4: TTL (Time To Live) Support
// =============================================================================
async function ttlExample() {
  console.log("\n=== Example 4: TTL Support ===");

  const keyv = createKeyv(':memory:');

  // Set a value that expires in 2 seconds
  await keyv.set('session:token', 'abc123', 2);
  console.log('Token immediately after set:', await keyv.get('session:token'));

  // Wait 3 seconds
  await new Promise(resolve => setTimeout(resolve, 3000));

  const expiredToken = await keyv.get('session:token');
  console.log('Token after 3 seconds (should be undefined):', expiredToken);

  await keyv.disconnect();
}

// =============================================================================
// Example 5: Multiple Operations
// =============================================================================
async function multipleOperationsExample() {
  console.log("\n=== Example 5: Multiple Operations ===");

  const keyv = createKeyv(':memory:');

  // Set multiple values
  await keyv.set('product:1', { name: 'Laptop', price: 999 });
  await keyv.set('product:2', { name: 'Mouse', price: 29 });
  await keyv.set('product:3', { name: 'Keyboard', price: 79 });

  // Get multiple values
  const products = await Promise.all([
    keyv.get('product:1'),
    keyv.get('product:2'),
    keyv.get('product:3'),
  ]);
  console.log('All products:', products);

  await keyv.disconnect();
}

// =============================================================================
// Example 6: Delete Operations
// =============================================================================
async function deleteExample() {
  console.log("\n=== Example 6: Delete Operations ===");

  const keyv = createKeyv(':memory:');

  await keyv.set('user:1', { name: 'Bob' });
  await keyv.set('user:2', { name: 'Carol' });

  console.log('Before delete:', await keyv.get('user:1'));

  // Delete a single key
  await keyv.delete('user:1');
  console.log('After delete:', await keyv.get('user:1'));

  // user:2 should still exist
  console.log('user:2 still exists:', await keyv.get('user:2'));

  await keyv.disconnect();
}

// =============================================================================
// Example 7: Clear All Data
// =============================================================================
async function clearExample() {
  console.log("\n=== Example 7: Clear All Data ===");

  const keyv = createKeyv(':memory:');

  // Add some data
  await keyv.set('key1', 'value1');
  await keyv.set('key2', 'value2');
  await keyv.set('key3', 'value3');

  console.log('Before clear:', await keyv.get('key1'));

  // Clear all data
  await keyv.clear();

  console.log('After clear:', await keyv.get('key1'));
  console.log('After clear:', await keyv.get('key2'));
  console.log('After clear:', await keyv.get('key3'));

  await keyv.disconnect();
}

// =============================================================================
// Example 8: Custom Options
// =============================================================================
async function customOptionsExample() {
  console.log("\n=== Example 8: Custom Options ===");

  const store = new KeyvSqlite({
    uri: './cache-custom.db',
    table: 'my_custom_cache',  // Custom table name
    wal: true,                  // Enable WAL mode (default)
    busyTimeout: 10000,         // 10 second busy timeout
    iterationLimit: 100,        // Batch size for iteration
  });

  const keyv = new Keyv({ store });

  await keyv.set('custom:key', 'custom value');
  console.log('Custom cache:', await keyv.get('custom:key'));

  await keyv.disconnect();
}

// =============================================================================
// Example 9: Using Specific Drivers
// =============================================================================
async function specificDriverExample() {
  console.log("\n=== Example 9: Specific Driver ===");

  // Auto-detect (default behavior)
  const storeAuto = new KeyvSqlite({
    uri: ':memory:',
    driver: 'auto',  // Will use node:sqlite or bun:sqlite if available
  });

  const keyvAuto = new Keyv({ store: storeAuto });
  await keyvAuto.set('driver:auto', 'auto-detected driver');
  console.log('Auto driver:', await keyvAuto.get('driver:auto'));
  await keyvAuto.disconnect();

  // You can also specify a driver explicitly:
  // driver: 'node:sqlite'
  // driver: 'bun:sqlite'
  // driver: 'better-sqlite3'
}

// =============================================================================
// Example 10: Namespaces
// =============================================================================
async function namespacesExample() {
  console.log("\n=== Example 10: Namespaces ===");

  // Create a shared store
  const store = new KeyvSqlite(':memory:');

  // Use namespaces to organize data
  const users = new Keyv({ store, namespace: 'users' });
  const posts = new Keyv({ store, namespace: 'posts' });

  await users.set('alice', { name: 'Alice', role: 'admin' });
  await posts.set('post1', { title: 'Hello World', author: 'Alice' });

  console.log('User:', await users.get('alice'));
  console.log('Post:', await posts.get('post1'));

  // Clear only the users namespace
  await users.clear();

  console.log('User after clear:', await users.get('alice'));
  console.log('Post after users clear:', await posts.get('post1'));

  await store.disconnect();
}

// =============================================================================
// Example 11: Complex Data Types
// =============================================================================
async function complexDataExample() {
  console.log("\n=== Example 11: Complex Data Types ===");

  const keyv = createKeyv(':memory:');

  // Store arrays
  await keyv.set('cart:items', [
    { id: 1, name: 'Item 1', qty: 2 },
    { id: 2, name: 'Item 2', qty: 1 },
  ]);

  // Store nested objects
  await keyv.set('user:profile', {
    id: 1,
    name: 'John',
    settings: {
      theme: 'dark',
      notifications: {
        email: true,
        push: false,
      },
    },
  });

  console.log('Cart items:', await keyv.get('cart:items'));
  console.log('User profile:', await keyv.get('user:profile'));

  await keyv.disconnect();
}

// =============================================================================
// Example 12: Error Handling
// =============================================================================
async function errorHandlingExample() {
  console.log("\n=== Example 12: Error Handling ===");

  const keyv = createKeyv(':memory:');

  try {
    await keyv.set('test:key', 'test value');
    const value = await keyv.get('test:key');
    console.log('Successfully retrieved:', value);
  } catch (error) {
    console.error('Error occurred:', error);
  } finally {
    await keyv.disconnect();
  }
}

// =============================================================================
// Run All Examples
// =============================================================================
async function runAllExamples() {
  console.log('Running all keyv-sqlite examples...\n');

  try {
    await basicFileExample();
    await inMemoryExample();
    await helperFunctionExample();
    await ttlExample();
    await multipleOperationsExample();
    await deleteExample();
    await clearExample();
    await customOptionsExample();
    await specificDriverExample();
    await namespacesExample();
    await complexDataExample();
    await errorHandlingExample();

    console.log('\n✓ All examples completed successfully!');
  } catch (error) {
    console.error('\n✗ Error running examples:', error);
    process.exit(1);
  }
}

// Run examples if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runAllExamples();
}

// Export examples for external use
export {
  basicFileExample,
  inMemoryExample,
  helperFunctionExample,
  ttlExample,
  multipleOperationsExample,
  deleteExample,
  clearExample,
  customOptionsExample,
  specificDriverExample,
  namespacesExample,
  complexDataExample,
  errorHandlingExample,
  runAllExamples,
};
