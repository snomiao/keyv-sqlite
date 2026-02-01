import EventEmitter from "node:events";
import Keyv, { type KeyvStoreAdapter, type StoredData } from "keyv";
import { createDatabase, type DatabaseSyncType } from "./sqliteAdapter.js";

type KeyvSqliteOptions = {
  dialect?: string;
  uri?: string;
  table?: string;
  enableWALMode?: boolean;
  busyTimeout?: number;
  iterationLimit?: number | string;
};

type CacheObject = {
  cacheKey: string;
  cacheData: string;
  createdAt: number;
  expiredAt: number;
};

const now = () => {
  return new Date().getTime();
};

export class KeyvSqlite extends EventEmitter implements KeyvStoreAdapter {
  ttlSupport: boolean;
  opts: KeyvSqliteOptions;
  namespace?: string;

  sqlite: DatabaseSyncType;
  fetchCaches: (...args: string[]) => CacheObject[];
  deleteCaches: (...args: string[]) => number;
  updateCatches: (args: [string, unknown][], ttl?: number) => void;
  emptyCaches: () => void;
  findCaches: (
    namespace: string | undefined,
    limit: number,
    offset: number,
    expiredAt: number,
  ) => CacheObject[];

  /**
   * Create a new KeyvSqlite instance
   * @param options - Configuration options
   * @returns Promise that resolves to a KeyvSqlite instance
   */
  static async create(options?: KeyvSqliteOptions): Promise<KeyvSqlite> {
    const instance = Object.create(KeyvSqlite.prototype);
    EventEmitter.call(instance);

    instance.ttlSupport = true;
    instance.opts = {
      dialect: "sqlite",
      table: "caches",
      busyTimeout: 5000,
      enableWALMode: true, // Enable WAL mode by default
      ...options,
    };

    // Create database connection using environment-appropriate SQLite module
    instance.sqlite = await createDatabase(instance.opts.uri || ":memory:");

    if (instance.opts.enableWALMode) {
      instance.sqlite.exec("PRAGMA journal_mode = WAL");
    }

    if (instance.opts.busyTimeout) {
      instance.sqlite.exec(
        `PRAGMA busy_timeout = ${instance.opts.busyTimeout}`,
      );
    }

    instance._initializePreparedStatements();

    return instance;
  }

  /**
   * @deprecated Use KeyvSqlite.create() instead for proper async initialization
   */
  constructor(_options?: KeyvSqliteOptions) {
    super();
    throw new Error(
      "Direct instantiation is deprecated. Use KeyvSqlite.create() instead:\n" +
        "  const store = await KeyvSqlite.create(options);",
    );
  }

  private _initializePreparedStatements(): void {
    const tableName = this.opts.table;

    this.sqlite.exec(`
 CREATE TABLE IF NOT EXISTS ${tableName} (
	'cacheKey' TEXT PRIMARY KEY,
	'cacheData' TEXT,
	'createdAt' INTEGER,
  'expiredAt' INTEGER
);
CREATE INDEX IF NOT EXISTS idx_expired_caches ON ${tableName}(expiredAt);
`);

    const selectSingleStatement = this.sqlite.prepare<CacheObject>(
      `SELECT * FROM ${tableName} WHERE cacheKey = ?`,
    );
    const selectStatement = this.sqlite.prepare<CacheObject>(
      `SELECT * FROM ${tableName} WHERE cacheKey IN (SELECT value FROM json_each(?))`,
    );
    const updateStatement = this.sqlite.prepare(
      `INSERT OR REPLACE INTO ${tableName}(cacheKey, cacheData, createdAt, expiredAt) VALUES (?, ?, ?, ?)`,
    );
    const deleteSingleStatement = this.sqlite.prepare(
      `DELETE FROM ${tableName} WHERE cacheKey = ?`,
    );
    const deleteStatement = this.sqlite.prepare(
      `DELETE FROM ${tableName} WHERE cacheKey IN (SELECT value FROM json_each(?))`,
    );
    const finderStatement = this.sqlite.prepare<CacheObject>(
      `SELECT * FROM ${tableName} WHERE cacheKey LIKE ? AND (expiredAt = -1 OR expiredAt > ?) LIMIT ? OFFSET ?`,
    );
    const purgeStatement = this.sqlite.prepare(
      `DELETE FROM ${tableName} WHERE expiredAt != -1 AND expiredAt < ?`,
    );
    const emptyStatement = this.sqlite.prepare(
      `DELETE FROM ${tableName} WHERE cacheKey LIKE ?`,
    );

    this.fetchCaches = (...args) => {
      const ts = now();
      let purgeExpired = false;

      const result =
        args.length >= 3
          ? selectStatement
              .all(JSON.stringify(args))
              .map((data) => {
                if (data.expiredAt !== -1 && data.expiredAt < ts) {
                  purgeExpired = true;
                  return undefined;
                }
                return data;
              })
              .filter((data) => data !== undefined)
          : args
              .map((key) => {
                const data = selectSingleStatement.get(key);
                if (
                  data !== undefined &&
                  data.expiredAt !== -1 &&
                  data.expiredAt < ts
                ) {
                  purgeExpired = true;
                  return undefined;
                }

                return data;
              })
              .filter((data) => data !== undefined);

      if (purgeExpired) {
        process.nextTick(() => purgeStatement.run(ts));
      }

      return result as CacheObject[];
    };

    this.deleteCaches = (...args) => {
      if (args.length >= 3) {
        return deleteStatement.run(JSON.stringify(args)).changes;
      }

      let changes = 0;

      for (const k of args) {
        changes += deleteSingleStatement.run(k).changes;
      }

      return changes;
    };

    this.updateCatches = (args, ttl) => {
      const createdAt = now();
      const expiredAt =
        ttl != undefined && ttl != 0 ? createdAt + ttl * 1000 : -1;

      for (const cache of args)
        updateStatement.run(cache[0], cache[1], createdAt, expiredAt);
    };

    this.emptyCaches = () => {
      emptyStatement.run(this.namespace ? `${this.namespace}:%` : "%");
    };

    this.findCaches = (namespace, limit, offset, expiredAt) => {
      return finderStatement
        .all(`${namespace ? `${namespace}:` : ""}%`, expiredAt, limit, offset)
        .filter((data) => data !== undefined);
    };
  }

  async get<Value>(key: string): Promise<StoredData<Value> | undefined> {
    const rows = this.fetchCaches(key);

    if (rows.length == 0) {
      return undefined;
    }

    return rows[0].cacheData as Value;
  }

  async getMany<Value>(
    keys: string[],
  ): Promise<Array<StoredData<Value | undefined>>> {
    const rows = this.fetchCaches(...keys);

    return keys.map((key) => {
      const row = rows.find((row) => row.cacheKey === key);

      return (row ? row.cacheData : undefined) as StoredData<Value | undefined>;
    });
  }

  async set<T>(key: string, value: T, ttl?: number) {
    return new Promise((resolve, reject) => {
      try {
        this.updateCatches([[key, value]], ttl);
        resolve(value);
      } catch (e) {
        reject(e);
      }
    });
  }

  async delete(key: string) {
    const count = this.deleteCaches(key);

    return count == 1;
  }

  async deleteMany(keys: string[]) {
    const count = this.deleteCaches(...keys);

    return count == keys.length;
  }

  async clear() {
    this.emptyCaches();
  }

  async *iterator(namespace?: string) {
    const limit =
      Number.parseInt(this.opts.iterationLimit! as string, 10) || 10;
    const time = now();
    const find = this.findCaches;

    // @ts-expect-error - iterate
    const iterate = async function* (offset: number) {
      const entries = find(namespace, limit, offset, time);

      if (entries.length === 0) {
        return;
      }

      for (const entry of entries) {
        // biome-ignore lint: <explanation>
        offset += 1;
        yield [entry.cacheKey, entry.cacheData];
      }

      yield* iterate(offset);
    };

    yield* iterate(0);
  }

  async disconnect() {
    this.sqlite.close();
  }
}

/**
 * Create a Keyv instance with KeyvSqlite storage
 * @param keyvOptions - Configuration options for KeyvSqlite
 * @returns Promise that resolves to a Keyv instance
 */
export const createKeyv = async (keyvOptions?: KeyvSqliteOptions) => {
  const store = await KeyvSqlite.create(keyvOptions);
  return new Keyv({ store });
};
