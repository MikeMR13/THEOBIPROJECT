// Robots generado por entorno: las previews no se deben indexar.
const ROOT = 'https://elobidellector.com';
const rules = [
  'User-agent: *',
  'Allow: /',
  'Disallow: /estudio',
  'Disallow: /bibliotecario',
  'Disallow: /admin',
  'Disallow: /perfil',
  'Disallow: /preferencias',
  'Disallow: /biblioteca',
  'Disallow: /descargas',
  'Disallow: /entrar',
  'Disallow: /registro',
  'Disallow: /invitacion',
  'Disallow: /anotaciones',
  'Disallow: /solicitud',
  'Disallow: /api/',
  'Disallow: /*?vista=',
  'Disallow: /*&vista=',
  'Sitemap: ' + ROOT + '/sitemap.xml'
].join('\n') + '\n';
export default function handler(req,res) {
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    res.setHeader('Allow','GET, HEAD');
    return res.status(405).end();
  }
  const preview = process.env.VERCEL_ENV !== 'production';
  res.setHeader('Content-Type','text/plain; charset=utf-8');
  res.setHeader('Cache-Control', preview ? 'private, no-store' : 'public, s-maxage=3600');
  if (preview) res.setHeader('X-Robots-Tag', 'noindex, nofollow');
  const body = preview ? 'User-agent: *\nDisallow: /\n' : rules;
  return res.status(200).send(req.method === 'HEAD' ? '' : body);
}
