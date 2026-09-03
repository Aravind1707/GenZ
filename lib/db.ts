import Database from 'better-sqlite3';
import fs from 'node:fs';
import path from 'node:path';

const dataDir = path.resolve(process.env.GENZ_DATA_DIR || path.join(process.cwd(), 'data'));
const dbPath = path.resolve(process.env.GENZ_DB_PATH || path.join(dataDir, 'genz.db'));

fs.mkdirSync(path.dirname(dbPath), { recursive: true });

const globalKey = '__genz_sqlite__';
const globalStore = globalThis as typeof globalThis & { [globalKey]?: Database.Database };

export const db = globalStore[globalKey] ?? new Database(dbPath);
if (!globalStore[globalKey]) globalStore[globalKey] = db;

db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
  CREATE TABLE IF NOT EXISTS schema_migrations (
    version INTEGER PRIMARY KEY,
    applied_at TEXT NOT NULL
  );
`);

const schemaPath = path.join(process.cwd(), 'db', 'schema.sql');
const schema = fs.readFileSync(schemaPath, 'utf8');
const migrationVersion = 1;
const applied = db.prepare('SELECT version FROM schema_migrations WHERE version = ?').get(migrationVersion);
if (!applied) {
  const migrate = db.transaction(() => {
    db.exec(schema);
    db.prepare('INSERT INTO schema_migrations(version, applied_at) VALUES (?, ?)').run(migrationVersion, new Date().toISOString());
  });
  migrate();
}

export function transaction<T>(fn: () => T): T {
  return db.transaction(fn)();
}
