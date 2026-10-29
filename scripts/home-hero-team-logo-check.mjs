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
assert(ui.includes('const hasTeamImage = !!s.teams?.avatar_path') && ui.includes('const teamLogo = s.teams?.slug'),
 'El equipo con perfil debe mostrar logo o nombre según la existencia de imagen');
assert(ui.includes("hasTeamImage ? '' : ' is-text'") && ui.includes(': `<span>${esc(s.teams.name ||'),
 'El PNG y el texto deben ser mutuamente excluyentes');
assert(ui.includes('img.replaceWith(fallback)') && ui.includes("anchor.classList.add('is-text')"),
 'Una imagen rota debe reemplazarse por texto sin cambiar el hipervínculo');
assert(ui.includes('class="ob-hero-team-logo${hasTeamImage') && ui.includes('href="/equipo/${encodeURIComponent(s.teams.slug)}"'),
 'Imagen y texto deben enlazar al mismo perfil del equipo');
assert(ui.includes('.ob-hero-team-logo.is-text span{') && !ui.includes('.ob-hero-team-logo span{display:none}'),
 'El texto debe ser visible incluso en 320 píxeles');
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
assert(ui.includes('@media(max-width:380px)') && ui.includes('width:64px'),
 'En móvil estrecho la imagen debe medir 64 px');
assert(ui.includes('width:clamp(82px,7vw,100px)') && ui.includes('width:80px'),
 'El logo debe mantenerse compacto en escritorio y legible en móvil');
assert(ui.includes('@media(min-width:601px) and (max-width:1100px)') && ui.includes('width:clamp(78px,8vw,94px)'),
 'Mantener un tamaño de logo compacto en tablets');
assert(ui.includes('aspect-ratio:1;object-fit:contain') && ui.includes('width="140" height="140"'),
 'No deformar la imagen y reservar dimensiones al renderizarla');
assert(ui.includes(':not(.ob-hero-team-logo)'),
 'Ir al perfil del equipo no debe contar falsamente como clic en la novela');
for(const token of ['320,390,768,1024,1440,1873','logo se superpone','PNG solapa anuncio','texto y aviso',
  'ob-hero-team-logo','ob-utag-hero','ob-hero-rank']) {
  assert(qa.includes(token),'La QA responsive debe cubrir: '+token);
}
assert(ui.includes('.ob-hero{align-items:start;column-gap:clamp(28px,3vw,48px);row-gap:clamp(20px,2.6vw,32px)'),
 'La portada debe alinearse con el anuncio y conservar huecos moderados en escritorio/móvil');
assert(ui.includes('.ob-hero .ob-hero-head+h1{margin-top:clamp(16px,1.5vw,20px)}'),
 'El título debe mantener una separación mínima del anuncio y ranking');
assert(ui.includes('.ob-hero .ob-txt h1[data-len=xl]{font-size:clamp(26px,2.8vw,38px)}'),
 'Los títulos editoriales muy largos no deben dominar el carrusel');
// Inicio compacto: dejar toda la descripción en el DOM, y reservar los controles.
assert(ui.includes('class="ob-hero-copy"') && ui.includes('class="ob-hero-footer"'),
 'Separar contenido descriptivo y acciones para evitar que desaparezcan al abreviar textos');
assert(ui.includes('grid-template-columns:minmax(180px,min(27vw,300px)) minmax(0,1fr)') && ui.includes('max-width:300px'),
 'El carrusel de escritorio debe mantener dos columnas y una portada acotada');
assert(ui.includes('height:auto;min-height:0;max-height:none') && ui.includes('@media(max-width:700px)'),
 'El móvil no debe aplicar una altura fija que oculte controles');
assert(ui.includes('-webkit-line-clamp:unset') && ui.includes('-webkit-line-clamp:2'),
 'Mostrar títulos íntegros y limitar solo la descripción editorial breve');
assert(ui.includes('title="${esc(s.title +'),
 'Conservar el título completo disponible al mantener el cursor sobre la novela');
assert(ui.includes('.ob-hero .ob-hero-footer{flex:none;margin-top:auto'),
 'Los botones deben mantener su espacio incluso con titulares extensos');
assert(qa.includes('el carrusel vuelve a altura máxima fija') && qa.includes('footer invade controles') && qa.includes('controles fuera de hero'),
 'La QA responsive debe impedir altura fija, recorte y superposición de controles');
// En colaboraciones, agrandar solamente el PNG del propietario, no los
// colaboradores ni el fallback con el nombre del equipo.
assert(ui.includes('@media(min-width:1101px)') &&
 ui.includes('width:clamp(170px,10.2vw,190px)') &&
 ui.includes('padding-inline-end:clamp(186px,11.2vw,206px)') &&
 ui.includes('.ob-hero .ob-hero-copy:has(.ob-hero-team-logo:not(.is-text))') &&
 ui.includes('position:absolute;'),
 'Ampliar solo el PNG propietario a 170–190 px en escritorio sin empujar el título');
assert(ui.includes('.ob-hero .ob-hero-team-logo.is-text{width:clamp(82px,7vw,100px)'),
 'Conservar el tamaño de respaldo textual en escritorio');
assert(ui.includes("s.publicCredits?.some(c => !c.is_primary)") &&
 ui.includes("creditsHTML({publicCredits:s.publicCredits.filter(c=>!c.is_primary)}, {esc,media,mode:'hero'})"),
 'Mantener los colaboradores aceptados separados del PNG del equipo principal');
assert(ui.includes('.ob-hero .ob-hero-partners{display:block;max-height:30px;overflow:hidden}') &&
 ui.includes('.ob-hero .ob-hero-partners img{max-height:26px;max-width:100px;object-fit:contain}'),
 'No alterar el tamaño ni la disposición de los colaboradores');
assert(qa.includes('el fallback textual no debe crecer con el PNG de escritorio'),
 'La QA de escritorio debe diferenciar imagen principal y nombre de respaldo');
assert(announcement.includes('chooseActiveEditorial'), 'El selector de anuncios sigue disponible');
console.log('✓ Identidad del equipo: logo o texto excluyentes, mismo perfil y avisos intactos.');
