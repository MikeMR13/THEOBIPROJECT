// QA Fase 1 Preferencias: pruebas deterministas sin red ni cuentas reales.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  readerPrefsKey, readReaderPrefs, readerPrefsPendingKey, readPendingReaderPrefs,
  stageReaderPrefs, acknowledgeReaderPrefs
} from '../src/reader-pref-cache.js';

const map = new Map();
const store = {
  getItem: key => map.get(key) ?? null,
  setItem: (key, value) => map.set(key, String(value)),
  removeItem: key => map.delete(key)
};
const A = 'cuenta-lectora-A', B = 'cuenta-lectora-B';
const first = { global: { theme: 'sepia', size: 22 }, per_volume: { vol1: { font: 'Literata' } } };
const second = { global: { theme: 'oscuro', size: 24 }, per_volume: { vol1: { font: 'Literata' } } };
const other = { global: { font: 'sans' }, per_volume: {} };

assert(stageReaderPrefs(store, A, first));
assert.equal(readPendingReaderPrefs(store, B), null, 'Otra cuenta nunca hereda el borrador');
assert.deepEqual(readReaderPrefs(store, A), first);
assert.deepEqual(readReaderPrefs(store, B), { global: {}, per_volume: {} });
assert.equal(readerPrefsPendingKey(null), null);

assert(stageReaderPrefs(store, B, other));
assert.deepEqual(readPendingReaderPrefs(store, B), other);
assert(stageReaderPrefs(store, A, second));
assert.equal(acknowledgeReaderPrefs(store, A, first), false, 'Respuesta vieja no puede confirmar cambios nuevos');
assert.deepEqual(readPendingReaderPrefs(store, A), second, 'El último cambio persiste tras guardar uno anterior');
assert(acknowledgeReaderPrefs(store, A, second), 'La última revisión confirmada sí se limpia');
assert.equal(readPendingReaderPrefs(store, A), null);
assert.deepEqual(readPendingReaderPrefs(store, B), other, 'La confirmación de A no borra B');
assert.deepEqual(readReaderPrefs(store, A), second, 'El lector conserva la última preferencia confirmada');

store.setItem(readerPrefsPendingKey(A), '{corrupto');
assert.equal(readPendingReaderPrefs(store, A), null, 'Borrador corrupto no rompe la carga');
assert.equal(stageReaderPrefs(store, null, other), false, 'El guardado autenticado requiere usuario');
assert.equal(acknowledgeReaderPrefs(store, null, other), false);
const failingStore = { setItem() { throw Error('Cuota llena'); } };
assert.equal(stageReaderPrefs(failingStore, A, first), false, 'Fallo de almacenamiento no se oculta');

const profile = readFileSync('src/profile.js', 'utf8');
const reader = readFileSync('src/reader.js', 'utf8');
const contains = (src, term) => assert(src.includes(term), 'Falta garantía: ' + term);
contains(profile, 'const pending = readPendingReaderPrefs(localStorage, user.id)');
contains(profile, 'stageReaderPrefs(localStorage, user.id, R)');
contains(profile, 'acknowledgeReaderPrefs(localStorage, user.id, snapshot)');
contains(profile, 'sameReaderAccount(getUser()?.id, user.id)');
contains(profile, "const draftKey = 'obi-profile-draft:user:' + user.id");
contains(profile, 'localStorage.setItem(draftKey, JSON.stringify({ version: 1, data: D }))');
contains(profile, 'localStorage.removeItem(draftKey)');
contains(profile, "document.addEventListener('click', navigate, true)");
contains(reader, 'readPendingReaderPrefs(localStorage, uid)');
contains(reader, '!readPendingReaderPrefs(localStorage, uid)');
contains(reader, 'stageReaderPrefs(localStorage, uid, snapshot)');
contains(reader, 'acknowledgeReaderPrefs(localStorage, uid, snapshot)');
assert(profile.includes("id=\"lc-sync\"") && profile.includes('aria-live="polite"'), 'Falta estado de sincronización accesible');
assert(reader.includes('sameReaderAccount(getUser()?.id, uid)'), 'No perder guardia ante cambio de cuenta');
console.log('Preferencias fase 1: aislamiento, borradores, sincronización pendiente, guardado y navegación — OK');
