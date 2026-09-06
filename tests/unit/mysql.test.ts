import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeDbValue } from '../../lib/mysql';

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
