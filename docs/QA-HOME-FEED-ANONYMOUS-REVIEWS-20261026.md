# Privacidad de reseñas en Inicio — validación cero costos

## Hallazgo verificado en Supabase (26 oct 2026)

La web tiene dos rutas independientes:
- `public.home_reviews(integer)` **ya** aplica `case when r.anonymous then null else p.username end username`.
- `private.build_home()`, cuyos datos consume `public.home_feed()`, devolvía `p.username` para **todas** las reseñas, incluida una marcada `r.anonymous=true`.

La instantánea de Inicio incluye la clave `reviews`; por tanto, sin la protección, una futura reseña anónima podría devolver públicamente el nombre. **No se observaron reseñas reales en la base durante el análisis**, por lo que no se ha confirmado exposición de lectores concretos.

## Cambio propuesto

`sql/home-feed-anonymous-reviews-20261026.sql` reproduce la función original y cambia **una sola expresión**: `p.username` por `case when r.anonymous then null else p.username end username`.

Se preservan el nombre de la clave JSON, orden, longitud de extractos, demás columnas, portada, ratings, carousel, ranking y todas las funciones y tablas. El SQL incluye una precondición de versión y se revierte con `sql/home-feed-anonymous-reviews-rollback.sql`.

## Prueba de PostgreSQL efímera

El workflow `.github/workflows/home-anon-reviews-qa.yml` crea tablas con identidades ficticias y copia las definiciones de `build_home`, `home_feed` y `home_reviews` obtenidas de la base actual. Comprueba:

1. Se reproduce el bug antes del parche, con cuenta ficticia.
2. La reseña anónima no devuelve username tras el cambio.
3. La reseña pública sí conserva su nombre.
4. Las claves esenciales de Inicio permanecen.
5. `public.home_feed()` devuelve los datos protegidos desde el snapshot.
6. `public.home_reviews()` conserva la protección que ya tenía.
7. Rollback SQL restaura la definición original.
8. Prueba con rol `anon` de la ruta pública.

## Puerta de liberación

- La prueba en PostgreSQL aislado no modifica producción ni genera costos de infraestructura adicional.
- **El SQL está en `sql/` como candidato**, no en `supabase/migrations` todavía.
- Tras CI, generar migración con Supabase CLI y QA en la base real bajo ventana controlada, con verificación de caché y requisitos de privacidad.
- Para eliminar contenido cacheado previo tras aplicar en algún entorno, ejecutar `private.refresh_home()` de manera controlada; hacerlo en producción exige autorización y no se ha hecho.

**Estado: propuesto, sin cambios en Supabase de producción.**
