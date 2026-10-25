// Contrato común para metadatos editables. Sin HTML arbitrario ni URLs externas.
export const SEO_LIMITS = Object.freeze({ title: 70, description: 170, socialTitle: 90, socialDescription: 200 });
const value = (raw, size) => String(raw ?? '').replace(/<[^>]*>/g, ' ').replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, size);
export function cleanSeo(raw, opts = {}) {
  const s = raw && typeof raw === 'object' && !Array.isArray(raw) ? raw : {};
  const paths = new Set((opts.allowedImages || []).filter(x => typeof x === 'string' && x.length < 600));
  return {
    title: value(s.title, SEO_LIMITS.title),
    description: value(s.description, SEO_LIMITS.description),
    socialTitle: value(s.socialTitle, SEO_LIMITS.socialTitle),
    socialDescription: value(s.socialDescription, SEO_LIMITS.socialDescription),
    imagePath: paths.has(s.imagePath) ? s.imagePath : '',
    noindex: s.noindex === true
  };
}
export function cleanSiteSeo(raw) {
  const s = raw && typeof raw === 'object' && !Array.isArray(raw) ? raw : {};
  return {
    title: value(s.title, SEO_LIMITS.title),
    description: value(s.description, SEO_LIMITS.description),
    socialTitle: value(s.socialTitle, SEO_LIMITS.socialTitle),
    socialDescription: value(s.socialDescription, SEO_LIMITS.socialDescription)
  };
}
export function editImages(series, volumes = []) {
  // No permite rutas a imágenes privadas o imágenes externas arbitrarias.
  const candidates = [series?.cover_path, series?.cover_thumb_path,
    ...(series?.media?.gallery || []).map(x => x?.path),
    ...volumes.map(v => v?.cover_path)];
  const prefix = series?.team_id + '/';
  return [...new Set(candidates.filter(p => typeof p === 'string' &&
    p.startsWith(prefix) && !p.includes('..') && !p.includes('?') &&
    !p.includes('#') && p.length < 600))].slice(0, 60);
}
export function applySeo(base, overrides, opts = {}) {
  const cfg = cleanSeo(overrides, opts);
  return { ...base,
    title: cfg.title || base.title,
    description: cfg.description || base.description,
    socialTitle: cfg.socialTitle || cfg.title || base.title,
    socialDescription: cfg.socialDescription || cfg.description || base.description,
    image: cfg.imagePath && opts.media ? opts.media(cfg.imagePath) : base.image,
    noindex: !!base.noindex || cfg.noindex
  };
}
