// Pruebas sin credenciales ni red: resultados, selección explícita y bloqueo de duplicados.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { normalizeCollaboratorQuery, unavailableCollaboratorReason, rankCollaboratorTeams, initCollaborationTeamPicker, COLLABORATION_STATUS } from '../src/studio-collaboration-picker.js';

// Los valores que envía Estudio deben coincidir con collaborations_status_check.
assert.deepEqual(Object.values(COLLABORATION_STATUS), ['pending', 'active', 'declined', 'revoked']);
const accessSql = readFileSync(new URL('../sql/collaborations-active-volume-access.sql', import.meta.url), 'utf8');
assert.match(accessSql, /CREATE OR REPLACE FUNCTION private\.collab_team\(s uuid\)/, 'Debe conservarse la función de permisos de volúmenes');
assert.match(accessSql, /c\.status = 'active'/, 'El acceso a volúmenes debe reconocer el estado vigente active');
assert.match(accessSql, /m\.user_id = auth\.uid\(\)/, 'La función de acceso debe limitarse a integrantes del equipo invitado');
assert.match(accessSql, /SECURITY DEFINER\s+SET search_path TO ''/, 'Preservar la definición protegida de la función');
assert.match(accessSql, /CREATE POLICY "collab decide"[\s\S]*?private\.can_edit_team\(invited_team\)/, 'Solo el equipo invitado debe aceptar o rechazar');
assert.match(accessSql, /CREATE POLICY "collab revoke sender"[\s\S]*?private\.can_edit_team\(inviter_team\)/, 'El remitente solo puede revocar');
assert.match(accessSql, /status IN \('active', 'declined'\)/, 'Las decisiones solo pueden generar estados válidos');
assert.match(accessSql, /status = 'revoked'/, 'La revocación debe tener un estado propio');
assert.match(accessSql, /REVOKE UPDATE, DELETE, TRUNCATE ON public\.collaborations FROM anon, authenticated/, 'Revocar privilegios generales que permiten reasignar equipos u omitir RLS');
assert.match(accessSql, /GRANT UPDATE \(status\) ON public\.collaborations TO authenticated/, 'Restringir las actualizaciones del cliente al estado de la invitación');
const studioSource = readFileSync(new URL('../src/studio.js', import.meta.url), 'utf8');
assert.match(studioSource, /\.eq\('status', COLLABORATION_STATUS\.active\)/, 'Las colaboraciones activas deben aparecer en Mis obras');
assert.match(studioSource, /response = b\.dataset\.acc \? COLLABORATION_STATUS\.active : COLLABORATION_STATUS\.declined/, 'Aceptar y rechazar deben usar estados válidos');
assert.match(studioSource, /\.eq\('status', COLLABORATION_STATUS\.pending\)\.select\('id'\)\.maybeSingle\(\)/, 'No se deben confirmar respuestas sin un cambio en la base');
assert.doesNotMatch(studioSource, /\.eq\('status', 'accepted'\)|status: b\.dataset\.acc \? 'accepted' : 'rejected'/, 'No se deben guardar estados rechazados por el CHECK');

assert.equal(normalizeCollaboratorQuery(' @Equipo%_\\ '), 'Equipo');
assert.equal(normalizeCollaboratorQuery('  @nombre con espacios '), 'nombre con espacios');
const teams = [
  { id: 't-own', slug: 'propio', name: 'Propio' },
  { id: 't-existing', slug: 'otra-obra', name: 'Otra obra' },
  { id: 't-new', slug: 'otro-grupo', name: 'Otro Grupo', color: '#8cc3f2' },
  { id: 't-other', slug: 'grupo-otro', name: 'Grupo Otro' }
];
assert.equal(unavailableCollaboratorReason(teams[0], 't-own', []), 'Es tu propio equipo');
assert.equal(unavailableCollaboratorReason(teams[1], 't-own', [{ invited_team: 't-existing', status: 'pending' }]), 'Invitación pendiente');
assert.equal(unavailableCollaboratorReason(teams[1], 't-own', [{ invited_team: 't-existing', status: 'active' }]), 'Ya colabora');
assert.equal(unavailableCollaboratorReason(teams[1], 't-own', [{ invited_team: 't-existing', status: 'revoked' }]), 'Invitación revocada');
assert.deepEqual(rankCollaboratorTeams([teams[3], teams[2], teams[2]], 'otro').map(t => t.id), ['t-new', 't-other']);

class Element {
  constructor(tag = 'div') {
    this.tagName = tag.toUpperCase();
    this.children = []; this.listeners = {}; this.attributes = {}; this.style = {};
    this.value = ''; this.disabled = false; this.hidden = true;
    this.isConnected = true; this.textContent = '';
  }
  addEventListener(type, cb) { (this.listeners[type] ||= []).push(cb); }
  async fire(type, event = {}) { for (const fn of this.listeners[type] || []) await fn({ preventDefault() {}, ...event }); }
  setAttribute(key, value) { this.attributes[key] = value; }
  append(...items) { for (const el of items) { el.parent = this; this.children.push(el); } }
  replaceChildren(...items) { this.children = []; this.append(...items); }
  contains(el) { return el === this || this.children.some(child => child.contains(el)); }
  closest(selector) { if (selector === '.wk-inv-search') return this.root; return null; }
  querySelectorAll(selector) {
    const found = [];
    const walk = item => {
      for (const child of item.children) {
        if (child.tagName === 'BUTTON' && selector === 'button:not(:disabled)' && !child.disabled) found.push(child);
        walk(child);
      }
    };
    walk(this); return found;
  }
  querySelector(selector) { return this.querySelectorAll(selector)[0] || null; }
  focus() { globalThis.document.activeElement = this; }
}
globalThis.document = { activeElement: null, createElement: tag => new Element(tag) };

const root = new Element();
const input = new Element('input');
const list = new Element('div');
const status = new Element('small');
const invite = new Element('button');
input.root = root;
root.append(input, list, status, invite);
const sent = [], notices = [], errors = [];
const existing = [{ invited_team: 't-existing', status: 'pending' }];
const serverExisting = [];
const sb = {
  from(table) {
    const query = { conditions: {}, col: '', pattern: '' };
    const builder = {
      select() { return builder; },
      ilike(col, value) { query.col = col; query.pattern = value.toLocaleLowerCase('es').replaceAll('%', ''); return builder; },
      eq(key, value) { query.conditions[key] = value; return builder; },
      limit() {
        if (table === 'teams') return Promise.resolve({ data: teams.filter(t => String(t[query.col] || '').toLocaleLowerCase('es').includes(query.pattern)) });
        if (table === 'collaborations') return Promise.resolve({ data: serverExisting.filter(c => c.series_id === query.conditions.series_id && c.invited_team === query.conditions.invited_team) });
        throw new Error('Tabla inesperada: ' + table);
      },
      insert(row) {
        assert.equal(table, 'collaborations');
        sent.push(row); serverExisting.push(row);
        return Promise.resolve({ error: null });
      }
    };
    return builder;
  }
};
let refreshes = 0;
initCollaborationTeamPicker({
  sb, input, list, status, invite, ownTeamId: 't-own', seriesId: 'series-1',
  collaborations: existing, media: path => '/images/' + path,
  toast: msg => notices.push(msg),
  busy: async (_button, fn) => { try { await fn(); } catch (e) { errors.push(e.message); } },
  onSuccess: () => { refreshes++; }
});
assert.equal(invite.disabled, true, 'Sin seleccionar un resultado no puede enviarse invitación');
input.value = 'otr';
await input.fire('input');
await new Promise(resolve => setTimeout(resolve, 350));
assert.equal(list.hidden, false);
assert.equal(list.children.length, 3, 'Combina nombre y alias sin duplicar resultados');
assert.equal(list.children.filter(x => x.disabled).length, 1, 'La invitación ya existente no se puede seleccionar');
const eligible = list.children.find(x => !x.disabled && x.children[1].children[1].textContent === '@otro-grupo');
assert(eligible, 'Debe mostrarse el alias correcto');
await eligible.fire('click');
assert.equal(input.value, '@otro-grupo');
assert.equal(invite.disabled, false);
assert.equal(list.hidden, true);
input.value = 'cambio';
await input.fire('input');
assert.equal(invite.disabled, true, 'Editar la búsqueda invalida la selección anterior');
input.value = '@otro';
await input.fire('input');
await new Promise(resolve => setTimeout(resolve, 350));
const chosen = list.children.find(x => !x.disabled && x.children[1].children[1].textContent === '@otro-grupo');
await chosen.fire('click');
await invite.fire('click');
assert.equal(sent.length, 1);
assert.deepEqual(sent[0], { series_id: 'series-1', inviter_team: 't-own', invited_team: 't-new', status: COLLABORATION_STATUS.pending });
assert.equal(refreshes, 1);
assert.match(notices[0], /Otro Grupo/);
await invite.fire('click');
assert.equal(sent.length, 1, 'La comprobación en servidor también bloquea los duplicados');
assert.match(errors[0], /Ya existe una invitación/);
assert.equal(invite.disabled, true);
console.log('studio collaboration picker: selección, búsqueda y duplicados OK');
