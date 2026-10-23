// Endpoint heredado de Patreon. No concede permisos, niveles de donador ni acceso
// a capítulos, volúmenes, archivos o enlaces de descarga.
// La sincronización válida de membresías es la función Supabase Patreon, que
// separa las campañas por owner: "platform" solo reconoce apoyo; UUIDs de equipos
// autorizan exclusivamente el contenido definido por ese equipo.
import { createHmac, timingSafeEqual } from 'node:crypto';

export default {
  async fetch(req, env) {
    if (req.method !== 'POST') return new Response('El Obi · Patreon (endpoint heredado)');
    const raw = await req.text();
    const sig = req.headers.get('x-patreon-signature') || '';
    if (!env.PATREON_WEBHOOK_SECRET) return new Response('no configurado', { status: 503 });
    const mac = createHmac('md5', env.PATREON_WEBHOOK_SECRET).update(raw).digest('hex');
    if (sig.length !== mac.length || !timingSafeEqual(Buffer.from(sig), Buffer.from(mac)))
      return new Response('firma inválida', { status: 401 });

    // No modificar profiles.donor_tier, profiles.donor_until, ni la publicación.
    // Responder 200 a webhooks heredados para evitar reintentos que reintroduzcan
    // las concesiones de acceso del antiguo sistema global de donadores.
    return new Response('ok · solo reconocimiento, sin accesos editoriales');
  }
};
