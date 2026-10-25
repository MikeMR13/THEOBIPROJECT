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
    const load = async (path, binary = false) => {
      const ctrl = new AbortController(), timer = setTimeout(() => ctrl.abort(), 8000);
      try {
        const headers = process.env.VERCEL_AUTOMATION_BYPASS_SECRET ? { 'x-vercel-protection-bypass': process.env.VERCEL_AUTOMATION_BYPASS_SECRET } : process.env.VERCEL_OIDC_TOKEN ? { 'x-vercel-trusted-oidc-idp-token': process.env.VERCEL_OIDC_TOKEN } : {};
        const response = await fetch(new URL(path, base), { redirect: 'manual', headers, signal: ctrl.signal });
        return { status: response.status, text: binary ? '' : await response.text(), bytes: binary ? Buffer.from(await response.arrayBuffer()) : null, headers: response.headers };
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
    const ogImage = async (html, what) => {
      const hit = html.match(/<meta property="og:image" content="([^"]+)"/i);
      assert.ok(hit, what + ': falta og:image');
      const url = new URL(hit[1].replace(/&amp;/g, '&'), base);
      assert.equal(url.origin, base.origin, what + ': la imagen debe pertenecer a la misma Preview');
      assert.equal(url.pathname, '/api/og-image', what + ': generador PNG no conectado');
      const response = await load(url.pathname + url.search, true);
      assert.equal(response.status, 200, what + ': imagen HTTP');
      assert.match(response.headers.get('content-type') || '', /^image\/png/, what + ': MIME');
      assert.ok(response.bytes?.length > 64 && response.bytes.length < 6_000_000, what + ': peso PNG');
      assert.equal(response.bytes.subarray(0,8).toString('hex'), '89504e470d0a1a0a', what + ': firma PNG');
      assert.equal(response.bytes.readUInt32BE(16), 1200, what + ': ancho');
      assert.equal(response.bytes.readUInt32BE(20), 630, what + ': alto');
      assert.match(response.headers.get('cache-control')||'', /no-store/, what + ': nunca cachear imágenes tras ocultar');
    };
    const homeMeta = await load('/api/public-meta?kind=home');
    assert.equal(homeMeta.status, 200, 'Inicio SSR disponible');
    await ogImage(homeMeta.text, 'Inicio');
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
    const chapter = process.env.SEO_PUBLIC_CHAPTER_NUM;
    const team = process.env.SEO_PUBLIC_TEAM_SLUG;
    if (process.env.SEO_REQUIRE_FIXTURES === '1') {
      assert.ok(slug && chapter && team, 'Faltan tres fixtures QA: SEO_PUBLIC_SERIES_SLUG, SEO_PUBLIC_CHAPTER_NUM y SEO_PUBLIC_TEAM_SLUG');
    }
    if (slug) {
      if (!/^[a-z0-9_-]+$/i.test(slug)) throw new Error('SEO_PUBLIC_SERIES_SLUG inválido');
      const series = await load('/serie/' + slug);
      assert.equal(series.status, 200, 'Ficha pública real');
      assert.match(series.text, /property="og:title"/);
      assert.doesNotMatch(series.text, /<script type="application\/ld\+json">/, 'Preview no debe emitir schema indexable');
      await ogImage(series.text, 'Novela pública QA');
      assert.ok(series.headers.get('x-robots-tag')?.includes('noindex'), 'Preview debe mantener noindex');
      if (chapter) {
        if (!/^\d+$/.test(chapter)) throw new Error('SEO_PUBLIC_CHAPTER_NUM inválido');
        const ch = await load('/leer/' + slug + '/' + chapter);
        assert.equal(ch.status, 200, 'Capítulo público real');
        assert.match(ch.text, /property="og:title"/);
        await ogImage(ch.text, 'Capítulo público QA');
      }
    }
    if (team) {
      assert.match(team, /^[a-z0-9_-]+$/i);
      const t = await load('/equipo/' + team);
      assert.equal(t.status, 200, 'Equipo publico QA');
      assert.match(t.text, /property="og:title"/);
      assert.doesNotMatch(t.text, /<script type="application\/ld\+json">/, 'Preview no debe emitir schema indexable');
      await ogImage(t.text, 'Equipo público QA');
    }
    console.log('SEO Preview HTTP: PASS. Enrutamiento, Supabase QA, privacidad, HTML y tarjetas PNG 1200×630 verificadas.');
  } catch (e) {
    console.error('SEO Preview HTTP: NO APROBADA — ' + e.message);
    process.exitCode = 1;
  }
}
