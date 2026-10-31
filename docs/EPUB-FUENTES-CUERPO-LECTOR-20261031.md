# EPUB: restablecer tipografía de párrafos y fragmentos

## Defecto comprobado (31/oct/2026)
En `reader.js`, las fuentes incrustadas por bloque se declaraban con `--fN:'obi-Familia',inherit`. `inherit` es una palabra clave global de CSS y no puede usarse como segunda familia dentro de una lista de `font-family`; por tanto, `font-family:var(--fN)` era inválido y el navegador recurría a la fuente heredada. Los títulos podían verse correctamente porque su regla principal `--fh` usaba una lista válida.

La vista previa del importador tenía el mismo problema: `--fN:'imp-N',inherit`.

## Reparación
- `src/reader-epub-fonts.js`: función pura compartible y comprobable `fontVars`. Con **Original del EPUB**, `--fN` devuelve `'obi-<vol>-<familia>',Literata,'Shippori Mincho B1',serif`, un valor CSS válido. Las variables `--fb` (cuerpo) y `--fh` (títulos) conservan los roles extraídos del EPUB.
- Con tipografía alternativa seleccionada por el usuario, `--fN:inherit` sin lista de nombres, evitando que el estilo importado imponga su fuente.
- El lector sigue usando los bloques guardados `data-epub-family` con el mismo orden de familias de cada volumen. No se altera la traducción, alineación, interlineado, el esquema de datos ni la colección multimedia.
- La vista previa usa `--fN:'imp-N',Literata,serif` en vez de la lista inválida.
- Renovación de versiones de caché: `reader.js?v=25`, `studio-importer.js?v=8`, `studio.js?v=64` y `app.js?v=55`.

## Reproducción y validación
Los datos existentes del volumen 16 de *¿Pensaste que la esposa online no era una chica?* ya contienen el mapeo de texto: la familia Times New Roman para la mayoría de los párrafos, Alba Matter para títulos y Quantico para fragmentos de diálogos. Las nueve fuentes están en Storage. No se necesita reimportar ni tocar los diez capítulos publicados.

El test `scripts/reader-epub-fonts-browser-check.mjs` levanta un servidor local y ejecuta Chromium real, utilizando `getComputedStyle` sobre HTML generado mediante el mismo `cleanInline` que emplea el lector, para comparar el cuerpo, el título, el diálogo y la preferencia Literata. No realiza solicitudes reales a Supabase ni carga archivos externos.

## Seguridad y costos
No hay escritura de datos de producción, cambios en permisos, nuevas fuentes, buckets, Edge Functions ni crons. Se utiliza el CI de GitHub Actions existente. Esta corrección permite que el navegador seleccione la fuente pretendida; su renderizado efectivo seguirá dependiendo de que el archivo de fuente sea compatible y esté accesible desde el navegador del lector.
