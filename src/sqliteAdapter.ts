// SQLite adapter for different runtime environments
// Supports: Node.js (node:sqlite), Bun (bun:sqlite), Deno (node:sqlite)

export type DatabaseSyncType = {
  exec(sql: string): void;
  prepare<T = unknown>(
    sql: string,
  ): {
    run(...params: unknown[]): {
      changes: number;
      lastInsertRowid: number | bigint;
    };
    get(...params: unknown[]): T | undefined;
    all(...params: unknown[]): T[];
  };
  close(): void;
};

// Detect runtime environment and load appropriate SQLite module
async function loadDatabaseClass(): Promise<
  new (path: string) => DatabaseSyncType
> {
  // @ts-expect-error - Bun global may not exist in Node.js
  const isBun = typeof Bun !== "undefined";
  const isWorker =
    // @ts-expect-error - WorkerGlobalScope may not exist in Node.js
    typeof WorkerGlobalScope !== "undefined" &&
    // @ts-expect-error - self may not exist in Node.js
    self instanceof WorkerGlobalScope;
  // @ts-expect-error - window may not exist in Node.js
  const isBrowser = typeof window !== "undefined" && !isWorker;

  if (isBun) {
    // Bun runtime uses bun:sqlite
    // @ts-expect-error - bun:sqlite only available in Bun runtime
    const { Database } = await import("bun:sqlite");
    return Database as new (path: string) => DatabaseSyncType;
  } else if (isBrowser || isWorker) {
    // Browser/Worker environments use @sqlite.org/sqlite-wasm
    // This requires async initialization, users should handle this case
    throw new Error(
      "Browser/Worker environments require async initialization. " +
        "Please use @sqlite.org/sqlite-wasm directly for browser/worker support.",
    );
  } else {
    // Node.js and Deno use node:sqlite
    const { DatabaseSync } = await import("node:sqlite");
    return DatabaseSync as new (path: string) => DatabaseSyncType;
  }
}

// Lazy-loaded database class
let cachedDatabaseClass: (new (path: string) => DatabaseSyncType) | null = null;

/**
 * Get the appropriate SQLite database class for the current runtime
 * Lazily loads and caches the database class on first call
 */
export async function getDatabaseClass(): Promise<
  new (path: string) => DatabaseSyncType
> {
  if (!cachedDatabaseClass) {
    cachedDatabaseClass = await loadDatabaseClass();
  }
  return cachedDatabaseClass;
}

/**
 * Create a new SQLite database instance
 * @param path - Database file path or ":memory:" for in-memory database
 */
export async function createDatabase(path: string): Promise<DatabaseSyncType> {
  const DatabaseClass = await getDatabaseClass();
  return new DatabaseClass(path);
}
