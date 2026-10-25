// Puerta de aceptación HTTP. No ejecutar contra producción.
// Uso: SEO_PREVIEW_URL=https://...vercel.app npm run seo-preview-check
// Opcional: SEO_PUBLIC_SERIES_SLUG=serie-publica, SEO_PUBLIC_CHAPTER_NUM=1
import assert from 'node:assert/strict';

const source = (process.env.SEO_PREVIEW_URL || '').trim();
if (!source) {
  console.error('Falta SEO_PREVIEW_URL. Ejemplo: SEO_PREVIEW_URL=https://<deployment>.vercel.app npm run seo-preview-check');
  process.exitCode = 1;
} else {
  try {
    const base = new URL(source);
    if (base.protocol !== 'https:' || !base.hostname.endsWith('.vercel.app') || base.pathname !== '/' || base.search || base.hash) {
      throw new Error('Solo se aceptan URLs HTTPS raíz de Previews *.vercel.app.');
    }
    const load = async path => {
      const ctrl = new AbortController(), timer = setTimeout(() => ctrl.abort(), 8000);
      try {
        const headers = process.env.VERCEL_AUTOMATION_BYPASS_SECRET ? { 'x-vercel-protection-bypass': process.env.VERCEL_AUTOMATION_BYPASS_SECRET } : process.env.VERCEL_OIDC_TOKEN ? { 'x-vercel-trusted-oidc-idp-token': process.env.VERCEL_OIDC_TOKEN } : {};
        const response = await fetch(new URL(path, base), { redirect: 'manual', headers, signal: ctrl.signal });
        return { status: response.status, text: await response.text(), headers: response.headers };
      } finally { clearTimeout(timer); }
    };
    const config = await load('/config.js');
    assert.equal(config.status, 200, 'config.js debe servirse públicamente');
    const found = config.text.match(/\burl\s*:\s*["']([^"']+)["']/);
    assert.ok(found, 'La Preview debe declarar su backend público');
    assert.match(config.text, /\bpreview\s*:\s*(?:true|!0)\b/, 'Solo se acepta la configuración Preview');
    const backend = new URL(found[1]);
    assert.ok(!backend.hostname.endsWith('.invalid'), 'BLOQUEO: la Preview usa un backend simulado .invalid');
    assert.notEqual(backend.hostname, 'qfllthjpjuaztppvpsrk.supabase.co', 'BLOQUEO: una Preview no puede usar Supabase de producción');
    assert.ok(backend.protocol === 'https:', 'Supabase Preview debe usar HTTPS');
    const robots = await load('/robots.txt');
    assert.equal(robots.status, 200);
    assert.match(robots.text, /User-agent: \*/);
    assert.match(robots.text, /Disallow: \//);
    const sitemap = await load('/sitemap.xml');
    assert.equal(sitemap.status, 404, 'Sitemap de Preview no indexable');
    const knownPage = await load('/catalogo');
    assert.equal(knownPage.status, 200);
    const sl = 'seo-test-inexistente-20261024';
    for (const [path, expected] of [
      ['/serie/' + sl, 404],
      ['/leer/' + sl + '/98765432', 404],
      ['/equipo/' + sl, 404],
      ['/lector/' + sl, 404],
      ['/ruta-seo-inexistente-' + sl, 404]
    ]) {
      const found = await load(path);
      assert.equal(found.status, expected, path + ': 404 real requerido (no HTML genérico con 200)');
      assert.ok(/noindex/i.test(found.headers.get('x-robots-tag') || found.text), path + ': falta noindex');
    }
    const slug = process.env.SEO_PUBLIC_SERIES_SLUG;
    if (slug) {
      if (!/^[a-z0-9_-]+$/i.test(slug)) throw new Error('SEO_PUBLIC_SERIES_SLUG inválido');
      const series = await load('/serie/' + slug);
      assert.equal(series.status, 200, 'Ficha pública real');
      assert.match(series.text, /property="og:title"/);
      assert.match(series.text, /application\/ld\+json/);
      const chapter = process.env.SEO_PUBLIC_CHAPTER_NUM;
      if (chapter) {
        if (!/^\d+$/.test(chapter)) throw new Error('SEO_PUBLIC_CHAPTER_NUM inválido');
        const ch = await load('/leer/' + slug + '/' + chapter);
        assert.equal(ch.status, 200, 'Capítulo público real');
        assert.match(ch.text, /property="og:title"/);
      }
    }
    console.log('SEO Preview HTTP: PASS. Enrutamiento, Supabase QA, privacidad y HTML verificados.');
  } catch (e) {
    console.error('SEO Preview HTTP: NO APROBADA — ' + e.message);
    process.exitCode = 1;
  }
}
