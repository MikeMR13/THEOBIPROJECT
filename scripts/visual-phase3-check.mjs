// Contratos de regresión de fase editorial 3. No toca cuentas ni servicios externos.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { normalize, vars, textContrast, THEMES } from '../src/teampage.js';
const ui = readFileSync('src/ui.js', 'utf8');
const studio = readFileSync('src/studio.css', 'utf8');
const teams = readFileSync('src/teampage.js', 'utf8');
const reader = readFileSync('src/styles.css', 'utf8');
const requireSource = (source, marker, label) => assert(source.includes(marker), 'Regresión: ' + label);

// Nunca se sustituye Inicio por una pantalla estática.
for (const [mark, label] of [
  ['heroSlide(feat', 'carrusel destacado dinámico'],
  ['.ob-car{', 'carruseles secundarios'],
  ['bindCars(app)', 'vinculación de carruseles'],
  ["fill('ob-s-ann'", 'anuncios de equipos'],
  ['.ob-ann{', 'tarjetas de anuncios'],
  ['.ob-hero{', 'presentación destacada original'],
  ["const book = (s, sub, slim)", 'cintas editorial de tarjetas'],
  ["s.cover_path ? 'has-art' : 'no-art'", 'diferenciación de ilustraciones y portadas de respaldo'],
  ["s.cover_path ? '' : esc(s.short || s.title)", 'título en portadas sin imagen'],
  ['.ui-fc{', 'vista de catálogo tipo fichero'],
  ['.ui-sh{', 'ficha de serie'],
  ['.ui-vol{', 'volúmenes de la ficha']
]) requireSource(ui, mark, label);
// El usuario retiró la barra textual repetitiva: el hero y el listado de
// lanzamientos siguen vivos, pero la cinta no debe reaparecer.
for (const legacy of ['ob-tick', 'ob-track', 'obTicker', 'tickerNotice'])
  assert(!ui.includes(legacy),'Regresión: volvió la cinta de novedades ('+legacy+')');
requireSource(ui,'Nuevos volúmenes y capítulos','lanzamientos siguen disponibles');
requireSource(ui, ".ui-book.has-art .ui-obi", 'cinta obi reducida sobre ilustración');
requireSource(ui, ".ui-book.no-art .ui-obi", 'cinta obi completa sin ilustración');
requireSource(ui, ".ob-ann:hover,.ob-ann:focus-within", 'avisos refinados');
requireSource(studio, '.s2-work .cv', 'portadas de Studio');
requireSource(studio, '.s2-work:hover,.s2-work:focus-within', 'tarjetas de Studio');
requireSource(teams, 'data-cover=obi', 'estilo obi configurable del equipo');
requireSource(teams, '.tp2-logo img{width:100%;height:100%', 'logotipo del equipo contenido');
requireSource(teams, 'export function normalize(', 'configuración de diseño de equipos');
requireSource(reader, '.rd-team img{display:block;max-width:min(220px,60vw);max-height:64px;width:auto;height:auto;object-fit:contain}', 'logo lector intacto y proporciones conservadas');

const lum = h => [1,3,5].map(i=>parseInt(h.slice(i,i+2),16)/255).map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4).reduce((a,v,i)=>a+v*[.2126,.7152,.0722][i],0);
const ratio = (a,b) => { const [l,s]=[lum(a),lum(b)].sort((x,y)=>y-x); return (l+.05)/(s+.05); };
const value = (text,key) => { const m = new RegExp('--'+key+':(#[0-9a-fA-F]{6})').exec(text); assert(m, 'Falta color '+key); return m[1].toLowerCase(); };
const cases = [
  ...Object.values(THEMES).map(x=>normalize(x.d)),
  normalize({bg:'propio',accent:'#777777',custom:{bg:'#808080',sf:'#808080',fg:'#818181'}}),
  normalize({bg:'propio',accent:'#ffffff',custom:{bg:'#ffffff',sf:'#ffffff',fg:'#ffffff'}}),
  normalize({bg:'propio',accent:'#111111',custom:{bg:'#101010',sf:'#181818',fg:'#111111'}}),
  normalize({bg:'propio',accent:'#888888',custom:{bg:'#888888',sf:'#888888',fg:'#888888'}}),
];
for (const c of cases) {
  const css=vars(c), bg=value(css,'bg');
  for (const k of ['fg','mu','act','on']) {
    const backdrop=k==='on'?value(css,'ac'):bg;
    assert(ratio(value(css,k),backdrop)>=4.49,'Contraste '+k+' insuficiente con '+backdrop);
  }
}
const weak=normalize({bg:'propio',accent:'#888888',custom:{bg:'#888888',sf:'#888888',fg:'#888888'}});
assert(textContrast(weak)<4.5,'La alerta del editor debe seguir reflejando el valor guardado');
console.log('Fase visual 3: sin cinta duplicada; carruseles, avisos, portadas, obi, logos y contraste AA OK');
