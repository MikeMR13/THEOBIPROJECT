# Portada mixta de Inicio — rotación de destacadas (21 de octubre de 2026)

## Selección visible
- Hasta 8 novelas diferentes por día: 2 nuevos lanzamientos y 1 de cada grupo: popular de la semana, histórico, elección editorial, joya por descubrir, tendencia y recomendación de equipos.
- Hasta 3 candidatas por categoría. En equipos hay **una candidatura activa por equipo** y **una recomendación visible** en el carrusel cada día.
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
- Cada equipo tiene **una sola selección activa**. Al pulsar «Destacar» en otra, la anterior se reemplaza atómicamente. «Quitar» deja el equipo sin recomendación.
- Tabla `public.team_featured_series` con clave primaria `team_id`, RLS de lectura de solo obras públicas y RPC `public.team_feature_set` que verifica `private.team_can` y pertenencia `series.team_id`. Sin permisos de escritura directos para clientes.
- La recomendación no modifica las selecciones de administradores de El Obi (`platform_settings.featured`) ni las notificaciones de Studio.

## Validación y despliegue
- `npm run home-featured-check`: límites, diversificación, estabilidad diaria, excepción de novela completa y contratos de seguridad/UI.
- `npm run home-hero-layout-check` y toda la batería de CI para los tamaños responsive.
- SQL en `supabase/migrations/20261115_team_featured_carousel.sql`. Aplicar primero la migración y verificar los permisos; desplegar el frontend después.
