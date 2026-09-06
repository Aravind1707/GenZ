import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeDbSql, normalizeDbValue } from '../../lib/mysql';

test('normalizeDbValue converts ISO timestamps to Date values', () => {
  const value = normalizeDbValue('2026-09-06T17:22:16.547Z');
  assert.ok(value instanceof Date);
  assert.equal((value as Date).toISOString(), '2026-09-06T17:22:16.547Z');
});

test('normalizeDbValue preserves MySQL datetime strings and ordinary strings', () => {
  assert.equal(normalizeDbValue('2026-09-06 17:22:16.547'), '2026-09-06 17:22:16.547');
  assert.equal(normalizeDbValue('GENZFAM001'), 'GENZFAM001');
  assert.equal(normalizeDbValue('2026-09-06'), '2026-09-06');
});

test('normalizeDbValue recursively normalizes arrays and plain objects', () => {
  const value = normalizeDbValue({ startedAt: '2026-09-06T17:22:16.547Z', name: 'Guest', values: ['2026-09-06T18:00:00Z'] }) as Record<string, unknown>;
  assert.ok(value.startedAt instanceof Date);
  assert.equal(value.name, 'Guest');
  assert.ok(Array.isArray(value.values));
  assert.ok((value.values as unknown[])[0] instanceof Date);
});

test('normalizeDbSql upgrades the legacy active-member predicate to nullable expiry semantics', () => {
  assert.equal(
    normalizeDbSql('SELECT id FROM members WHERE id=? AND active=TRUE AND expires_at>=CURDATE() LIMIT 1'),
    'SELECT id FROM members WHERE id=? AND active=TRUE AND (expires_at IS NULL OR expires_at>=CURDATE()) LIMIT 1',
  );
});

test('normalizeDbSql leaves explicit expiry predicates untouched', () => {
  const sql = 'SELECT id FROM members WHERE active=TRUE AND (expires_at IS NULL OR expires_at>=CURDATE())';
  assert.equal(normalizeDbSql(sql), sql);
});
