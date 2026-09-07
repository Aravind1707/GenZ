import fs from 'node:fs/promises';
import mysql from 'mysql2/promise';

if ((process.env.GENZ_DEPLOYMENT_MODE || 'production') !== 'staging') {
  console.error('STAGING_ONLY: seed-staging.mjs refuses to run outside staging.');
  process.exit(2);
}

const required = (name) => {
  const value = process.env[name];
  if (!value) throw new Error(`Missing ${name}`);
  return value;
};

const db = await mysql.createConnection({
  host: required('GENZ_DB_HOST'),
  port: Number(process.env.GENZ_DB_PORT || 3306),
  user: required('GENZ_DB_USER'),
  password: required('GENZ_DB_PASSWORD'),
  database: required('GENZ_DB_NAME'),
  timezone: 'Z',
  multipleStatements: false,
});

try {
  const raw = await fs.readFile(new URL('../db/test-seed.sql', import.meta.url), 'utf8');
  const sql = raw
    .replace(/^\s*USE\s+[^;]+;\s*/i, '')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/^\s*--.*$/gm, '')
    .trim();
  if (!sql) throw new Error('STAGING_SEED_EMPTY');
  await db.query(sql);
  console.log('Staging food catalogue seeded.');
} finally {
  await db.end();
}
