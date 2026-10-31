// CSS de fuentes EPUB por fragmento: nunca mezclar una familia con el keyword CSS "inherit".
// Compartido por el lector y pruebas Chromium. Los índices respetan el orden guardado por el importador.
export function familiesOf(vol) {
  return [...new Set((vol?.epub_fonts || []).map(f=>f.family).filter(f=>typeof f==='string'&&f.trim()))];
}
const cleanName=name=>String(name||'').replace(/["'<>;{}\\]/g,'').trim();
const face=(vol,fam)=>`'obi-${Number(vol?.num)||0}-${cleanName(fam)}'`;
export function fontRoles(vol) {
  const fl=familiesOf(vol),fs=vol?.epub_fonts||[];
  let body=fs.find(f=>(f.use||[]).includes('body'))?.family;
  let head=fs.find(f=>(f.use||[]).includes('heading'))?.family;
  if(!fs.some(f=>f.use)) {
    const HEAD_RE=/gothic|goth|title|head|midashi|antique|heavy|black|bold|display|ゴシック|見出し/i;
    head=fl.find(f=>HEAD_RE.test(f));
    body=fl.length===1&&!head?fl[0]:fl.find(f=>f!==head&&!HEAD_RE.test(f)&&fl.length<=2);
  }
  return {body,head};
}
export function fontVars(vol,p) {
  if(!vol)return '';
  const base="Literata,'Shippori Mincho B1',serif";
  const original=p?.font==='original';
  // "font-family: 'obi-X',inherit" es CSS inválido y el navegador ignoraba --fN
  // (el título sí podía funcionar porque --fh no contenía inherit).
  const vars=familiesOf(vol).map((fam,i)=>`--f${i}:${original?face(vol,fam)+','+base:'inherit'}`);
  if(original) {
    const role=fontRoles(vol);
    vars.push(`--fb:${role.body?face(vol,role.body)+',':''}${base}`);
    vars.push(`--fh:${role.head?face(vol,role.head)+',':''}${role.body?face(vol,role.body)+',':''}${base}`);
  }
  return vars.join(';');
}
