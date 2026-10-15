# El Obi del Lector · THEOBIPROJECT

Biblioteca de novelas ligeras traducidas al español latino. SPA sin framework + Supabase + Vercel + Cloudflare Workers (todo en planes gratuitos).

## Servicios
| Servicio | Uso | Identificador |
|---|---|---|
| Supabase | Auth, Postgres con RLS, Storage (`obi-media`, `obi-epub`) | `qfllthjpjuaztppvpsrk` (us-east-1) |
| Vercel | Hosting estático de `dist/` | proyecto `theobiproject` (Hobby) |
| Cloudflare Workers | `obi-notify` (Discord/Telegram), `obi-patreon` (webhook), KV `OBI_CACHE` | plan Free |

## Estructura
- `src/`, `public/`, `scripts/` — sitio (SPA + PWA)
- `workers/notify`, `workers/patreon` — Cloudflare Workers
- `supabase/config.toml`, `supabase/templates/confirmation.html` — Auth y correo de confirmación
- `design/El Obi del Lector v12.dc.html` — diseño de referencia (ábrelo con `design/support.js` al lado)

## Cuentas
- Registro con correo + contraseña (`/registro`), confirmación por correo → `/?bienvenida=1` → subir foto de perfil (bucket `avatars`, 2 MB, JPG/PNG/WebP).
- `/entrar`, `/restablecer`, `/perfil`.

## Desarrollo
```
npm run build   # genera dist/ con config pública
npx serve dist
```

Variables públicas (Vercel → Settings → Environment Variables):
- `OBI_SUPABASE_URL`
- `OBI_SUPABASE_PUBLISHABLE_KEY`

Nunca uses la `service_role` en el navegador; solo vive como secreto de los Workers.

## Workers
```
cd workers/notify  && npx wrangler kv namespace create OBI_CACHE && npx wrangler secret put SUPABASE_SERVICE_KEY && npx wrangler secret put DISCORD_WEBHOOK_URL && npx wrangler secret put TELEGRAM_BOT_TOKEN && npx wrangler secret put WEBHOOK_SECRET && npx wrangler deploy
cd workers/patreon && npx wrangler secret put SUPABASE_SERVICE_KEY && npx wrangler secret put PATREON_WEBHOOK_SECRET && npx wrangler deploy
```
En Supabase → Database → Webhooks: `INSERT/UPDATE` en `public.chapters` → `https://obi-notify.<tu-subdominio>.workers.dev/chapter` con header `x-obi-secret`.
En Patreon → Portal → Webhooks: `members:pledge:create|update|delete` → `https://obi-patreon.<tu-subdominio>.workers.dev/`.

## Base de datos
El esquema ya está aplicado (migraciones `obi_core_schema` y `move_helpers_private`). Para versionarlo: `npx supabase db pull`.
Roles de cuenta: reader, translator, proofreader, collaborator, mod, admin. Roles de equipo: owner, editor, proofreader, collaborator (solo owner/editor publican).
Los reportes de erratas solo los ve el equipo dueño de la serie, los moderadores y quien reportó.

## Pendiente (requiere tu panel)
- Activar R2 en Cloudflare si quieres mover imágenes fuera de Supabase Storage.
- Auth → Providers: activar Discord/Google si los usarás.
- Primer admin: `update public.profiles set role='admin' where username='TU_USUARIO';`

## Despliegue actual
- Vercel sirve index.html, app.js, config.js, sw.js, manifest e icono.
- reader.js, studio.js y styles.css se publican en el bucket público `obi-app` de Supabase (función `publish-asset`).
- Al conectar GitHub, se puede volver a servir todo desde Vercel con `npm run build`.

- app.js carga reader.js, ui.js y studio.js desde obi-app con ?v=4 (top-level await). Para cambiar vistas públicas: editar src/ui.js, copiar a dist-min/ y republicar con publish-asset; no hace falta redeploy en Vercel.
