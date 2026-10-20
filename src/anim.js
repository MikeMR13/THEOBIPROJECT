// Animaciones, partículas y temas de temporada de la página del equipo.
export const PARTS = { sakura: 'Pétalos de sakura', nieve: 'Nieve', chispas: 'Chispas doradas', hojas: 'Hojas de otoño', estrellas: 'Estrellas', burbujas: 'Burbujas', luciernagas: 'Luciérnagas', plumas: 'Plumas', mariposas: 'Mariposas', lluvia: 'Lluvia', faroles: 'Faroles de papel', confeti: 'Confeti', corazones: 'Corazones', notas: 'Notas musicales', runas: 'Runas mágicas', jabon: 'Burbujas de jabón', polvo: 'Polvo de estrellas' };
export const ANIMS = { reveal: 'Aparición suave al hacer scroll', parallax: 'Banner con movimiento lento', tilt: 'Portadas que se inclinan', autoplay: 'Carrusel que avanza solo', countdown: 'Cuenta regresiva del próximo lanzamiento', particles: 'Partículas' };
export const INTENS = { sutil: 'Sutil', media: 'Media', alta: 'Alta' };
export const DENS = { pocas: 'Pocas', normal: 'Normal', muchas: 'Muchas' };
// Festividades: ventana [mes-día inicio, mes-día fin] o fechas por año (calendario lunar), paleta y partículas.
const Y = (o, before = 1, after = 1) => ({ years: o, before, after });
export const SEASONS = {
  halloween: { l: 'Halloween', g: 'occ', w: ['10-25', '10-31'], bg: 'oscuro', ac: '#ff7a1a', p: 'chispas', pat: 'ichimatsu', m: 'calabaza', c2: '#6b2fa0' },
  muertos: { l: 'Día de Muertos', g: 'occ', w: ['11-01', '11-02'], bg: 'oscuro', ac: '#ff9f1c', p: 'sakura', pat: 'shippo', m: 'cempasuchil', c2: '#d6287a' },
  navidad: { l: 'Navidad', g: 'occ', w: ['12-15', '12-26'], bg: 'oscuro', ac: '#d6283a', p: 'nieve', pat: 'asanoha', m: 'acebo', c2: '#2f7a3f' },
  anonuevo: { l: 'Año Nuevo', g: 'occ', w: ['12-30', '01-02'], bg: 'oscuro', ac: '#f2c230', p: 'confeti', pat: 'same', m: 'fuegos', c2: '#ffffff' },
  valentin: { l: 'San Valentín', g: 'occ', w: ['02-10', '02-14'], bg: 'claro', ac: '#d9466f', p: 'corazones', pat: 'shippo', m: 'corazon', c2: '#ffb3c7' },
  pascua: { l: 'Pascua', g: 'occ', d: Y({ 2026: '04-05', 2027: '03-28', 2028: '04-16', 2029: '04-01' }, 3, 1), bg: 'claro', ac: '#7fa84a', p: 'mariposas', pat: 'kanoko', m: 'huevo', c2: '#f2c230' },
  shogatsu: { l: 'Shōgatsu', g: 'jp', w: ['01-03', '01-07'], bg: 'claro', ac: '#c8102e', p: 'chispas', pat: 'seigaiha', m: 'sol', c2: '#f2c230' },
  setsubun: { l: 'Setsubun', g: 'jp', w: ['02-02', '02-04'], bg: 'claro', ac: '#b5482e', p: 'burbujas', pat: 'kikko', m: 'oni', c2: '#2f6fb5' },
  hinamatsuri: { l: 'Hinamatsuri', g: 'jp', w: ['02-28', '03-03'], bg: 'claro', ac: '#d7779a', p: 'sakura', pat: 'asanoha', m: 'sakura', c2: '#7fa84a' },
  hanami: { l: 'Hanami', g: 'jp', w: ['03-20', '04-15'], bg: 'claro', ac: '#e07a9c', p: 'sakura', pat: 'sakura', m: 'sakura', c2: '#6b4a3a' },
  tanabata: { l: 'Tanabata', g: 'jp', w: ['07-01', '07-07'], bg: 'oscuro', ac: '#7aa7ff', p: 'estrellas', pat: 'same', m: 'tanzaku', c2: '#f2c230' },
  obon: { l: 'Obon', g: 'jp', w: ['08-13', '08-16'], bg: 'oscuro', ac: '#f2a33a', p: 'faroles', pat: 'nami', m: 'farol', c2: '#c8321f' },
  tsukimi: { l: 'Tsukimi', g: 'jp', d: Y({ 2026: '09-25', 2027: '09-15', 2028: '10-03', 2029: '09-22' }, 2, 1), bg: 'oscuro', ac: '#e9d9a6', p: 'polvo', pat: 'nami', m: 'luna', c2: '#c9b98a' },
  shichigosan: { l: 'Shichi-Go-San', g: 'jp', w: ['11-13', '11-15'], bg: 'claro', ac: '#c8102e', p: 'confeti', pat: 'yagasuri', m: 'abanico', c2: '#f2c230' },
  seollal: { l: 'Seollal', g: 'kr', d: Y({ 2026: '02-17', 2027: '02-07', 2028: '01-26', 2029: '02-13' }), bg: 'claro', ac: '#2f6fb5', p: 'chispas', pat: 'shima', m: 'flor', c2: '#d6283a' },
  chuseok: { l: 'Chuseok', g: 'kr', d: Y({ 2026: '09-25', 2027: '09-15', 2028: '10-03', 2029: '09-22' }), bg: 'oscuro', ac: '#e9b44c', p: 'luciernagas', pat: 'nami', m: 'luna', c2: '#c4612b' },
  dano: { l: 'Dano', g: 'kr', d: Y({ 2026: '06-19', 2027: '06-09', 2028: '05-28', 2029: '06-16' }, 1, 0), bg: 'claro', ac: '#3f8f5a', p: 'hojas', pat: 'tatewaku', m: 'hoja', c2: '#f2c230' },
  buda: { l: 'Día de Buda', g: 'kr', d: Y({ 2026: '05-24', 2027: '05-13', 2028: '05-02', 2029: '05-20' }, 3, 0), bg: 'oscuro', ac: '#f29fb5', p: 'faroles', pat: 'shippo', m: 'loto', c2: '#f2c230' },
  pepero: { l: 'Pepero Day', g: 'kr', w: ['11-10', '11-11'], bg: 'claro', ac: '#b5651d', p: 'confeti', pat: 'shima', m: 'pepero', c2: '#f6e7d2' },
  primavera: { l: 'Primavera', g: 'est', bg: 'claro', ac: '#d9668a', p: 'sakura', pat: 'sakura', m: 'sakura', c2: '#7fa84a' },
  verano: { l: 'Verano', g: 'est', bg: 'claro', ac: '#2a9db5', p: 'burbujas', pat: 'nami', m: 'sol', c2: '#f2c230' },
  otono: { l: 'Otoño', g: 'est', bg: 'sepia', ac: '#c4612b', p: 'hojas', pat: 'washi', m: 'hoja', c2: '#8a3a1a' },
  invierno: { l: 'Invierno', g: 'est', bg: 'oscuro', ac: '#a9c7e8', p: 'nieve', pat: 'same', m: 'copo', c2: '#ffffff' }
};
export const SGROUPS = { occ: 'Occidentales y latinas', jp: 'Japonesas', kr: 'Coreanas', est: 'Estaciones del año' };
const md = d => String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
function inWindow(s, date){
  const k = md(date);
  if (s.w) { const [a, b] = s.w; return a <= b ? k >= a && k <= b : k >= a || k <= b; }
  const c = s.d?.years?.[date.getFullYear()]; if (!c) return false;
  const base = new Date(date.getFullYear() + '-' + c + 'T12:00'), diff = Math.round((new Date(date.getFullYear() + '-' + k + 'T12:00') - base) / 864e5);
  return diff >= -s.d.before && diff <= s.d.after;
}
function seasonOf(date, hemi){
  const k = md(date), n = k >= '03-20' && k <= '06-20' ? 'primavera' : k >= '06-21' && k <= '09-21' ? 'verano' : k >= '09-22' && k <= '12-20' ? 'otono' : 'invierno';
  return hemi === 'sur' ? { primavera: 'otono', verano: 'invierno', otono: 'primavera', invierno: 'verano' }[n] : n;
}
// Tema de temporada vigente: el manual gana; si no, la primera festividad automática vigente; si no, la estación (si está automática).
export function activeSeason(S, date = new Date()){
  if (!S) return null;
  if (S.manual && SEASONS[S.manual]) return S.manual;
  for (const [k, s] of Object.entries(SEASONS)) if (s.g !== 'est' && S.auto?.includes(k) && inWindow(s, date)) return k;
  const e = seasonOf(date, S.hemi);
  return S.auto?.includes(e) ? e : null;
}

const hex = c => [1, 3, 5].map(i => parseInt(c.slice(i, i + 2), 16));
const rgba = (c, a) => { const [r, g, b] = hex(c); return `rgba(${r},${g},${b},${a})`; };
function drawP(x, p, c){
  x.save(); x.translate(p.x, p.y); x.rotate(p.r); const s = p.s; x.globalAlpha = p.a;
  switch (p.t) {
    case 'sakura': x.fillStyle = c; x.beginPath(); x.moveTo(0, -s); x.bezierCurveTo(s, -s, s * .9, s * .6, 0, s); x.bezierCurveTo(-s * .9, s * .6, -s, -s, 0, -s); x.fill(); x.fillStyle = rgba('#ffffff', .25); x.fillRect(-s * .1, -s * .7, s * .2, s * .5); break;
    case 'hojas': x.fillStyle = c; x.beginPath(); x.ellipse(0, 0, s * .45, s, 0, 0, 7); x.fill(); x.strokeStyle = rgba('#000000', .25); x.lineWidth = .8; x.beginPath(); x.moveTo(0, -s); x.lineTo(0, s * 1.2); x.stroke(); break;
    case 'nieve': x.fillStyle = c; x.beginPath(); x.arc(0, 0, s * .45, 0, 7); x.fill(); break;
    case 'lluvia': x.strokeStyle = c; x.lineWidth = 1.2; x.beginPath(); x.moveTo(0, -s * 1.6); x.lineTo(0, s * 1.6); x.stroke(); break;
    case 'chispas': case 'polvo': { const g = x.createRadialGradient(0, 0, 0, 0, 0, s); g.addColorStop(0, c); g.addColorStop(1, rgba(c, 0)); x.fillStyle = g; x.beginPath(); x.arc(0, 0, s, 0, 7); x.fill(); break; }
    case 'luciernagas': { const g = x.createRadialGradient(0, 0, 0, 0, 0, s * 1.6); g.addColorStop(0, '#fffbd0'); g.addColorStop(.3, c); g.addColorStop(1, rgba(c, 0)); x.fillStyle = g; x.beginPath(); x.arc(0, 0, s * 1.6, 0, 7); x.fill(); break; }
    case 'estrellas': x.fillStyle = c; x.beginPath(); for (let i = 0; i < 10; i++) { const R = i % 2 ? s * .42 : s, a = i * Math.PI / 5 - Math.PI / 2; x.lineTo(Math.cos(a) * R, Math.sin(a) * R); } x.closePath(); x.fill(); break;
    case 'burbujas': case 'jabon': x.strokeStyle = c; x.lineWidth = 1.2; x.beginPath(); x.arc(0, 0, s, 0, 7); x.stroke(); if (p.t === 'jabon') { x.fillStyle = rgba(c, .12); x.fill(); } x.fillStyle = rgba('#ffffff', .5); x.beginPath(); x.arc(-s * .35, -s * .35, s * .18, 0, 7); x.fill(); break;
    case 'plumas': x.strokeStyle = c; x.lineWidth = 1; x.beginPath(); x.moveTo(0, -s * 1.4); x.quadraticCurveTo(s * .2, 0, 0, s * 1.4); x.stroke(); for (let i = -4; i <= 4; i++) { x.beginPath(); x.moveTo(0, i * s * .28); x.lineTo(s * .55, i * s * .28 - s * .3); x.moveTo(0, i * s * .28); x.lineTo(-s * .55, i * s * .28 - s * .3); x.stroke(); } break;
    case 'mariposas': { const f = Math.abs(Math.sin(p.ph)) * .8 + .2; x.fillStyle = c; [-1, 1].forEach(d => { x.beginPath(); x.ellipse(d * s * .5 * f, -s * .2, s * .55 * f, s * .7, d * .4, 0, 7); x.fill(); x.beginPath(); x.ellipse(d * s * .4 * f, s * .5, s * .35 * f, s * .45, -d * .4, 0, 7); x.fill(); }); break; }
    case 'faroles': x.fillStyle = c; x.beginPath(); x.ellipse(0, 0, s * .7, s, 0, 0, 7); x.fill(); x.fillStyle = rgba('#000000', .35); x.fillRect(-s * .4, -s * 1.1, s * .8, s * .2); x.fillRect(-s * .4, s * .9, s * .8, s * .2); x.globalAlpha = p.a * .35; x.fillStyle = '#fff3c0'; x.beginPath(); x.ellipse(0, 0, s * .35, s * .6, 0, 0, 7); x.fill(); break;
    case 'confeti': x.fillStyle = p.c2 || c; x.fillRect(-s * .5, -s * .25, s, s * .5); break;
    case 'corazones': x.fillStyle = c; x.beginPath(); x.moveTo(0, s * .8); x.bezierCurveTo(-s * 1.2, -s * .1, -s * .5, -s * 1.1, 0, -s * .35); x.bezierCurveTo(s * .5, -s * 1.1, s * 1.2, -s * .1, 0, s * .8); x.fill(); break;
    case 'notas': x.fillStyle = c; x.strokeStyle = c; x.lineWidth = 1.4; x.beginPath(); x.ellipse(0, s * .6, s * .45, s * .32, -.4, 0, 7); x.fill(); x.beginPath(); x.moveTo(s * .4, s * .5); x.lineTo(s * .4, -s); x.quadraticCurveTo(s * .9, -s * .7, s * .9, -s * .2); x.stroke(); break;
    case 'runas': x.strokeStyle = c; x.lineWidth = 1.3; x.shadowColor = c; x.shadowBlur = 6; x.beginPath(); ({ 0: () => { x.moveTo(0, -s); x.lineTo(0, s); x.moveTo(0, -s * .3); x.lineTo(s * .6, -s); }, 1: () => { x.moveTo(-s * .5, s); x.lineTo(0, -s); x.lineTo(s * .5, s); x.moveTo(-s * .3, s * .2); x.lineTo(s * .3, s * .2); }, 2: () => { x.moveTo(-s * .5, -s); x.lineTo(s * .5, s); x.moveTo(s * .5, -s); x.lineTo(-s * .5, s); x.moveTo(0, -s); x.lineTo(0, s); } })[p.v % 3](); x.stroke(); break;
  }
  x.restore();
}
const MOV = { nieve: [0, 1, .6], lluvia: [0, 5, 0], hojas: [.3, .9, 1.4], sakura: [.4, .8, 1.2], chispas: [0, -.5, .3], polvo: [0, -.15, .2], luciernagas: [0, 0, .5], estrellas: [0, .15, .2], burbujas: [0, -.7, .3], jabon: [0, -.6, .4], plumas: [.2, .5, 1], mariposas: [.5, -.2, .8], faroles: [0, -.35, .15], confeti: [0, 1.2, 1.5], corazones: [0, -.5, .3], notas: [.3, -.4, .4], runas: [0, -.25, .3] };
export function particles(host, o){
  const cv = document.createElement('canvas'); cv.className = 'tp2-pc'; cv.setAttribute('aria-hidden', 'true'); host.prepend(cv);
  const x = cv.getContext('2d'), mob = o.mobile, sp = { sutil: .5, media: 1, alta: 1.6 }[o.intensity] || 1;
  let W = 0, H = 0, P = [], raf = 0, last = 0, vis = true, dpr = Math.min(2, devicePixelRatio || 1);
  const n0 = { pocas: 16, normal: 36, muchas: 72 }[o.density] || 36, CONF = ['#f2c230', '#ff3fa4', '#4fc3f7', '#a9d18e', '#ff7a1a'];
  const mk = (top) => ({ t: o.type, x: Math.random() * W, y: top ? -20 : Math.random() * H, s: (4 + Math.random() * 6) * (o.type === 'faroles' ? 1.6 : 1), r: Math.random() * 6, vr: (Math.random() - .5) * .03, a: .45 + Math.random() * .45, ph: Math.random() * 6, v: (Math.random() * 3) | 0, c2: o.type === 'confeti' ? CONF[(Math.random() * 5) | 0] : null, k: .6 + Math.random() * .8 });
  const size = () => { const r = host.getBoundingClientRect(); W = r.width; H = o.where === 'page' ? innerHeight : r.height; cv.width = W * dpr; cv.height = H * dpr; x.setTransform(dpr, 0, 0, dpr, 0, 0); const n = Math.round(n0 * (mob ? .5 : 1) * Math.min(1.6, W / 1100 + .4)); while (P.length < n) P.push(mk()); P.length = n; };
  const [mx, my, sw] = MOV[o.type] || [0, .8, .6];
  // Sin bucle activo fuera de pantalla: al regresar se reactiva una sola RAF.
  let disposed = false;
  const pause = () => { if (raf) cancelAnimationFrame(raf); raf = 0; };
  const resume = () => { if (!disposed && vis && !document.hidden && !raf) { last = 0; raf = requestAnimationFrame(step); } };
  const step = t => { raf = 0; if (disposed || !vis || document.hidden) return;
    if (!(mob && t - last < 33)) {
      const dt = Math.min(3, (t - last) / 16.7 || 1); last = t; x.clearRect(0, 0, W, H);
      for (const p of P) { p.ph += .03 * dt; p.x += (mx + Math.sin(p.ph) * sw) * sp * p.k * dt; p.y += my * sp * p.k * dt; p.r += p.vr * dt;
        if (o.type === 'luciernagas' || o.type === 'estrellas' || o.type === 'polvo') p.a = .25 + Math.abs(Math.sin(p.ph * .7)) * .7;
        if (p.y > H + 30) Object.assign(p, mk(true)); if (p.y < -30) Object.assign(p, mk(), { y: H + 20 }); if (p.x > W + 30) p.x = -20; if (p.x < -30) p.x = W + 20;
        drawP(x, p, o.color); }
    }
    raf = requestAnimationFrame(step);
  };
  const ro = new ResizeObserver(size); ro.observe(host); size();
  const io = new IntersectionObserver(([e]) => { vis = e.isIntersecting; vis ? resume() : pause(); }); io.observe(host);
  const onVisibility = () => document.hidden ? pause() : resume();
  document.addEventListener('visibilitychange', onVisibility);
  resume();
  return () => { disposed = true; pause(); document.removeEventListener('visibilitychange', onVisibility); ro.disconnect(); io.disconnect(); cv.remove(); };
}

// Motivos de temporada (íconos dibujados en canvas): esquinas del banner, títulos y tarjetas.
const MOT = {
  calabaza(x, c, c2){ x.fillStyle = c; [-14, 0, 14].forEach((dx, i) => { x.beginPath(); x.ellipse(32 + dx * .8, 38, 13 - Math.abs(dx) * .1, 17, 0, 0, 7); x.fill(); }); x.fillStyle = '#3f6b2a'; x.fillRect(29, 14, 6, 9); x.fillStyle = '#1a1208'; x.beginPath(); x.moveTo(22, 34); x.lineTo(27, 29); x.lineTo(29, 35); x.fill(); x.beginPath(); x.moveTo(42, 34); x.lineTo(37, 29); x.lineTo(35, 35); x.fill(); x.beginPath(); x.moveTo(21, 43); x.quadraticCurveTo(32, 52, 43, 43); x.lineTo(39, 45); x.lineTo(36, 42); x.lineTo(32, 46); x.lineTo(28, 42); x.lineTo(25, 45); x.fill(); },
  cempasuchil(x, c, c2){ for (let r = 3; r >= 1; r--) for (let i = 0; i < 12; i++) { const a = i / 12 * 6.283 + r; x.fillStyle = r % 2 ? c : mix(c, '#ffffff', .25); x.beginPath(); x.ellipse(32 + Math.cos(a) * r * 6, 32 + Math.sin(a) * r * 6, 6, 4, a, 0, 7); x.fill(); } x.fillStyle = c2; x.beginPath(); x.arc(32, 32, 4, 0, 7); x.fill(); },
  acebo(x, c, c2){
    const leaf = rot => { x.save(); x.translate(32, 36); x.rotate(rot); x.fillStyle = c2; x.beginPath(); x.moveTo(0, 0); const N = 6;
      for (let k = 1; k <= N; k++) { const t = k / N, w = Math.sin(Math.PI * t) * 9; x.quadraticCurveTo(w * .55, -(t - .5 / N) * 26, w + (k < N ? 2.5 : 0), -t * 26); }
      for (let k = N - 1; k >= 0; k--) { const t = k / N, w = Math.sin(Math.PI * t) * 9; x.quadraticCurveTo(-w * .55 - 1, -(t + .5 / N) * 26, -(w + (k > 0 ? 2.5 : 0)), -t * 26); }
      x.closePath(); x.fill(); x.strokeStyle = 'rgba(0,0,0,.28)'; x.lineWidth = 1; x.beginPath(); x.moveTo(0, -2); x.lineTo(0, -24); x.stroke(); x.restore(); };
    leaf(-1.05); leaf(1.05); leaf(0);
    x.fillStyle = c; [[27, 38], [37, 38], [32, 31]].forEach(([px, py]) => { x.beginPath(); x.arc(px, py, 5, 0, 7); x.fill(); x.fillStyle = 'rgba(255,255,255,.55)'; x.beginPath(); x.arc(px - 1.6, py - 1.6, 1.4, 0, 7); x.fill(); x.fillStyle = c; });
  },
  fuegos(x, c, c2){ [[32, 30, 22, c], [16, 16, 10, c2], [50, 18, 9, c]].forEach(([cx, cy, r, col]) => { x.strokeStyle = col; x.lineWidth = 1.6; for (let i = 0; i < 14; i++) { const a = i / 14 * 6.283; x.beginPath(); x.moveTo(cx + Math.cos(a) * r * .3, cy + Math.sin(a) * r * .3); x.lineTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r); x.stroke(); x.fillStyle = col; x.beginPath(); x.arc(cx + Math.cos(a) * r, cy + Math.sin(a) * r, 1.4, 0, 7); x.fill(); } }); },
  corazon(x, c, c2){ const h = (cx, cy, s, col) => { x.fillStyle = col; x.beginPath(); x.moveTo(cx, cy + s * .8); x.bezierCurveTo(cx - s * 1.2, cy - s * .1, cx - s * .5, cy - s * 1.1, cx, cy - s * .35); x.bezierCurveTo(cx + s * .5, cy - s * 1.1, cx + s * 1.2, cy - s * .1, cx, cy + s * .8); x.fill(); }; h(28, 36, 18, c); h(46, 22, 9, c2); },
  huevo(x, c, c2){ x.save(); x.beginPath(); x.ellipse(32, 34, 16, 21, 0, 0, 7); x.clip(); x.fillStyle = c2; x.fillRect(0, 0, 64, 64); x.fillStyle = c; x.fillRect(0, 26, 64, 7); x.fillRect(0, 42, 64, 4); x.fillStyle = '#ffffff'; for (let i = 0; i < 5; i++) { x.beginPath(); x.arc(20 + i * 6, 20, 1.8, 0, 7); x.fill(); } x.restore(); },
  sol(x, c, c2){ x.fillStyle = c; x.beginPath(); x.arc(32, 32, 16, 0, 7); x.fill(); x.strokeStyle = c2; x.lineWidth = 2; for (let i = 0; i < 12; i++) { const a = i / 12 * 6.283; x.beginPath(); x.moveTo(32 + Math.cos(a) * 20, 32 + Math.sin(a) * 20); x.lineTo(32 + Math.cos(a) * 28, 32 + Math.sin(a) * 28); x.stroke(); } },
  oni(x, c, c2){ x.fillStyle = c; x.beginPath(); x.arc(32, 36, 18, 0, 7); x.fill(); x.fillStyle = '#f2e6c8'; [[22, 14, 18, 22], [42, 14, 46, 22]].forEach(([a1, b1, a2, b2], i) => { x.beginPath(); x.moveTo(a1 - 3 + i * 6, 22); x.lineTo(a1 + (i ? 3 : -3), b1 - 6); x.lineTo(a2 - 2 + (i ? -4 : 0), b2); x.fill(); }); x.fillStyle = '#1a1208'; x.beginPath(); x.arc(25, 33, 3, 0, 7); x.arc(39, 33, 3, 0, 7); x.fill(); x.fillStyle = '#f2e6c8'; x.fillRect(24, 44, 16, 4); x.fillStyle = c2; [[14, 54], [50, 52], [8, 40]].forEach(([px, py]) => { x.beginPath(); x.arc(px, py, 3, 0, 7); x.fill(); }); },
  sakura(x, c, c2){ x.strokeStyle = c2; x.lineWidth = 2.4; x.beginPath(); x.moveTo(2, 60); x.quadraticCurveTo(26, 40, 60, 30); x.stroke(); [[22, 40, 1], [44, 30, .8], [52, 46, .6]].forEach(([cx, cy, s]) => { x.fillStyle = c; for (let i = 0; i < 5; i++) { x.save(); x.translate(cx, cy); x.rotate(i * 1.2566); x.beginPath(); x.ellipse(0, -6 * s, 4 * s, 6.5 * s, 0, 0, 7); x.fill(); x.restore(); } x.fillStyle = '#ffe9a8'; x.beginPath(); x.arc(cx, cy, 2 * s, 0, 7); x.fill(); }); },
  tanzaku(x, c, c2){ x.strokeStyle = '#3f8f5a'; x.lineWidth = 2.4; x.beginPath(); x.moveTo(32, 64); x.lineTo(30, 0); x.stroke(); [[18, 10, c], [40, 20, c2], [16, 32, mix(c, '#ffffff', .4)]].forEach(([px, py, col]) => { x.strokeStyle = 'rgba(0,0,0,.3)'; x.lineWidth = .8; x.beginPath(); x.moveTo(px + 4, py - 4); x.lineTo(30, py - 6); x.stroke(); x.fillStyle = col; x.fillRect(px, py, 9, 22); }); },
  farol(x, c, c2){ x.fillStyle = c2; x.beginPath(); x.ellipse(32, 34, 15, 20, 0, 0, 7); x.fill(); x.strokeStyle = 'rgba(0,0,0,.25)'; x.lineWidth = 1; for (let i = -2; i <= 2; i++) { x.beginPath(); x.ellipse(32, 34, Math.abs(i) * 6 + .1, 20, 0, 0, 7); x.stroke(); } x.fillStyle = '#1a1208'; x.fillRect(25, 12, 14, 4); x.fillRect(25, 52, 14, 4); x.fillStyle = c; x.globalAlpha = .5; x.beginPath(); x.ellipse(32, 34, 7, 12, 0, 0, 7); x.fill(); x.globalAlpha = 1; },
  luna(x, c, c2){ const g = x.createRadialGradient(32, 30, 4, 32, 30, 30); g.addColorStop(0, rgba(c, .5)); g.addColorStop(1, rgba(c, 0)); x.fillStyle = g; x.fillRect(0, 0, 64, 64); x.fillStyle = c; x.beginPath(); x.arc(32, 30, 16, 0, 7); x.fill(); x.fillStyle = rgba(c2, .45); [[27, 26, 3], [37, 33, 4], [31, 38, 2]].forEach(([px, py, r]) => { x.beginPath(); x.arc(px, py, r, 0, 7); x.fill(); }); x.fillStyle = '#e8e2d0'; x.beginPath(); x.ellipse(46, 54, 4, 6, 0, 0, 7); x.ellipse(52, 52, 3, 5, .3, 0, 7); x.fill(); },
  abanico(x, c, c2){ x.save(); x.translate(32, 52); for (let i = 0; i < 9; i++) { x.fillStyle = i % 2 ? c : c2; x.beginPath(); x.moveTo(0, 0); x.arc(0, 0, 36, Math.PI + .25 + i * .29, Math.PI + .25 + (i + 1) * .29); x.closePath(); x.fill(); } x.fillStyle = '#3a2a1a'; x.beginPath(); x.arc(0, 0, 3, 0, 7); x.fill(); x.restore(); },
  flor(x, c, c2){ for (let i = 0; i < 8; i++) { const a = i * .785; x.fillStyle = i % 2 ? c : c2; x.beginPath(); x.ellipse(32 + Math.cos(a) * 11, 32 + Math.sin(a) * 11, 9, 5, a, 0, 7); x.fill(); } x.fillStyle = '#f2c230'; x.beginPath(); x.arc(32, 32, 5, 0, 7); x.fill(); },
  hoja(x, c, c2){ [[30, 34, .2, c], [40, 26, -.7, c2]].forEach(([cx, cy, r, col]) => { x.save(); x.translate(cx, cy); x.rotate(r); x.fillStyle = col; x.beginPath(); for (let i = 0; i < 5; i++) { const a = -Math.PI / 2 + (i - 2) * .55; x.lineTo(Math.cos(a) * 20, Math.sin(a) * 20); x.lineTo(Math.cos(a + .27) * 9, Math.sin(a + .27) * 9); } x.lineTo(0, 6); x.fill(); x.strokeStyle = 'rgba(0,0,0,.3)'; x.lineWidth = 1; x.beginPath(); x.moveTo(0, 14); x.lineTo(0, -16); x.stroke(); x.restore(); }); },
  loto(x, c, c2){ [[-2, 0], [-1, 0], [1, 0], [2, 0], [0, 0]].forEach(([i]) => { x.save(); x.translate(32, 46); x.rotate(i * .42); x.fillStyle = i ? mix(c, '#ffffff', .25) : c; x.beginPath(); x.moveTo(0, 0); x.quadraticCurveTo(-11, -16, 0, -30); x.quadraticCurveTo(11, -16, 0, 0); x.fill(); x.restore(); }); x.fillStyle = '#3f8f5a'; x.beginPath(); x.ellipse(32, 50, 22, 5, 0, 0, 7); x.fill(); x.fillStyle = c2; x.beginPath(); x.arc(32, 38, 2.5, 0, 7); x.fill(); },
  pepero(x, c, c2){ [[20, -.35], [32, 0], [44, .35]].forEach(([px, r]) => { x.save(); x.translate(px, 34); x.rotate(r); x.fillStyle = c2; x.fillRect(-2.5, -26, 5, 52); x.fillStyle = c; x.fillRect(-3.5, -26, 7, 36); x.fillStyle = '#ffffff'; for (let i = 0; i < 6; i++) x.fillRect(-2 + (i % 2) * 2, -22 + i * 5, 1.4, 1.4); x.restore(); }); },
  copo(x, c, c2){ x.strokeStyle = c; x.lineWidth = 2; x.lineCap = 'round'; for (let i = 0; i < 6; i++) { x.save(); x.translate(32, 32); x.rotate(i * 1.047); x.beginPath(); x.moveTo(0, 0); x.lineTo(0, -24); x.moveTo(0, -14); x.lineTo(-6, -20); x.moveTo(0, -14); x.lineTo(6, -20); x.moveTo(0, -7); x.lineTo(-4, -11); x.moveTo(0, -7); x.lineTo(4, -11); x.stroke(); x.restore(); } }
};
const mix = (a, b, t) => '#' + [1, 3, 5].map(i => Math.round(parseInt(a.slice(i, i + 2), 16) * (1 - t) + parseInt(b.slice(i, i + 2), 16) * t).toString(16).padStart(2, '0')).join('');
const MCACHE = new Map();
export function motifURL(m, c, c2, size = 64){
  const k = [m, c, c2, size].join('|'); if (MCACHE.has(k)) return MCACHE.get(k);
  if (typeof document === 'undefined' || !MOT[m]) return '';
  const cv = document.createElement('canvas'); cv.width = cv.height = size * 2; const x = cv.getContext('2d'); x.scale(size / 32, size / 32); x.lineJoin = 'round'; MOT[m](x, c, c2);
  const u = cv.toDataURL('image/png'); MCACHE.set(k, u); return u;
}
export function stripURL(m, c, c2){
  const k = 'strip|' + m + c; if (MCACHE.has(k)) return MCACHE.get(k);
  if (typeof document === 'undefined' || !MOT[m]) return '';
  const cv = document.createElement('canvas'); cv.width = 96; cv.height = 32; const x = cv.getContext('2d');
  x.strokeStyle = rgba(c, .55); x.lineWidth = 1.5; x.beginPath(); x.moveTo(0, 16); x.lineTo(30, 16); x.moveTo(66, 16); x.lineTo(96, 16); x.stroke();
  x.save(); x.translate(34, 2); x.scale(28 / 64, 28 / 64); MOT[m](x, c, c2); x.restore();
  const u = cv.toDataURL('image/png'); MCACHE.set(k, u); return u;
}

// Adorno incluido para cada temporada: guirnalda con la figura de sus partículas, en el color de acento.
const ORN = new Map();
export function ornURL(type, color){
  const key = type + color; if (ORN.has(key)) return ORN.get(key);
  if (typeof document === 'undefined') return '';
  const W = 240, H = 90, cv = document.createElement('canvas'); cv.width = W * 2; cv.height = H * 2; const x = cv.getContext('2d'); x.scale(2, 2);
  const hang = ['faroles', 'estrellas', 'corazones', 'notas', 'confeti', 'runas'].includes(type), yAt = t => 14 + Math.sin(t * Math.PI) * 26;
  x.strokeStyle = rgba(color, .75); x.lineWidth = 1.3; x.beginPath(); x.moveTo(0, 14); x.quadraticCurveTo(W / 2, 66, W, 14); x.stroke();
  const n = 7;
  for (let i = 0; i < n; i++) { const t = (i + .5) / n, px = t * W, py = 14 + 2 * t * (1 - t) * 52, drop = hang ? 10 + (i % 2) * 8 : 0;
    if (hang) { x.strokeStyle = rgba(color, .6); x.lineWidth = .8; x.beginPath(); x.moveTo(px, py); x.lineTo(px, py + drop); x.stroke(); }
    drawP(x, { t: type, x: px, y: py + drop + (hang ? 6 : 0), s: hang ? 7 + (i % 3) : 6 + (i % 2) * 2, r: hang ? 0 : (i * 1.3) % 6, a: .95, ph: i, v: i, c2: type === 'confeti' ? ['#f2c230', '#ff3fa4', '#4fc3f7', '#a9d18e', '#ff7a1a'][i % 5] : null }, color); }
  const u = cv.toDataURL('image/png'); ORN.set(key, u); return u;
}

// Activa las animaciones elegidas sobre una página ya dibujada. Devuelve una función para detenerlas.
export function animate(root, cfg, opts = {}){
  const A = cfg.anim || {}, stop = [], mob = opts.mobile ?? matchMedia('(max-width:700px)').matches;
  if (matchMedia('(prefers-reduced-motion: reduce)').matches && !opts.forceMotion) { root.classList.add('tp2-still'); return () => {}; }
  const sc = opts.scroller || window, scY = () => sc === window ? scrollY : sc.scrollTop;
  if (A.reveal) { root.classList.add('tp2-rv'); const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting || e.boundingClientRect.bottom < (e.rootBounds?.top ?? 0)) { e.target.classList.add('in'); io.unobserve(e.target); } }), { root: sc === window ? null : sc, threshold: .12 });
    const safety = setTimeout(() => root.querySelectorAll('.tp2-rv :is(.tp2-sec,.tp2-ann,.tp2-next,.tp2-stats):not(.in)').forEach(el => { const r = el.getBoundingClientRect(); if (r.bottom < 0) el.classList.add('in'); }), 1200); stop.push(() => clearTimeout(safety)); root.querySelectorAll('.tp2-sec,.tp2-ann,.tp2-next,.tp2-stats').forEach(el => io.observe(el)); stop.push(() => { io.disconnect(); root.classList.remove('tp2-rv'); }); }
  if (A.parallax && !mob) { const b = root.querySelector('.tp2-hero,.tp2-ban,.tp2-edi'); if (b) { const k = { sutil: .15, media: .3, alta: .45 }[cfg.intensity] || .3; let q = 0; const f = () => { q = 0; b.style.backgroundPositionY = `calc(50% + ${Math.round(scY() * k)}px)`; }; const on = () => { if (!q) q = requestAnimationFrame(f); }; sc.addEventListener('scroll', on, { passive: true }); f(); stop.push(() => { sc.removeEventListener('scroll', on); b.style.backgroundPositionY = ''; }); } }
  if (A.tilt && !mob) { const deg = { sutil: 4, media: 8, alta: 12 }[cfg.intensity] || 8; const mv = e => { const c = e.target.closest?.('.tp2-cv'); root.querySelectorAll('.tp2-cv.tl').forEach(x => { if (x !== c) { x.classList.remove('tl'); x.style.transform = ''; } }); if (!c) return; const r = c.getBoundingClientRect(), px = (e.clientX - r.left) / r.width - .5, py = (e.clientY - r.top) / r.height - .5; c.classList.add('tl'); c.style.transform = `perspective(700px) rotateY(${px * deg}deg) rotateX(${-py * deg}deg) translateY(-3px)`; }; root.addEventListener('pointermove', mv); const lv = () => root.querySelectorAll('.tp2-cv.tl').forEach(x => { x.classList.remove('tl'); x.style.transform = ''; }); root.addEventListener('pointerleave', lv); stop.push(() => { root.removeEventListener('pointermove', mv); root.removeEventListener('pointerleave', lv); lv(); }); }
  if (A.autoplay) { const car = root.querySelector('.tp2-car'); if (car && car.children.length > 1) { let hold = false; const h = () => { hold = true; }, r = () => { hold = false; }; ['pointerenter', 'focusin'].forEach(ev => car.addEventListener(ev, h)); ['pointerleave', 'focusout'].forEach(ev => car.addEventListener(ev, r)); const ms = { sutil: 9000, media: 6000, alta: 4000 }[cfg.intensity] || 6000; const id = setInterval(() => { if (hold || document.hidden) return; const n = car.children.length, i = (Math.round(car.scrollLeft / car.clientWidth) + 1) % n; car.scrollTo({ left: i * car.clientWidth, behavior: 'smooth' }); }, ms); stop.push(() => clearInterval(id)); } }
  if (A.countdown) { const nx = root.querySelector('.tp2-next[data-at]'); if (nx) { const at = new Date(nx.dataset.at), el = document.createElement('span'); el.className = 'tp2-cd'; el.setAttribute('aria-live', 'off'); nx.appendChild(el); const tick = () => { let s = Math.max(0, Math.round((at - Date.now()) / 1000)); const d = Math.floor(s / 86400); s -= d * 86400; const hh = Math.floor(s / 3600); s -= hh * 3600; const mm = Math.floor(s / 60), ss = s - mm * 60; el.innerHTML = [[d, 'días'], [hh, 'h'], [mm, 'min'], [ss, 's']].map(([v, l]) => `<b>${String(v).padStart(2, '0')}</b><small>${l}</small>`).join(''); }; tick(); const id = setInterval(tick, 1000); stop.push(() => { clearInterval(id); el.remove(); }); } }
  const P = cfg.part || {};
  if (A.particles && P.type && PARTS[P.type]) { const host = P.where === 'page' ? root : root.querySelector('.tp2-hero,.tp2-ban,.tp2-ed') || root; host.classList.add('tp2-ph'); if (P.where === 'page') root.classList.add('tp2-pp'); stop.push(particles(host, { type: P.type, color: P.mode === 'custom' && /^#[0-9a-f]{6}$/i.test(P.color || '') ? P.color : cfg.accent, density: P.density, where: P.where, intensity: cfg.intensity, mobile: mob })); stop.push(() => { host.classList.remove('tp2-ph'); root.classList.remove('tp2-pp'); }); }
  return () => stop.forEach(f => f());
}

export const CSS = `
.tp2{overflow-x:clip}.tp2-hero,.tp2-ban,.tp2-edi{overflow:hidden}
.tp2-cor{position:absolute;top:clamp(10px,2cqi,22px);width:clamp(64px,11cqi,128px);aspect-ratio:1;background:center/contain no-repeat;pointer-events:none;z-index:2;filter:drop-shadow(0 4px 8px rgba(0,0,0,.3))}.tp2-cor.l{left:clamp(8px,2cqi,28px);transform:rotate(-10deg)}.tp2-cor.r{right:clamp(8px,2cqi,28px);transform:rotate(12deg) scaleX(-1)}
.tp2[data-season] .tp2-sec h2,.tp2[data-season] .tp2-sh h2{display:flex;align-items:center;gap:10px}.tp2[data-season] .tp2-sec h2::before,.tp2[data-season] .tp2-sh h2::before{content:'';width:1.15em;height:1.15em;flex:none;background:var(--mot) center/contain no-repeat}
.tp2[data-season] .tp2-sec>h2,.tp2[data-season] .tp2-sh{border-bottom:none;padding-bottom:22px;background:var(--motstrip) left bottom/96px 24px repeat-x}
.tp2[data-season] .tp2-ann,.tp2[data-season] .tp2-next,.tp2[data-season] .tp2-greet{position:relative}.tp2[data-season] .tp2-ann::after,.tp2[data-season] .tp2-next::after{content:'';position:absolute;right:-10px;top:-14px;width:46px;height:46px;background:var(--mot) center/contain no-repeat;transform:rotate(14deg);pointer-events:none}
.tp2-stamp{display:inline-flex;align-items:center;gap:6px;margin-top:10px;padding:4px 12px 4px 6px;background:var(--sf);border:1px solid var(--c2);border-radius:999px;font-family:'IBM Plex Mono',monospace;font-size:11px;letter-spacing:.1em;color:var(--fg)}.tp2-stamp i{width:22px;height:22px;background:var(--mot) center/contain no-repeat}
.tp2-greet{border-color:var(--c2)}.tp2-greet::before{content:'';width:34px;height:34px;flex:none;background:var(--mot) center/contain no-repeat}
.tp2[data-season] .tp2-stats span{border-top-color:var(--c2)}.tp2[data-season] .tp2-dots i.on{background:var(--c2)}
@container (max-width:640px){.tp2-cor{width:56px}.tp2-cor.r{display:none}.tp2[data-season] .tp2-ann::after,.tp2[data-season] .tp2-next::after{width:34px;height:34px;right:-4px}}
.tp2-ph{position:relative}.tp2-pc{position:absolute;inset:0;width:100%;height:100%;pointer-events:none;z-index:1}.tp2-pp>.tp2-pc{position:sticky;top:0;height:100vh;margin-bottom:-100vh;display:block;z-index:3}
.tp2-hero .tp2-heroin,.tp2-ed .tp2-edt{z-index:2}
.tp2-rv .tp2-sec,.tp2-rv .tp2-ann,.tp2-rv .tp2-next,.tp2-rv .tp2-stats{opacity:0;transform:translateY(22px);transition:opacity .7s ease,transform .7s cubic-bezier(.2,.7,.2,1)}.tp2-rv .in{opacity:1;transform:none}
.tp2-cv{transition:transform .25s ease,box-shadow .25s ease;will-change:transform}.tp2[data-cover=portada] .tp2-cv.tl{box-shadow:0 18px 30px -8px rgba(0,0,0,.6)}.tp2:is([data-cover=bolsillo],[data-cover=obi]) .tp2-cv.tl{box-shadow:1px 0 0 #f4efe3,2px 0 0 #d9d2c1,3px 0 0 #f4efe3,4px 0 0 #cfc7b4,5px 0 0 #ece6d8,6px 1px 0 #bdb5a2,16px 20px 30px -6px rgba(0,0,0,.6)}
.tp2-cd{display:flex;gap:10px;margin-top:6px}.tp2-cd b{font-family:var(--tf);font-weight:var(--tw);font-size:26px;color:var(--act);font-variant-numeric:tabular-nums}.tp2-cd small{font-family:'IBM Plex Mono',monospace;font-size:10px;color:var(--mu);margin-left:2px}
.tp2-greet{display:flex;gap:12px;align-items:center;flex-wrap:wrap;padding:12px 16px;background:color-mix(in srgb,var(--ac) 18%,var(--sf));border:1px solid var(--ac);border-radius:var(--r);font-family:var(--tf);font-weight:var(--tw);font-size:18px;max-width:720px}.tp2-greet small{font-family:'IBM Plex Mono',monospace;font-weight:400;font-size:11px;letter-spacing:.1em;color:var(--act)}
.tp2-orn{position:absolute;left:0;right:0;bottom:-6px;height:clamp(60px,10cqi,110px);background:center bottom/auto 100% repeat-x;pointer-events:none;z-index:2}.tp2-orn.def{top:0;bottom:auto;height:clamp(54px,8cqi,90px);background-position:center top;filter:drop-shadow(0 3px 4px rgba(0,0,0,.25))}
`;
