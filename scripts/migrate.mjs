import fs from 'node:fs/promises';
import path from 'node:path';
import mysql from 'mysql2/promise';

const env = (name, fallback) => process.env[name] || fallback || (() => { throw new Error(`Missing ${name}`); })();

const config = {
  host: env('GENZ_DB_HOST', '127.0.0.1'),
  port: Number(env('GENZ_DB_PORT', '3306')),
  user: env('GENZ_DB_USER'),
  password: env('GENZ_DB_PASSWORD'),
  database: env('GENZ_DB_NAME'),
  multipleStatements: true,
  connectTimeout: Number(process.env.GENZ_DB_CONNECT_TIMEOUT_MS || 10000),
};

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const retryableConnectionErrors = new Set([
  'ECONNREFUSED',
  'ECONNRESET',
  'ETIMEDOUT',
  'EHOSTUNREACH',
  'ENETUNREACH',
  'PROTOCOL_CONNECTION_LOST',
]);

async function connectWithRetry() {
  const attempts = Number(process.env.GENZ_DB_CONNECT_RETRIES || 30);
  const delayMs = Number(process.env.GENZ_DB_CONNECT_RETRY_DELAY_MS || 2000);
  let lastError;

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      const connection = await mysql.createConnection(config);
      await connection.ping();
      return connection;
    } catch (error) {
      lastError = error;
      const retryable = retryableConnectionErrors.has(error?.code);
      if (!retryable || attempt === attempts) throw error;
      console.warn(`Database connection attempt ${attempt}/${attempts} failed (${error.code}); retrying in ${delayMs}ms...`);
      await sleep(delayMs);
    }
  }

  throw lastError;
}

const connection = await connectWithRetry();

function splitSql(sql) {
  const statements = [];
  let start = 0;
  let quote = null;
  let lineComment = false;
  let blockComment = false;
  for (let i = 0; i < sql.length; i += 1) {
    const ch = sql[i];
    const next = sql[i + 1];
    if (lineComment) { if (ch === '\n') lineComment = false; continue; }
    if (blockComment) { if (ch === '*' && next === '/') { blockComment = false; i += 1; } continue; }
    if (!quote && ch === '-' && next === '-') { lineComment = true; i += 1; continue; }
    if (!quote && ch === '#') { lineComment = true; continue; }
    if (!quote && ch === '/' && next === '*') { blockComment = true; i += 1; continue; }
    if (quote) {
      if (ch === '\\') { i += 1; continue; }
      if (ch === quote) { if (sql[i + 1] === quote) i += 1; else quote = null; }
      continue;
    }
    if (ch === "'" || ch === '"' || ch === '`') { quote = ch; continue; }
    if (ch === ';') {
      const statement = sql.slice(start, i).trim();
      if (statement) statements.push(statement);
      start = i + 1;
    }
  }
  const tail = sql.slice(start).trim();
  if (tail) statements.push(tail);
  return statements;
}

// Migrations historically contained `USE genz_os`. Never allow a migration
// file to override GENZ_DB_NAME: the database selected by the connection is
// the only database this application may migrate.
function databaseSafeSql(sql) {
  return sql
    .replace(/^\s*CREATE\s+DATABASE(?:\s+IF\s+NOT\s+EXISTS)?\s+[`]?genz_os[`]?(?:\s+CHARACTER\s+SET\s+[^;]+)?(?:\s+COLLATE\s+[^;]+)?\s*;?\s*$/gim, '')
    .replace(/^\s*USE\s+[`]?genz_os[`]?\s*;?\s*$/gim, '');
}

const ignorableDdlErrors = new Set([1050, 1060, 1061, 1826, 1831]);
function mysqlCompatible(statement) {
  return statement.replace(/\bADD\s+COLUMN\s+IF\s+NOT\s+EXISTS\b/gi, 'ADD COLUMN');
}

async function applyMigration(file, version) {
  const rawSql = await fs.readFile(path.join(process.cwd(), 'db/migrations', file), 'utf8');
  const sql = databaseSafeSql(rawSql);
  for (const rawStatement of splitSql(sql)) {
    const statement = mysqlCompatible(rawStatement);
    try {
      await connection.query(statement);
    } catch (error) {
      if (ignorableDdlErrors.has(Number(error?.errno))) {
        console.warn(`Skipping already-present DDL in ${file}: ${error.sqlMessage}`);
        continue;
      }
      throw error;
    }
  }
  const [rows] = await connection.query('SELECT version FROM schema_migrations WHERE version=?', [version]);
  if (!rows.length) await connection.query('INSERT INTO schema_migrations(version,applied_at) VALUES(?,NOW(3))', [version]);
}

try {
  const baseSql = databaseSafeSql(await fs.readFile(path.join(process.cwd(), 'db/mysql-schema.sql'), 'utf8'));
  for (const rawStatement of splitSql(baseSql)) {
    const statement = mysqlCompatible(rawStatement);
    try {
      await connection.query(statement);
    } catch (error) {
      if (ignorableDdlErrors.has(Number(error?.errno))) {
        console.warn(`Skipping already-present base DDL: ${error.sqlMessage}`);
        continue;
      }
      throw error;
    }
  }

  await connection.query("INSERT INTO schema_migrations(version,applied_at) VALUES(1,NOW(3)) ON DUPLICATE KEY UPDATE applied_at=applied_at");
  const dir = path.join(process.cwd(), 'db/migrations');
  const files = (await fs.readdir(dir))
    .filter((f) => /^\d+_.*\.sql$/.test(f))
    .sort((a, b) => Number(a.match(/^\d+/)[0]) - Number(b.match(/^\d+/)[0]) || a.localeCompare(b));

  const versions = new Map();
  for (const file of files) {
    const version = Number(file.match(/^\d+/)[0]);
    const existing = versions.get(version);
    if (existing) throw new Error(`Duplicate migration version ${version}: ${existing} and ${file}`);
    versions.set(version, file);
  }

  const [appliedRows] = await connection.query('SELECT version FROM schema_migrations');
  const applied = new Set(appliedRows.map((r) => Number(r.version)));
  for (const file of files) {
    const version = Number(file.match(/^\d+/)[0]);
    if (applied.has(version)) continue;
    console.log(`Applying ${file}`);
    await applyMigration(file, version);
    applied.add(version);
  }
  console.log(`GenZ MySQL migrations complete. Database: ${config.database}`);
} finally {
  await connection.end();
}
