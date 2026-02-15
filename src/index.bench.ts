import { join } from "node:path";
import { beforeAll, bench, describe } from "vitest";
import { createDatabase, type DatabaseSyncType, type DriverType } from "./sqliteAdapter.js";

let sqlite: DatabaseSyncType;

// Get configuration from environment variables
if (!process.env.BENCHMARK_DRIVER) {
  throw new Error("BENCHMARK_DRIVER environment variable is required");
}
if (!process.env.BENCHMARK_WAL) {
  throw new Error("BENCHMARK_WAL environment variable is required");
}

const driver = process.env.BENCHMARK_DRIVER as DriverType;
const enableWAL = process.env.BENCHMARK_WAL === "true";

const sqliteFile = join(process.cwd(), "runtime", `cache-${driver}-wal-${enableWAL}.sqlite3`);
const cacheTableName = "caches";

const argsCount = 2;

const keys = Array.from({ length: 10000 }, (_, i) => i + 1);

beforeAll(() => {
  console.log(`\n🔧 Benchmark Configuration:`);
  console.log(`   Driver: ${driver}`);
  console.log(`   WAL Mode: ${enableWAL}`);
  console.log(`   Database: ${sqliteFile}\n`);

  sqlite = createDatabase(sqliteFile, driver);

  if (enableWAL) {
    sqlite.exec("PRAGMA journal_mode = WAL");
  }

  sqlite.exec(`
 CREATE TABLE IF NOT EXISTS ${cacheTableName} (
	'cacheKey' TEXT PRIMARY KEY,
	'cacheData' TEXT,
	'createdAt' INTEGER,
  'expiredAt' INTEGER
);
CREATE INDEX IF NOT EXISTS idx_expired_caches ON ${cacheTableName}(expiredAt);
`);

  const updateStatement = sqlite.prepare(
    `INSERT OR REPLACE INTO ${cacheTableName}(cacheKey, cacheData, createdAt, expiredAt) VALUES (?, ?, ?, ?)`,
  );

  const createdAt = new Date().getTime();

  for (const k of keys) {
    updateStatement.run(k, "cacheData", createdAt, -1);
  }
});

describe("sqlite select", () => {
  bench("select normal", () => {
    const selectStatement = sqlite.prepare(`SELECT * FROM ${cacheTableName} WHERE cacheKey = ?`);
    const selectKeys = Array.from({ length: argsCount }, (_, i) => i + 1);

    for (const k of selectKeys) {
      selectStatement.get(k);
    }
  });

  bench("select json_each", () => {
    const selectStatement = sqlite.prepare(
      `SELECT * FROM ${cacheTableName} WHERE cacheKey IN (SELECT value FROM json_each(?))`,
    );
    const selectKeys = Array.from({ length: argsCount }, (_, i) => i + 400);
    selectStatement.all(JSON.stringify(selectKeys));
  });
});

describe("sqlite delete", () => {
  bench("delete normal", () => {
    const deleteStatement = sqlite.prepare(`DELETE FROM ${cacheTableName} WHERE cacheKey = ?`);
    const deleteKeys = Array.from({ length: argsCount }, (_, i) => i + 1000);

    for (const k of deleteKeys) {
      deleteStatement.run(k);
    }
  });

  bench("delete json_each", () => {
    const deleteStatement = sqlite.prepare(
      `DELETE FROM ${cacheTableName} WHERE cacheKey IN (SELECT value FROM json_each(?))`,
    );
    const deleteKeys = Array.from({ length: argsCount }, (_, i) => i + 1300);
    deleteStatement.run(JSON.stringify(deleteKeys));
  });
});
