// Regresión de apertura de /estudio/importar ante HTTP 500 y recuperación.
 // Solo consultas simuladas: no utiliza cuentas ni datos reales.
import assert from 'node:assert/strict';
import { loadStudioImportCatalogue } from '../src/studio-importer-catalog.js';
import { createImporter } from '../src/studio-importer.js';

function mockDatabase({ firstSeriesError = false, volumesError = false, relatedError = false } = {}) {
  const calls = [];
  let first = firstSeriesError;
  const sb = {
    from(table) {
      const state = { table, fields: '', ids: [] };
      const query = {
        select(fields) { state.fields = fields; return query; },
        eq() { return query; }, is() { return query; }, or() { return query; },
        in(field, ids) { state.ids = ids; return query; },
        order() { return query; },
        range(from, to) {
          calls.push({ ...state, from, to });
          if (table === 'series' && state.fields === 'id,slug,title,cover_path') {
            if (first) { first = false; return Promise.resolve({ error: { message: 'HTTP 500 simulado' } }); }
            return Promise.resolve({ data: [
              { id: 'series-1', slug: 'obra-uno', title: 'Obra uno', cover_path: null },
              { id: 'series-2', slug: 'obra-dos', title: 'Obra dos', cover_path: 'media/dos.jpg' }
            ] });
          }
          if (table === 'volumes') return Promise.resolve(volumesError
            ? { error: { message: 'Volúmenes no disponibles' } }
            : { data: [
              { id: 'volume-1', series_id: 'series-1', num: 1, deleted_at: null },
              { id: 'volume-2', series_id: 'series-2', num: 2, deleted_at: '2026-10-01' }
            ] });
          if (table === 'series' && state.fields === 'id,title,teams(name)')
            return Promise.resolve(relatedError
              ? { error: { message: 'Obras relacionadas no disponibles' } }
              : { data: [] });
          throw new Error('Consulta no esperada: ' + table + ': ' + state.fields);
        }
      };
      return query;
    }
  };
  return { sb, calls };
}
const good = mockDatabase();
const rows = await loadStudioImportCatalogue(good.sb, 'team-1');
assert.equal(rows.length, 2);
assert.equal(rows[0].volumes[0].num, 1);
assert.equal(rows[1].volumes[0].deleted_at, '2026-10-01');
assert(good.calls.every(c => !c.fields.includes('volumes(')),
  'No recuperar volúmenes mediante JOIN anidado de series');
assert(good.calls.some(c => c.table === 'volumes' && c.ids.join(',') === 'series-1,series-2'));
await assert.rejects(loadStudioImportCatalogue(mockDatabase({ volumesError: true }).sb, 'team-1'),
  /Volúmenes no disponibles/, 'Error de volumen no debe simular un catálogo vacío');

const widgets = new Map();
function element(selector) {
  if (!widgets.has(selector)) widgets.set(selector, {
    innerHTML: '', textContent: '', disabled: false, isConnected: true, handlers: {},
    addEventListener(name, fn) { this.handlers[name] = fn; },
    querySelectorAll() { return []; }
  });
  return widgets.get(selector);
}
globalThis.location = { pathname: '/estudio/importar', search: '' };
const db = mockDatabase({ firstSeriesError: true, relatedError: true });
const app = { innerHTML: '' };
const T = { team: { id: 'team-1' } };
const warnings = console.warn;
console.warn = () => {}; // Errores esperados del fixture.
try {
  const importer = createImporter({
    sb: db.sb, app, $: element, esc: v => String(v ?? ''),
    toast: () => {}, go: () => {},
    getUser: () => ({ id: 'user-1' }), getMe: () => ({}),
    T, can: () => true, ensure: async () => true,
    shell: (_title, body) => body, bindPicker: () => {},
    LIMITS: { file: 80 * 1024 * 1024 },
    SEC: []
  });
  await importer();
  assert.match(element('#wiz').innerHTML, /Arrastra aquí un EPUB, DOCX o PDF/,
    'Importar debe mostrar el selector sin esperar las consultas');
  await new Promise(resolve => setImmediate(resolve));
  assert.match(element('#imp-catalog-status').innerHTML, /HTTP 500 simulado/);
  assert.equal(typeof element('#imp-catalog-retry').handlers.click, 'function',
    'El error debe ofrecer recuperación local sin perder el formulario');
  element('#imp-catalog-retry').handlers.click();
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(element('#imp-catalog-status').textContent, '',
    'Una consulta exitosa elimina el error anterior');
  assert.match(element('#wiz').innerHTML, /Arrastra aquí un EPUB, DOCX o PDF/,
    'Reintentar no debe desmontar el selector de archivos');
  assert(db.calls.filter(c => c.fields === 'id,slug,title,cover_path').length >= 2,
    'Reintentar debe repetir la consulta que falló');
} finally {
  console.warn = warnings;
  delete globalThis.location;
}
console.log('Estudio Importar: carga inmediata, catálogo liviano, HTTP 500 y reintento OK.');
