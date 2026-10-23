// Contrato de seguridad: el Patreon de la plataforma solo reconoce apoyo.
// Ejecutar en CI sin conectarse a cuentas ni tocar Supabase de producción.
import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';
const read = p => readFileSync(new URL('../' + p, import.meta.url), 'utf8');

const sql = read('supabase/migrations/20261118_download_links_patreon.sql');
const studio = read('src/studio.js');
const ui = read('src/ui.js');
const app = read('src/app.js');
const patreon = read('src/patreon.js');
const worker = read('workers/patreon/src/index.js');

const includes = (body, needle, description) =>
  assert.ok(body.includes(needle), description);
const excludes = (body, needle, description) =>
  assert.ok(!body.includes(needle), description);

includes(sql, 'update public.download_links set donor_only = false', 'Se deben liberar los enlaces de donadores antiguos');
includes(sql, 'check (donor_only = false)', 'No se permiten nuevos bloqueos por donaciones generales');
includes(sql, 'create or replace function public.series_downloads(p_series uuid)', 'Los lectores antiguos también deben respetar el nuevo contrato');
includes(sql, 'create or replace function public.series_downloads_v2(p_series uuid)', 'La ficha debe recibir el estado de Patreon del equipo');
includes(sql, 'create or replace function public.download_open(p_id bigint)', 'Se debe comprobar acceso al abrir un enlace');
includes(sql, 'private.is_team_patron(owner_team)', 'La descarga exclusiva comprueba la membresía del equipo');
includes(sql, 'private.is_team_patron(s.team_id)', 'El listado comprueba la membresía del equipo');
includes(sql, 'create or replace function private.chapter_readable(c uuid)', 'Se debe quitar el acceso anticipado de donadores globales');
includes(sql, 'drop policy if exists "epub read donors"', 'Se debe cerrar el permiso antiguo de EPUB');
excludes(sql, 'private.is_donor()', 'El Patreon de la plataforma no debe autorizar lecturas ni descargas');

const panelStart = studio.indexOf('async function renderDownloads(seriesId, target){');
const globalStart = studio.indexOf('async function downloads(){', panelStart);
const panelEnd = studio.indexOf('// ---------- Anuncios: tarjeta destacada', globalStart);
assert.ok(panelStart >= 0 && globalStart > panelStart && panelEnd > globalStart, 'No se pudo encontrar el panel de descargas compartido');
const downloads = studio.slice(panelStart, panelEnd);
includes(studio, "['descargas', 'Descargas']", 'La ficha de novela debe ofrecer pestaña Descargas');
includes(studio, "renderDownloads(s.id, app.querySelector('#wk-downloads'))", 'La pestaña debe abrir la obra seleccionada');
includes(downloads, ".eq('series_id', seriesId)", 'Las actualizaciones deben limitarse a la obra elegida');
includes(downloads, "const patreonDlReady = !patreonResult.error", 'No exponer exclusividad si la migración SQL no existe');
includes(downloads, "if (!validHttps(u))", 'No aceptar URLs inseguras');
excludes(downloads, 'value="donor"', 'No ofrecer bloqueo por donador general');
includes(downloads, 'Solo Patreon del equipo', 'El equipo conserva su bloqueo por enlace');
includes(downloads, 'donor_only: false', 'No escribir nunca enlaces privados para donadores generales');

includes(ui, 'series_downloads_v2', 'La ficha debe consultar el acceso del equipo');
excludes(ui.slice(ui.indexOf('const patronLink ='), ui.indexOf('const read = new Set', ui.indexOf('const patronLink ='))), "'/apoyar'", 'Los candados del equipo no deben enlazar al Patreon general');
includes(app, 'Patreon de El Obi del Lector · apoyo voluntario', 'Separar la campaña general en Apoyar');
includes(app, 'Patreon de los equipos traductores', 'Mantener campaña de equipos');
includes(patreon, 'no concede permisos de lectura o descarga', 'Explicación transparente para el mecenas general');

excludes(worker, "'profiles?'", 'El webhook antiguo no debe modificar perfiles');
excludes(worker, 'donor_tier:', 'El webhook antiguo no debe asignar nivel de donador');
excludes(worker, 'donor_until:', 'El webhook antiguo no debe prolongar acceso temporal');

console.log('Patreon: plataforma solo apoyo · contenido exclusivo solo por equipo · verificación estática OK');
