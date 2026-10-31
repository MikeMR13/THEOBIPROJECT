# Entrega 2 — Errores visibles al lector

## Alcance

1. **Ranking en Inicio:** `src/ui.js` muestra `cover_thumb_path || cover_path` solo en las tarjetas pequeñas de `ob-rank-car`. Mantiene la portada original para Hero, publicaciones y carrusel de Continuar. El repositorio de Supabase ya dispone de miniaturas para las 14 obras actuales, por lo que no se regeneran ni se suben imágenes.
2. **Mi biblioteca:** se añade `section_type` a la consulta ya existente de capítulos. Se usa `editorialChapterLabel()` para el texto del resumen de «Reanudar última lectura» y las tarjetas. Un capítulo global `num=25` puede tener el título editorial «Capítulo 1» y se representa como `Cap. 01`. Prólogo y Epílogo no reciben números inventados.
3. **Cabecera Continuar:** la lectura guardada sigue en `/leer/<slug>/<num-global>`; para presentar su etiqueta se consulta de manera acotada el título y tipo del capítulo reanudado, cacheados en memoria por obra y número interno. Cuando no hay metadatos (offline o respuesta incompleta) se muestra **«Sección»**, sin exponer el número global. No se altera el motor del lector, progreso ni URLs.
4. **Pendientes:** los rótulos aclaran que los contadores de estantería representan **obras** seguidas con capítulos sin leer. Se mantienen intactos los conteos internos y el hecho de que una obra puede figurar a la vez en Leyendo y Pendientes.
5. **Apoyar:** se corrigen en presentación exclusivamente las erratas exactas «Apoya a la El Obi del Lector» → «Apoya a El Obi del Lector» y «ptoyecto» → «proyecto». Se elimina el encabezado genérico duplicado «Niveles de Patreon» en modalidad `both`. Se conservan por completo los modos `links`/`both`/`patreon`, las URL, los niveles y los avisos sobre el carácter voluntario del apoyo.

## Origen de los textos

Los textos de Apoyar provienen de `public.platform_settings.support` (id=1) y no son literales del código principal. Para corregir **también** el registro fuente se incluye `sql/entrega2-support-copy-review.sql`, un script manual, idempotente, con condiciones de valor exacto que conserva el resto del JSONB. **No se ha ejecutado** y no forma parte de las migraciones automáticas. La interfaz ya presenta las dos erratas corregidas al desplegar el código, incluso si la configuración todavía contiene las erratas antiguas.

## Validación

`node scripts/entrega2-lectura-visible-check.mjs` cubre mediante datos ficticios:
- Prioridad de miniatura en Ranking y conservación de portada original para Hero.
- Secciones no numeradas y numeración editorial con títulos de varios volúmenes.
- Persistencia de `num` en rutas y lecturas, sin renumerar filas.
- Conteo de obras de la estantería Pendientes sin recalcular progreso.
- Correcciones de Apoyar sin cambiar enlaces, modo de apoyo, Patreon ni valores fuente.
- SQL para revisión manual, sin conexiones ni modificaciones reales.

El test se ejecuta en `.github/workflows/ci.yml`, junto con la batería existente de lector, biblioteca, editor y responsive.

## Fuera de alcance

No se modifican esquema de Supabase, datos de producción, permisos, Patreon, publicaciones, reglas de Difusión, lectura offline ni diseño global. El PR se mantiene en borrador y **no se fusiona ni se despliega** sin una decisión posterior.

Nota: la corrección de datos del script SQL requiere revisión/ejecución separada. Ninguna acción descrita necesita activar servicios de pago.
