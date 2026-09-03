import mysql, { type Pool, type PoolConnection, type ResultSetHeader, type RowDataPacket } from 'mysql2/promise';

const required = (name: string) => {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
};

const globalKey = '__genz_mysql_pool__';
const globalStore = globalThis as typeof globalThis & { [globalKey]?: Pool };

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
