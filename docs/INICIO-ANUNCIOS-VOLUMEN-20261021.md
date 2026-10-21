# Inicio editorial — prioridad a volúmenes completos (21/oct/2026)

## Objetivo
En Home, un volumen publicado desde Studio se presenta como una **única novedad editorial**: «¡Nuevo volumen! · Título de la obra — Volumen N». Si la publicación es individual, se conserva «Cap. N — Título». No se anuncian sus capítulos como si fueran lanzamientos independientes al mismo tiempo.

## Implementación (HTML, CSS y JavaScript nativo)
- `src/home-releases.js`: selecciona el último evento visible de cada obra. Reconoce el lanzamiento completo con `volumes.status='published'`, `volumes.published_at` y `volumes.announced_at` (esta última marca se escribe desde `private.run_publications()` al anunciar el volumen). Si después se publica otro capítulo, este pasa a ser la novedad más reciente.
- Se permite una tolerancia editorial de 30 minutos para que los capítulos publicados en la misma transacción no sustituyan accidentalmente el anuncio del volumen. Nunca se atribuye el tipo «volumen completo» a un capítulo sin esa marca.
- La consulta de volúmenes que Home **ya hacía** se reutiliza para recoger los metadatos de publicación; no se añade una llamada de red. Se filtran volúmenes publicados y se conservan portadas/fechas.
- `src/ui.js`: franja de novedades, bloque «Nuevos volúmenes y capítulos» y portada destacada muestran el tipo editorial correspondiente. La noticia de volumen presenta título de obra, número, subtítulo opcional, portada y acceso a su ficha. Las publicaciones individuales siguen enlazando al lector.
- Se utiliza la identidad cromática actual (negro, amarillo, tonos papel) y se conservan las reglas responsive, la accesibilidad y la reducción de movimiento.

## Casos de prueba
`npm run home-volume-check`, integrado a `.github/workflows/ci.yml`:
1. Varios capítulos publicados a la vez como volumen: se muestra un solo «Nuevo volumen».
2. Nuevo capítulo posterior al volumen: vuelve a mostrarse capítulo.
3. Volumen anunciado sin capítulos locales (publicación externa): también aparece.
4. Borradores, fechas futuras y volúmenes sin anuncio: no se promocionan como completos.
5. Capítulos antiguos de días distintos no se agrupan.

## Verificación y despliegue
- Rama de trabajo: `feat/inicio-anuncios-volumen-20261021`.
- Base: `test/integracion-fases1-5-preferencias-20261020`.
- **No se modificaron tablas, RPC, permisos, notificaciones ni se desplegó a producción.**
- La presentación de Home conserva el comportamiento anterior si la consulta de volúmenes falla: novedades por capítulo.
- Pendiente antes de fusionar: comprobar el CI y revisar la presentación real en móvil y escritorio sobre una vista Preview aislada.

## Alcance excluido
Los avisos de la campana, correos, lanzamientos históricos y flujos de publicación de Studio no se alteran en esta fase. Se trata únicamente de la portada de inicio.
