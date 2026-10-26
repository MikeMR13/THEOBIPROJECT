// Contratos de velocidad y privacidad del primer render de Inicio.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const src = readFileSync(new URL('../src/ui.js', import.meta.url), 'utf8');
const start=src.indexOf('  async function home(){');
const end=src.indexOf('  function heroSlide(',start);
assert(start>=0 && end>start, 'No se encontró el cuerpo de Inicio');
const home=src.slice(start,end);
const hero=src.slice(end,end+11000);
const at=(token)=>{const i=home.indexOf(token);assert(i>=0,'No se encontró: '+token);return i};
const load=at('const feedRequest = feed();');
const credits=at('const creditsRequest = Promise.all([feedRequest, Promise.resolve(adultRequest)])');
const volumes=at("sb.from('volumes').select(");
const waits=at('const [FD, pr, VR] = await Promise.all([');
assert(load<credits && credits<waits && waits<volumes,
 'Los créditos deben comenzar a solicitarse antes de terminar de cargar volúmenes');
assert.match(home,/visible = \(fd\?\.series \|\| \[\]\)\.filter\(s =>[\s\S]*?\(!s\.adult \|\| adult\?\.data === true\) && !hidS\(s\)/,
 'Filtrar títulos +18 y preferencias antes de solicitar logos/créditos');
assert.match(home,/await creditsRequest;/,'Conservar los créditos antes de dibujar sus logos');
assert.doesNotMatch(home,/await attachPublicCredits\(sb, list\)/,
 'No añadir una llamada secuencial de créditos después de volúmenes');
assert.doesNotMatch(home,/s\.cover_path\s*=\s*v\.cover_path/,
 'No reemplazar la portada de obra por un volumen');
assert.doesNotMatch(home,/s\.cover_thumb_path\s*=\s*null/,
 'No descartar miniaturas WebP existentes');
assert.match(hero,/v\?\.cover_path \|\| s\.cover_path/,
 'Conservar portada propia del volumen en hero y sus lanzamientos');
assert.match(home,/coverUrl = v\?\.cover_path[\s\S]*? : thumb\(s\)/,
 'Conservar portada específica de novedades y miniatura de obra en fallback');
assert.match(home,/loading="lazy" decoding="async"/,
 'No descargar todas las miniaturas fuera de pantalla inmediatamente');
console.log('OK: Inicio solicita créditos en paralelo, filtra +18 y conserva miniaturas/portadas editoriales.');
