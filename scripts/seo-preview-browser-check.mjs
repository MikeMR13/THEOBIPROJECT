// Smoke E2E en Chromium contra Preview QA. No almacena cookies ni capturas.
import assert from 'node:assert/strict';
import { chromium } from 'playwright';

const base = new URL(process.env.SEO_PREVIEW_URL || '');
const bypass = process.env.VERCEL_AUTOMATION_BYPASS_SECRET || '';
const slug = process.env.SEO_PUBLIC_SERIES_SLUG || '';
const chapter = process.env.SEO_PUBLIC_CHAPTER_NUM || '';
const team = process.env.SEO_PUBLIC_TEAM_SLUG || '';
assert.ok(base.protocol === 'https:' && base.hostname.endsWith('.vercel.app') &&
  base.pathname === '/' && !base.search && !base.hash, 'Se requiere origen Preview verificado');
assert.ok(bypass, 'Configura VERCEL_AUTOMATION_BYPASS_SECRET en entorno protegido seo-qa');
assert.match(slug, /^[a-z0-9_-]{1,100}$/i, 'Falta SEO_PUBLIC_SERIES_SLUG QA válido');
assert.match(chapter, /^[0-9]{1,8}$/, 'Falta SEO_PUBLIC_CHAPTER_NUM QA válido');
assert.match(team, /^[a-z0-9_-]{1,100}$/i, 'Falta SEO_PUBLIC_TEAM_SLUG QA válido');

const browser = await chromium.launch({ headless: true });
try {
  for (const width of [390, 1366]) {
    const context = await browser.newContext({
      viewport: { width, height: 850 },
      serviceWorkers: 'block', // impedir shell antiguo de SW durante SEO QA
      recordHar: undefined,
      acceptDownloads: false,
    });
    try {
      // Solo se envía la clave a la URL exacta, sin redirects externos.
      // La cookie de acceso queda en memoria y nunca se exporta.
      const response = await context.request.get(base.origin + '/', {
        headers: {
          'x-vercel-protection-bypass': bypass,
          'x-vercel-set-bypass-cookie': 'true',
        },
        maxRedirects: 0,
      });
      const loc = response.headers().location;
      if (loc) assert.equal(new URL(loc, base.origin).origin, base.origin,
        'La autenticación intentó redirigir fuera de la Preview verificada');
      const cookies = await context.cookies(base.origin);
      assert.ok(response.ok() && cookies.some(c =>
        c.name === '_vercel_jwt' && c.secure && c.domain.replace(/^\./,'') === base.hostname),
        'Vercel no estableció la cookie de bypass específica de la Preview');
      const page = await context.newPage();
      const load = async (path, label) => {
        const pageResponse = await page.goto(base.origin + path, { waitUntil: 'domcontentloaded', timeout: 25000 });
        assert.equal(pageResponse?.status(), 200, label + ' debe responder 200');
        await page.locator('main#app').waitFor({ state:'attached',timeout:12000 });
        await page.waitForFunction(() => (document.querySelector('main#app')?.textContent || '').trim().length > 35,
          null,{ timeout: 20000 });
        const layout = await page.evaluate(() => ({
          scroll: document.documentElement.scrollWidth, viewport: innerWidth,
          htmlTitle: document.title,
          bodyLen: (document.querySelector('main#app')?.textContent || '').trim().length
        }));
        assert.ok(layout.scroll <= layout.viewport + 12, label + ': desborde horizontal en ' + width + 'px');
        assert.ok(layout.bodyLen > 35, label + ': SPA sin contenido');
        return layout;
      };
      await load('/catalogo', 'Catálogo');
      const seriesLayout = await load('/serie/' + slug, 'Novela pública');
      assert.ok(!/^El Obi del Lector$/.test(seriesLayout.htmlTitle), 'El título de la novela es genérico');
      await page.locator('.obi-share > summary').first().waitFor({ state:'visible', timeout:15000 });
      const summary = page.locator('.obi-share > summary').first();
      await summary.click();
      assert.ok(await page.locator('.obi-share[open] button[data-obi-share="copy"]').count(),
        'El menú Compartir no se abre');
      await load('/leer/' + slug + '/' + chapter,'Capítulo público');
      await load('/equipo/' + team, 'Equipo público');
      console.log('Chromium ' + width + 'px: Catálogo, novela, capítulo, equipo y compartir OK');
    } finally {
      await context.close();
    }
  }
} finally {
  await browser.close();
}
