# Portada mixta de Inicio — rotación de destacadas (21 de octubre de 2026)

## Selección visible
- Base editorial diaria de 7 posiciones: 2 nuevos lanzamientos y una obra de cada grupo: popular de la semana, histórico, elección editorial, joya por descubrir y tendencia. **Se agregan todas las obras recomendadas por equipos** sin límite de equipos ni de diapositivas en el carrusel.
- Hasta 3 candidatas por categoría editorial. **Los equipos no tienen límite conjunto**: cada equipo puede recomendar una obra, que aparece en el carrusel durante 7 días desde la elección y se retira automáticamente; si hay 14 equipos, las 14 recomendaciones pueden aparecer juntas.
- La rotación diaria es determinista en zona `America/Monterrey` y no depende de tareas programadas ni de cookies.
- Una novela puede pertenecer a varias categorías, pero se muestra una sola vez. No se rellenan espacios duplicando novelas si el catálogo es pequeño.
- Los lanzamientos de volúmenes publicados se anuncian como volumen, sin desglosar capítulos.

## Excepción inmediata: publicación de una novela completa
- Ante una publicación nueva de volumen completo identificada por `volumes.is_final = true` o porque la serie está marcada `translation_status = completed`, la novela pasa al primer lugar de los lanzamientos (máximo dos visibles).
- La excepción se aplica al construir cada Home y también a sesiones que permanezcan abiertas: una consulta ligera por minuto detecta un `announced_at` más reciente y actualiza Inicio automáticamente.
- Los demás grupos mantienen su lista del día. Al llegar el próximo día, se recalcula la portada con la selección más reciente.
- Para evitar confundir contenido histórico con estreno, solo se priorizan publicaciones válidas de los últimos siete días.

## Estudio → Mis obras → Destacar
- Control disponible en cada obra propia, publicada, para miembros con permiso `edit` o `publish`.
- Cada equipo tiene **una sola selección activa durante siete días exactos** desde su último «Destacar». Al pulsar «Destacar» en otra, la anterior se reemplaza atómicamente y comienza un nuevo plazo de siete días. «Quitar» deja el equipo sin recomendación.
- Tabla `public.team_featured_series` con clave primaria `team_id`, RLS de lectura de solo obras públicas **y no vencidas** y RPC `public.team_feature_set` que verifica `private.team_can` y pertenencia `series.team_id`. `updated_at` marca el inicio de los siete días; un trabajo `pg_cron` cada minuto elimina físicamente los registros vencidos. Sin permisos de escritura directos para clientes.
- La recomendación no modifica las selecciones de administradores de El Obi (`platform_settings.featured`) ni las notificaciones de Studio.

## Validación y despliegue
- `npm run home-featured-check`: 14 equipos simultáneos, siete días exactos, caducidad, diversificación sin duplicados, excepciones de novela completa y contratos de seguridad/UI.
- `npm run home-hero-layout-check` y toda la batería de CI para los tamaños responsive.
- SQL base en `supabase/migrations/20261115_team_featured_carousel.sql` y caducidad programada en `supabase/migrations/20261116_team_featured_expiry.sql`. La caducidad visible es exacta por RLS; la limpieza física se ejecuta cada minuto. Desplegar el frontend después de aplicar y verificar la migración.
