// Contrato de Cuenta: datos privados, OAuth de Google y Patreon en el mismo carnet.
// Prueba con datos sintéticos; no consulta cuentas ni Supabase de producción.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { accountBox } from '../src/patreon.js';

const read = file => readFileSync(new URL('../' + file, import.meta.url), 'utf8');
const profile = read('src/profile.js');
const patreon = read('src/patreon.js');
const callback = read('supabase/functions/patreon/index.ts');
const account = profile.slice(profile.indexOf("  if (tab === 'cuenta')"), profile.indexOf("    return;\n  }", profile.indexOf("  if (tab === 'cuenta')")));
assert.ok(account.length > 2500, 'No se encontró Cuenta');
for (const card of ['Datos de tu cuenta', 'Métodos de acceso', 'Sesiones y dispositivos', 'Privacidad y datos']) {
  assert.ok(account.includes(card), 'Falta tarjeta: ' + card);
}
for (const field of ['id="fu"', 'id="fe"', 'id="pw"', 'id="so"', 'id="pt-acc"', 'id="g-un"']) {
  assert.ok(account.includes(field), 'Falta control de cuenta: ' + field);
}
assert.ok(account.includes('editPanel(') && account.includes('<details'), 'Las ediciones deben ser desplegables');
assert.ok(account.includes('hasPw && !!user.email_confirmed_at'), 'No desvincular Google sin identidad y correo verificado');
assert.ok(account.includes('lockU ?'), 'Respetar bloqueo de cambio de nombre');
assert.ok(account.includes('user.new_email'), 'Mostrar estado de cambio de correo pendiente');
assert.ok(profile.includes('.pf-account-grid{'), 'Faltan estilos de panel unificado');
assert.ok(profile.includes('@media(max-width:1050px){.pf-account-grid'), 'El panel debe adaptarse a pantallas pequeñas');
assert.ok(patreon.includes('CONECTADO A ESTE CARNET') && patreon.includes('SIN VINCULAR'), 'Patreon debe mostrar los dos estados');
const link = callback.slice(callback.indexOf("    if (kind === 'link') {"), callback.indexOf('    // login / registro'));
assert.ok(link.includes('S.user_id') && link.includes(".eq('id', S.user_id).select('id').maybeSingle()"), 'El OAuth debe actualizar únicamente al lector autenticado y verificar el resultado');
assert.ok(link.includes("owner.id !== S.user_id"), 'No apropiarse de una vinculación de otro lector');
assert.ok(!link.includes('admin.createUser'), 'Vincular Patreon no debe crear otro lector');

globalThis.location = { search: '', pathname: '/preferencias' };
globalThis.history = { replaceState() {} };
const makeEl = () => ({ innerHTML: '', controls: new Map(), querySelector(selector) {
  if (!this.controls.has(selector)) this.controls.set(selector, {});
  return this.controls.get(selector);
} });
const mkSb = linked => ({
  auth: { getUser: async () => ({ data: { user: { id: 'lector-qa' } } }) },
  rpc: async () => ({ data: { patreon_user_id: linked ? 'patreon-qa' : null, patron_wall: false } }),
  from: () => ({ select() { return this; }, eq() { return this; }, then(resolve, reject) {
    return Promise.resolve({ data: [] }).then(resolve, reject);
  } })
});
for (const linked of [false, true]) {
  const el = makeEl();
  await accountBox(el, { sb: mkSb(linked), url: 'https://test.invalid', esc: v => String(v), toast() {} });
  assert.ok(el.innerHTML.includes(linked ? 'CONECTADO A ESTE CARNET' : 'SIN VINCULAR'), 'Estado incorrecto de Patreon');
  if (!linked) assert.ok(el.innerHTML.includes('Vincular Patreon a mi cuenta'), 'Acción de vinculación ausente');
  if (linked) assert.ok(el.innerHTML.includes('puedes entrar con Patreon') || el.innerHTML.includes('Puedes entrar con Patreon'), 'Vínculo de acceso no explicado');
}
console.log('Cuenta unificada: tarjetas, estado Patreon, guardas OAuth y pruebas sintéticas OK');
