import mysql, { type Pool, type PoolConnection, type ResultSetHeader, type RowDataPacket } from 'mysql2/promise';

const required = (name: string) => {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
};

const globalKey = '__genz_mysql_pool__';
const globalStore = globalThis as typeof globalThis & { [globalKey]?: Pool };

const ISO_DATETIME = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,9})?(?:Z|[+-]\d{2}:?\d{2})$/;

/**
 * MySQL DATETIME does not accept JavaScript's ISO `T...Z` representation as a
 * plain string in all SQL modes. Convert ISO timestamp strings to Date objects
 * at the DB boundary so every caller gets the same safe serialization path.
 * Date-only and ordinary application strings are intentionally left untouched.
 */
export function normalizeDbValue(value: unknown): unknown {
  if (typeof value === 'string' && ISO_DATETIME.test(value)) {
    const date = new Date(value);
    if (!Number.isNaN(date.getTime())) return date;
  }
  if (Array.isArray(value)) return value.map(normalizeDbValue);
  if (value && typeof value === 'object' && Object.getPrototypeOf(value) === Object.prototype) {
    return Object.fromEntries(Object.entries(value).map(([key, entry]) => [key, normalizeDbValue(entry)]));
  }
  return value;
}

function normalizeDbArgs(args: unknown[]): unknown[] {
  if (args.length < 2) return args;
  return [args[0], normalizeDbValue(args[1])];
}

function wrapConnection(connection: PoolConnection): PoolConnection {
  return new Proxy(connection, {
    get(target, prop, receiver) {
      const value = Reflect.get(target, prop, receiver);
      if (prop === 'query' || prop === 'execute') {
        return (...args: unknown[]) => (value as (...input: unknown[]) => unknown).apply(target, normalizeDbArgs(args));
      }
      return typeof value === 'function' ? value.bind(target) : value;
    },
  });
}

function createRealPool(): Pool {
  return mysql.createPool({
    host: required('GENZ_DB_HOST'),
    port: Number(process.env.GENZ_DB_PORT || 3306),
    user: required('GENZ_DB_USER'),
    password: required('GENZ_DB_PASSWORD'),
    database: required('GENZ_DB_NAME'),
    waitForConnections: true,
    connectionLimit: Number(process.env.GENZ_DB_POOL_SIZE || 10),
    queueLimit: 0,
    enableKeepAlive: true,
    decimalNumbers: true,
    timezone: 'Z',
  });
}

function getPool(): Pool {
  if (!globalStore[globalKey]) globalStore[globalKey] = createRealPool();
  return globalStore[globalKey];
}

// Keep module import/builds independent from a live MySQL server. The pool is
// constructed only when a route actually performs a database operation.
export const pool: Pool = new Proxy({} as Pool, {
  get(_target, prop) {
    const real = getPool();
    const value = Reflect.get(real, prop, real);
    if (prop === 'query' || prop === 'execute') {
      return (...args: unknown[]) => (value as (...input: unknown[]) => unknown).apply(real, normalizeDbArgs(args));
    }
    if (prop === 'getConnection') {
      return async (...args: unknown[]) => wrapConnection(await real.getConnection(...args));
    }
    return typeof value === 'function' ? value.bind(real) : value;
  },
});

export async function transaction<T>(fn: (connection: PoolConnection) => Promise<T>): Promise<T> {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const result = await fn(connection);
    await connection.commit();
    return result;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

export type DBRow = RowDataPacket;
export type DBResult = ResultSetHeader;
