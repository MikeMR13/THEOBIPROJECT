# Difusión Discord · Fase 2b · Anuncios editoriales manuales

**Estado:** preparado en rama aislada, aún NO desplegado en producción.

## Uso
- Centro de Difusión → **Anunciar** → conectar canal, elegir nueva obra, volumen o capítulo, crear vista previa, editar texto y confirmar envío.
- Se utiliza la portada ya almacenada en `obi-media` cuando su ruta es segura, además del título y el enlace canónico construido por SQL.
- El servidor revalida permisos de Difusión por equipo, su pertenencia, estado activo del canal y visibilidad pública de obra/volumen/capítulo, incluidas fechas y exclusividad temporal de mecenas.
- El mismo contenido no puede enviarse dos veces al mismo canal. Cada entrega crea un único evento/trabajo; si hay timeout queda con estado `unknown` sin reintentos.
- Límite de un anuncio cada 15 segundos por canal. Mensaje explícitamente confirmado; Discord `allowed_mentions=[]`.
- No hay jobs periódicos, herramientas de terceros nuevas, ni programación automática.

## Despliegue pendiente de aprobación
1. Validar migración `supabase/migrations/20261026010751_diffusion_discord_announcements_manual_20261025.sql` en Supabase local y con roles ficticios.
2. Aplicar SQL aditivo al Supabase existente.
3. Desplegar **nueva** función `diffusion-announcement` con JWT obligatorio; no cambiar `diffusion-discord` (prueba ya operativa).
4. Integrar frontend mediante PR y utilizar despliegue normal de Vercel existente.
5. Confirmar manualmente el primer anuncio real.

Se conserva la autonomía de los equipos; Bibliotecario opera exclusivamente conexiones oficiales. Las publicaciones automáticas siguen desactivadas.

## Portadas por nivel editorial (25 de octubre de 2026)
- **Obra:** únicamente portada general de esa obra.
- **Volumen:** únicamente portada del volumen correspondiente.
- **Capítulo:** portada del volumen que contiene al capítulo.
- No hay sustitución por otra portada; cuando falta la imagen requerida, se detiene el anuncio antes del envío y se explica en la interfaz.
- Validación de rutas seguras en servidor; no cambia anuncios previos.
- Migración productiva: `20261026012634_diffusion_discord_cover_by_publication_level_20261025.sql`.
