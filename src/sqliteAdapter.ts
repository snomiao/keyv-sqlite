// SQLite adapter for different runtime environments
// Supports: Node.js (node:sqlite), Bun (bun:sqlite), Deno (node:sqlite)
// Also supports: better-sqlite3, sqlite3 (via npm packages)

import { mkdirSync } from "node:fs";
import { dirname } from "node:path";

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

export type DriverModule = new (path: string) => DatabaseSyncType;

// Pre-loaded drivers (loaded via top-level await)
let nodeSqliteDriver: DriverModule | null = null;
let bunSqliteDriver: DriverModule | null = null;
let betterSqlite3Driver: DriverModule | null = null;

// Preload drivers using top-level await
// This allows synchronous access to drivers without await in constructors
try {
  const { DatabaseSync } = await import("node:sqlite");
  nodeSqliteDriver = DatabaseSync as DriverModule;
} catch {
  // node:sqlite not available, continue
}

try {
  // @ts-expect-error - bun:sqlite only available in Bun runtime
  const { Database } = await import("bun:sqlite");
  bunSqliteDriver = Database as DriverModule;
} catch {
  // bun:sqlite not available, continue
}

try {
  // @ts-expect-error - better-sqlite3 is an optional dependency
  const module = await import("better-sqlite3");
  betterSqlite3Driver = module.default as DriverModule;
} catch {
  // better-sqlite3 not available, continue
}

/**
 * Load a specific SQLite driver synchronously
 * @param driver - Driver type string OR a pre-loaded driver module
 * @returns Driver constructor
 */
function loadSpecificDriver(
  driver: DriverType | DriverModule,
): DriverModule {
  // If a driver module is passed directly, use it
  if (typeof driver === "function") {
    return driver;
  }

  switch (driver) {
    case "node:sqlite": {
      if (!nodeSqliteDriver) {
        throw new Error(
          "node:sqlite is not available. Requires Node.js >= 22.5.0 with --experimental-sqlite flag.",
        );
      }
      return nodeSqliteDriver;
    }

    case "bun:sqlite": {
      if (!bunSqliteDriver) {
        throw new Error("bun:sqlite is not available. Are you running in Bun?");
      }
      return bunSqliteDriver;
    }

    case "better-sqlite3": {
      if (!betterSqlite3Driver) {
        throw new Error(
          "better-sqlite3 is not installed. Install it with: npm install better-sqlite3",
        );
      }
      return betterSqlite3Driver;
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

/**
 * Detect runtime environment and load appropriate SQLite module synchronously
 * @param preferredDriver - Preferred driver (defaults to "auto" for auto-detection)
 * @returns Driver constructor
 */
function loadDatabaseClass(
  preferredDriver: DriverType | DriverModule = "auto",
): DriverModule {
  // If a driver module is passed directly, use it
  if (typeof preferredDriver === "function") {
    return preferredDriver;
  }

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
        return loadSpecificDriver(driver);
      } catch {
        continue;
      }
    }
  } else {
    // In Node.js/Deno, prefer node:sqlite
    const drivers: DriverType[] = ["node:sqlite", "better-sqlite3"];
    for (const driver of drivers) {
      try {
        return loadSpecificDriver(driver);
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
  DriverType | DriverModule,
  DriverModule
>();

/**
 * Get the appropriate SQLite database class for the current runtime (synchronous)
 * Lazily loads and caches the database class on first call
 * @param driver - Preferred driver (defaults to "auto" for auto-detection) or a pre-loaded driver module
 */
export function getDatabaseClass(
  driver: DriverType | DriverModule = "auto",
): DriverModule {
  if (!databaseClassCache.has(driver)) {
    const DatabaseClass = loadDatabaseClass(driver);
    databaseClassCache.set(driver, DatabaseClass);
  }
  return databaseClassCache.get(driver)!;
}

/**
 * Create a new SQLite database instance (synchronous)
 * @param path - Database file path or ":memory:" for in-memory database
 * @param driver - Preferred driver (defaults to "auto" for auto-detection) or a pre-loaded driver module
 */
export function createDatabase(
  path: string,
  driver: DriverType | DriverModule = "auto",
): DatabaseSyncType {
  // Create parent directory automatically if path is not in-memory
  if (path !== ":memory:") {
    const dir = dirname(path);
    if (dir && dir !== ".") {
      try {
        mkdirSync(dir, { recursive: true });
      } catch (error) {
        // Ignore error if directory already exists
        if ((error as NodeJS.ErrnoException).code !== "EEXIST") {
          throw error;
        }
      }
    }
  }

  const DatabaseClass = getDatabaseClass(driver);
  return new DatabaseClass(path);
}
