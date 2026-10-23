// Contrato de integración: logo del equipo en TODAS las fichas del hero,
// sin afectar el aviso editorial de publicación/programación ni la lectura.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const sql=read('supabase/migrations/20261023_home_feed_team_avatar_for_hero.sql');
const ui=read('src/ui.js'),qa=read('scripts/home-hero-layout-check.mjs');
const announcement=read('src/editorial-announcements.js');
assert(sql.includes('x.team_id') && sql.includes("'avatar_path', t.avatar_path"),
 'El feed optimizado debe entregar el equipo propietario y su logo');
assert(sql.includes('update private.home_snapshot') && sql.includes('private.build_home()'),
 'El snapshot no puede seguir sin el logo después de migrar');
assert(ui.includes('teams(name,slug,color,avatar_path)'),
 'Mantener la compatibilidad del feed secundario');
assert(ui.includes('s.teams?.avatar_path && s.teams?.slug'),
 'Solo presentar logo si existe y el equipo tiene página');
assert(ui.includes('const teamLogo = ') && ui.includes('${teamLogo}</div>'),
 'Presentar el logo dentro de la cabecera en todas las categorías');
assert(ui.includes('class="ob-hero-meta"') && ui.includes('class="ob-hero-head"'),
 'Avisos y logo deben ocupar columnas independientes');
assert(ui.includes("heroTag(s)}") && ui.includes("chooseActiveEditorial(s?.theme)"),
 'El aviso de publicar o programar debe seguir activo sin modificación');
assert(ui.includes("pre ? '' : heroTag(s)"),
 'En preestrenos no debe mostrarse prematuramente un aviso editorial de publicación');
assert(ui.includes('ob-hero-rank') && ui.includes('top[s.id]'),
 'El ranking debe conservarse');
assert(ui.includes('.ob-hero-team-logo img{') && ui.includes('object-fit:contain'),
 'No deformar ni recortar PNG transparentes');
assert(ui.includes('@media(max-width:380px)') && ui.includes('width:48px'),
 'En móvil estrecho la insignia debe reducirse');
assert(ui.includes(':not(.ob-hero-team-logo)'),
 'Ir al perfil del equipo no debe contar falsamente como clic en la novela');
for(const token of ['320,390,768,1024,1440','logo se superpone','PNG solapa anuncio',
  'ob-hero-team-logo','ob-utag-hero','ob-hero-rank']) {
  assert(qa.includes(token),'La QA responsive debe cubrir: '+token);
}
assert(announcement.includes('chooseActiveEditorial'), 'El selector de anuncios sigue disponible');
console.log('✓ Logo del equipo en hero: avisos de publicar/programar independientes, ranking y móvil cubiertos.');
