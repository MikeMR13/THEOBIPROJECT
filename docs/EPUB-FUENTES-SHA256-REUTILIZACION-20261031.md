# Fuentes EPUB compartidas por SHA-256 y equipo

## Objetivo
Cuando un EPUB incorpora bytes de fuente idénticos a otros archivos del **mismo equipo**, reutilizar la URL existente, sin duplicar almacenamientos por cada volumen o importación. Dos archivos con el mismo nombre pero bytes diferentes jamás se consideran iguales.

## Diseño implantado
- `src/import-font-reuse.js`: usa Web Crypto SHA-256 del contenido, reconoce WOFF2, WOFF, OTF y TTF por cabecera. La ruta nueva para fuentes compartidas es `{teamId}/fuentes/sha256-{hash}.{ext}`. El primer elemento de la ruta mantiene la política Storage de acceso por equipo.
- Antes de subir una fuente nueva, comprueba si existe el objeto canónico y verifica su contenido mediante descarga y SHA-256. Si coincide, reutiliza su URL. Si falta, la sube con `upsert:false`.
- Si dos importaciones suben simultáneamente los mismos bytes, la segunda puede recibir `KeyAlreadyExist`: se descarga y verifica el objeto ganador; solo se reutiliza si SHA-256 coincide. Una discrepancia es error, nunca sobrescritura.
- Fuentes previas a la mejora: búsqueda acotada en `volumes.epub_fonts` de **volúmenes activos del mismo equipo**, con límite de 250 registros y 12 archivos a comparar. Solo se reutilizan después de comprobar los bytes. Si el usuario no tiene permiso para consultar un archivo legado, se omite esa coincidencia y se usa el almacén canónico.
- Las descripciones por volumen conservan `family/style/weight/use` y añaden `sha256` para reducir futuras comparaciones.
- Imágenes y portadas siguen utilizando nombres exclusivos por importación; su funcionamiento no se modifica.

## Rollback, eliminación y seguridad
- Una fuente compartida, tanto existente como recién subida a la ruta canónica, **nunca se añade** al arreglo `uploaded` que el importador revierte si falla. Esto evita que otra importación concurrente termine apuntando a un archivo que el rollback haya borrado.
- La eliminación actual utiliza `media_in_use(p_team,p_paths)`, que revisa `volumes.epub_fonts` de otras obras/volúmenes y evita borrar archivos con referencias. Las fuentes canónicas se mantienen deliberadamente en Storage durante el borrado normal hasta poder garantizar una recolección coordinada segura.
- **Límite reconocido:** si se sube una nueva fuente compartida y falla después el guardado del volumen, puede quedar un archivo canónico sin referencias. Se prefiere ese posible residuo pequeño frente a romper lecturas concurrentes. No se implementa un recolector automático en esta entrega.
- Al usar SHA-256 se verifica la igualdad de bytes, no se presupone por coincidencia de nombre. Los permisos existentes de Supabase y RLS no cambian. No se comparte almacenamiento entre equipos.
- No se alteran datos previos, se migran fuentes automáticamente ni se elimina multimedia existente.

## Pruebas
`scripts/epub-font-dedupe-check.mjs` usa un Storage falso: mismo EPUB dos veces, nombres distintos/bytes iguales, mismo nombre/bytes diferentes, fuente legacy del propio equipo, otras identidades, conflicto paralelo 409, hash de objeto no coincidente y error de lectura 403. Mantener además `epub-storage-keyalreadyexist-check.mjs`, pruebas del importador, el recorrido de Studio Chromium y CI gratis.

## Validación real pendiente
Una importación autenticada de un EPUB con fuentes en dos volúmenes y comprobación del CSS de lectura. Las pruebas aisladas no contactan con el Storage de producción. No se han contratado servicios ni aumentado los planes de Supabase, Vercel o Cloudflare.
