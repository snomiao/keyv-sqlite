// SQLite adapter for different runtime environments
// Supports: Node.js (node:sqlite), Bun (bun:sqlite), Deno (node:sqlite)
// Also supports: better-sqlite3, sqlite3 (via npm packages)

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

export type DriverType =
  | "auto"
  | "node:sqlite"
  | "bun:sqlite"
  | "better-sqlite3"
  | "sqlite3";

// Load a specific SQLite driver
async function loadSpecificDriver(
  driver: DriverType,
): Promise<new (path: string) => DatabaseSyncType> {
  switch (driver) {
    case "node:sqlite": {
      try {
        const { DatabaseSync } = await import("node:sqlite");
        return DatabaseSync as new (path: string) => DatabaseSyncType;
      } catch {
        throw new Error(
          "node:sqlite is not available. Requires Node.js >= 22.5.0 with --experimental-sqlite flag.",
        );
      }
    }

    case "bun:sqlite": {
      try {
        // @ts-expect-error - bun:sqlite only available in Bun runtime
        const { Database } = await import("bun:sqlite");
        return Database as new (path: string) => DatabaseSyncType;
      } catch {
        throw new Error("bun:sqlite is not available. Are you running in Bun?");
      }
    }

    case "better-sqlite3": {
      try {
        // @ts-expect-error - better-sqlite3 is an optional dependency
        const module = await import("better-sqlite3");
        return module.default as new (path: string) => DatabaseSyncType;
      } catch {
        throw new Error(
          "better-sqlite3 is not installed. Install it with: npm install better-sqlite3",
        );
      }
    }

    case "sqlite3": {
      throw new Error(
        "sqlite3 driver is not yet implemented. Use better-sqlite3 or node:sqlite instead.",
      );
    }

    case "auto":
      throw new Error(
        "Internal error: auto driver should be resolved before this point",
      );

    default:
      throw new Error(`Unknown driver: ${driver}`);
  }
}

// Detect runtime environment and load appropriate SQLite module
async function loadDatabaseClass(
  preferredDriver: DriverType = "auto",
): Promise<new (path: string) => DatabaseSyncType> {
  // If specific driver is requested, load it
  if (preferredDriver !== "auto") {
    return loadSpecificDriver(preferredDriver);
  }

  // Auto-detect runtime and try drivers in order of preference
  // @ts-expect-error - Bun global may not exist in Node.js
  const isBun = typeof Bun !== "undefined";
  const isWorker =
    // @ts-expect-error - WorkerGlobalScope may not exist in Node.js
    typeof WorkerGlobalScope !== "undefined" &&
    // @ts-expect-error - self may not exist in Node.js
    self instanceof WorkerGlobalScope;
  // @ts-expect-error - window may not exist in Node.js
  const isBrowser = typeof window !== "undefined" && !isWorker;

  if (isBrowser || isWorker) {
    throw new Error(
      "Browser/Worker environments require async initialization. " +
        "Please use @sqlite.org/sqlite-wasm directly for browser/worker support.",
    );
  }

  // Try drivers in order of preference
  if (isBun) {
    // In Bun, prefer bun:sqlite
    const drivers: DriverType[] = [
      "bun:sqlite",
      "better-sqlite3",
      "node:sqlite",
    ];
    for (const driver of drivers) {
      try {
        return await loadSpecificDriver(driver);
      } catch {
        continue;
      }
    }
  } else {
    // In Node.js/Deno, prefer node:sqlite
    const drivers: DriverType[] = ["node:sqlite", "better-sqlite3"];
    for (const driver of drivers) {
      try {
        return await loadSpecificDriver(driver);
      } catch {
        continue;
      }
    }
  }

  // If we get here, no driver worked
  throw new Error(
    "No SQLite driver available. Please either:\n" +
      "  - Use Node.js >= 22.5.0 with --experimental-sqlite flag, or\n" +
      "  - Install better-sqlite3: npm install better-sqlite3",
  );
}

// Cache for database classes by driver type
const databaseClassCache = new Map<
  DriverType,
  new (path: string) => DatabaseSyncType
>();

/**
 * Get the appropriate SQLite database class for the current runtime
 * Lazily loads and caches the database class on first call
 * @param driver - Preferred driver (defaults to "auto" for auto-detection)
 */
export async function getDatabaseClass(
  driver: DriverType = "auto",
): Promise<new (path: string) => DatabaseSyncType> {
  if (!databaseClassCache.has(driver)) {
    const DatabaseClass = await loadDatabaseClass(driver);
    databaseClassCache.set(driver, DatabaseClass);
  }
  return databaseClassCache.get(driver)!;
}

/**
 * Create a new SQLite database instance
 * @param path - Database file path or ":memory:" for in-memory database
 * @param driver - Preferred driver (defaults to "auto" for auto-detection)
 */
export async function createDatabase(
  path: string,
  driver: DriverType = "auto",
): Promise<DatabaseSyncType> {
  const DatabaseClass = await getDatabaseClass(driver);
  return new DatabaseClass(path);
}
