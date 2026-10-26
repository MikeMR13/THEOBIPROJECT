import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const path = new URL('../sql/home-snapshot-row-level-invalidation.sql', import.meta.url);
const sql = readFileSync(path, 'utf8');

for (const table of ['chapters', 'series', 'volumes']) {
  const name = `${table}_home_stale`;
  assert.match(sql, new RegExp(`drop\\s+trigger\\s+${name}\\s+on\\s+public\\.${table}\\s*;`, 'i'), `Falta reemplazar ${name}`);
  const create = sql.match(new RegExp(`create\\s+trigger\\s+${name}\\s+([\\s\\S]*?);`, 'i'));
  assert.ok(create, `Falta crear ${name}`);
  assert.match(create[1], new RegExp(`after\\s+insert\\s+or\\s+update\\s+or\\s+delete\\s+on\\s+public\\.${table}`, 'i'));
  assert.match(create[1], /for\s+each\s+row/i, `El trigger ${name} debe ser por fila`);
  assert.match(create[1], /execute\s+function\s+private\.home_stale\s*\(\s*\)/i, `Debe conservarse private.home_stale() en ${name}`);
  assert.doesNotMatch(create[1], /for\s+each\s+statement/i);
}
assert.match(sql, /begin\s*;/i, 'Aplicar cambios atómicamente');
assert.match(sql, /commit\s*;/i, 'Cerrar transacción');
assert.match(sql, /pg_get_triggerdef[\s\S]*FOR EACH STATEMENT/, 'Verificar el estado anterior antes de intervenir');
assert.doesNotMatch(sql, /create\s+or\s+replace\s+function/i, 'No modificar rutinas editoriales');
assert.doesNotMatch(sql, /cron\.(schedule|unschedule)/i, 'No cambiar trabajos programados');
console.log('OK: los tres invalidadores de Inicio se sustituyen por triggers AFTER ROW sin modificar el cron.');
