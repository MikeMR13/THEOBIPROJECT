// Una sola vez: crea miniaturas WebP de 360 px para las portadas existentes.
// Uso: npm i --no-save sharp && SUPABASE_SERVICE_ROLE_KEY=… node scripts/thumbs.mjs   (no subas esta clave al repositorio)
const url = process.env.OBI_SUPABASE_URL || 'https://qfllthjpjuaztppvpsrk.supabase.co', key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!key) throw new Error('Falta SUPABASE_SERVICE_ROLE_KEY');
let sharp; try { sharp = (await import('sharp')).default; } catch { throw new Error('Instala sharp: npm i --no-save sharp'); }
const H = { apikey: key, Authorization: 'Bearer ' + key };
const res = await fetch(`${url}/rest/v1/series?select=id,team_id,cover_path&cover_path=not.is.null&cover_thumb_path=is.null&limit=2000`, { headers: H });
if (!res.ok) throw new Error('No pude leer las obras: ' + await res.text());
const rows = await res.json(); let ok = 0, fail = 0;
console.log(rows.length + ' portadas sin miniatura');
for (const s of rows) {
  try {
    const src = /^https?:/.test(s.cover_path) ? s.cover_path : `${url}/storage/v1/object/public/obi-media/${encodeURI(s.cover_path)}`;
    const img = await fetch(src); if (!img.ok) throw new Error('portada ' + img.status);
    const buf = await sharp(Buffer.from(await img.arrayBuffer())).resize({ width: 360, withoutEnlargement: true }).webp({ quality: 80 }).toBuffer();
    const path = `${s.team_id}/thumbs/${s.id}-${Date.now()}.webp`;
    const up = await fetch(`${url}/storage/v1/object/obi-media/${path}`, { method: 'POST', headers: { ...H, 'Content-Type': 'image/webp', 'Cache-Control': 'max-age=31536000' }, body: buf });
    if (!up.ok) throw new Error('subida ' + await up.text());
    const pt = await fetch(`${url}/rest/v1/series?id=eq.${s.id}&cover_path=eq.${encodeURIComponent(s.cover_path)}`, { method: 'PATCH', headers: { ...H, 'Content-Type': 'application/json', Prefer: 'return=minimal' }, body: JSON.stringify({ cover_thumb_path: path }) });
    if (!pt.ok) throw new Error('guardar ' + await pt.text());
    ok++; console.log('✓', s.id, (buf.length / 1024).toFixed(0) + ' KB');
  } catch (e) { fail++; console.warn('✗', s.id, e.message); }
}
console.log(`Listo: ${ok} miniaturas, ${fail} fallos`);
