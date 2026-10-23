// Regresión de la fase 1 del perfil público de equipos.
// Se ejecuta sin credenciales, navegador ni acceso a la base de datos.
import assert from 'node:assert/strict';
import { normalize, render, followBtn, exportTheme } from '../src/teampage.js';

const enc = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const ctx = { esc: enc, media: value => value || '', sim: '' };
const sample = {
  t: { id: 'group-test', slug: 'grupo-prueba', name: 'Grupo Prueba', color: '#f2c230', bio: 'Traducimos con cuidado.', langs: ['ja'],
    settings: { website: 'https://example.com' } },
  works: [{ id: 'work-test', slug: 'obra-prueba', title: 'Obra de prueba', short: 'Obra de prueba', chapters: [{ count: 10 }], translation_status: 'active' }],
  mem: [{ role: 'owner', profiles: { username: 'Editora' }, team_roles: { name: 'Líder' } }],
  next: { at: '2026-11-02T12:00:00Z', series: { slug: 'obra-prueba', title: 'Obra de prueba' }, label: 'Volumen 2' }
};
const make = (design = {}, data = sample) => render(data, design, ctx);

const legacy = normalize(null);
assert.equal(legacy.layout.header, 'original');
assert.equal(legacy.layout.stats, 'secciones');
assert.equal(legacy.layout.nav, true);
assert.equal(legacy.template, 'revista');
assert.equal(normalize({ layout: { header: 'invalido', align: 'raro', stats: 'otra' } }).layout.header, 'original');
assert.equal(normalize({ layout: { header: 'invalido', align: 'raro', stats: 'otra' } }).layout.stats, 'secciones');
assert.equal(normalize({ layout: { showBio: false, navWorks: false } }).layout.showBio, false);

const classic = make();
assert.match(classic, /id="grupo-inicio"/);
assert.match(classic, /class="tp2-tabs"/);
assert.match(classic, /href="#grupo-obras"/);
assert.match(classic, /href="#grupo-lanzamientos"/);
assert.match(classic, /href="#grupo-integrantes"/);
assert.match(classic, /data-follow-count/);
assert.match(classic, /Traducimos con cuidado/);
assert.match(classic, /https:\/\/example\.com/);

for (const template of ['revista', 'clasica', 'editorial']) {
  const html = make({ template, layout: { header: 'compacto', align: 'centro', stats: 'cabecera', followLabel: 'grupo' } });
  assert.match(html, /data-hero="compacto"/);
  assert.match(html, /data-align="centro"/);
  assert.match(html, /data-follow-label="grupo"/);
  assert.equal((html.match(/class="tp2-summary"/g) || []).length, 1);
  assert.equal((html.match(/data-follow-count/g) || []).length, 1);
}

const withoutNav = make({ layout: { nav: false, showBio: false, showLinks: false, showMeta: false } });
assert.doesNotMatch(withoutNav, /class="tp2-tabs"/);
assert.doesNotMatch(withoutNav, /Traducimos con cuidado/);
assert.doesNotMatch(withoutNav, /https:\/\/example\.com/);
assert.match(withoutNav, /class="tp2-fslot"/);

const hidden = make({ hidden: ['works', 'members', 'next'] });
assert.doesNotMatch(hidden, /href="#grupo-obras"/);
assert.doesNotMatch(hidden, /href="#grupo-lanzamientos"/);
assert.doesNotMatch(hidden, /href="#grupo-integrantes"/);

const noContent = make({}, { ...sample, works: [], mem: [], next: null });
assert.doesNotMatch(noContent, /class="tp2-tabs"/);
assert.match(followBtn(false, 12, 'publicaciones'), /Seguir publicaciones/);
assert.match(followBtn(true, 12, 'grupo'), /Siguiendo/);

const exported = JSON.parse(exportTheme('Prueba', normalize({ layout: { header: 'compacto', nav: false }, accent: '#bb3322' })));
assert.equal(exported.design.layout, undefined);
assert.equal(exported.design.accent, '#bb3322');

console.log('Perfil grupal Fase 1: normalización, 3 plantillas, navegación, métricas, privacidad visual y temas OK');
