# Protección antibots de Cloudflare

## A. Al iniciar sesión, registrarse y recuperar contraseña (Turnstile) — ya está en el código
Protege: /entrar, /registro, «¿Olvidaste tu contraseña?», Preferencias › Cambiar contraseña y el Mostrador del Bibliotecario.
Google y Patreon no lo necesitan (los protege cada proveedor).

1. Cloudflare › Turnstile › Add widget
   - Nombre: El Obi del Lector · Dominios: tu dominio (y el *.vercel.app si pruebas ahí)
   - Modo: **Managed** (la mayoría de personas no tiene que hacer nada)
   - Copia la **Site key** (pública) y la **Secret key** (privada).
2. Supabase › Authentication › Attack Protection › **Enable Captcha protection**
   - Proveedor: Turnstile · pega la **Secret key** · Guardar.
3. Vercel › Project › Settings › Environment Variables
   - `OBI_TURNSTILE_SITE_KEY` = la **Site key** · vuelve a desplegar.
4. Sube los archivos de este paquete (incluye `vercel.json` con el permiso CSP para challenges.cloudflare.com).

Orden importante: haz el paso 3 y despliega ANTES del paso 2. Si Supabase exige captcha y la web aún no lo manda, nadie podrá entrar con correo.
Sin la variable del paso 3, la web funciona como antes (sin captcha).

## B. Al entrar a la página (desafío en el borde)
Esto no se hace con código del sitio: lo hace Cloudflare antes de que la visita llegue a Vercel.
1. Agrega tu dominio a Cloudflare y cambia los nameservers en tu registrador.
2. DNS: los registros que apuntan a Vercel (A 76.76.21.21 / CNAME cname.vercel-dns.com) con **nube naranja (Proxied)**.
3. SSL/TLS › modo **Full (strict)**.
4. Security › Bots › **Bot Fight Mode: On** (plan gratis) o Super Bot Fight Mode (Pro): «Definitely automated» → Block, «Likely automated» → Managed Challenge, «Verified bots» → Allow (Google, Bing).
5. Security › WAF › Custom rules (opcional, más estricto en el acceso):
   - Si URI Path está en {`/entrar`, `/registro`, `/bibliotecario`, `/admin`} y Threat Score ≥ 10 → **Managed Challenge**.
6. Excluye de desafíos: `/sw.js`, `/manifest.webmanifest` y los archivos `.js/.css` (Configuration Rules o regla WAF «Skip»), para no romper la app instalada.

Nota: las lecturas de datos van directo a Supabase (*.supabase.co), no pasan por Cloudflare. Su protección son las políticas RLS y los límites de Supabase.
