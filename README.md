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

- El código activo está en `src/`, `public/` y `scripts/`. No editar `ui.js` de la raíz ni `dist-min/` como si fuesen los archivos publicados.
- GitHub `main` se despliega por integración Git de Vercel (`theobiproject`); `node scripts/build.mjs` crea `dist/`, minifica y asigna sellos de caché por contenido a los recursos.
- `npm run quality-gates` conserva las 27 validaciones editoriales, que se ejecutan en el CI gratuito de GitHub Actions antes de dar por aprobado el PR. `npm run build` realiza solo la compilación estática, sin repetir todas las pruebas en Vercel.
- Las compilaciones necesitan `OBI_SUPABASE_URL` y `OBI_SUPABASE_PUBLISHABLE_KEY` explícitas. Una vista previa no puede usar el Supabase de producción. Nunca pasar claves secretas al navegador.
- Para cambios con migraciones de base de datos, revisar y probar las migraciones de forma independiente antes de publicar código que dependa de ellas.
- Mantener los despliegues y la QA dentro de las cuotas ya incluidas; no habilitar add-ons ni servicios con cargos adicionales.

## Auditorías y mantenimiento

- Las pruebas automatizadas están en `scripts/*-check.mjs` y `.github/workflows/`.
- Trabajar en una rama basada en `main`, abrir PR, verificar todos los checks y fusionar por squash. Revisar el despliegue `READY` y la asignación de dominio antes de anunciar publicación.
- Los archivos antiguos permanecen temporalmente como referencia; eliminarlos solo después de demostrar que ningún script o documento depende de ellos.
