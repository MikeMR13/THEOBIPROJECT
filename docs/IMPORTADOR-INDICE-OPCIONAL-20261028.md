# Importador — índice editorial opcional por volumen (28/10/2026)

## Qué decide cada traductor

En **Studio → Importar contenido → Revisar**, aparece la casilla **«Mejorar los títulos del índice público de este volumen»**, con vista previa de la sección seleccionada. Es voluntaria: para volúmenes nuevos inicia desactivada. Si se importa sobre un volumen ya existente, se muestra su preferencia actual.

- **Desactivada:** la ficha pública conserva su índice habitual, con número global y título original.
- **Activada:** la ficha separa, cuando reconoce el prefijo, el número editorial («Capítulo 01», «Capitulo 01», «Captiulo 1», «Cap. 02») del nombre; presenta prólogos y otros tipos sin repetir la etiqueta si el título empieza con ella.
- Si el título no incluye prefijo reconocido (p. ej. «El despertar»), no se inventa un número editorial: se muestra «Sección» y el número global como metadato.
- En la vista previa del importador, «Captiulo» se detecta y se explica que la ficha mostrará «Capítulo» sin reescribir el título original.
- La opción se aplica al **índice de todo el volumen**. Si el equipo agrega secciones a un volumen existente, la elección actualizada afecta a todas las entradas de ese volumen.

## Garantías

- Los valores de `chapters.title`, `chapters.num`, el cuerpo `body`, los enlaces `/leer/:slug/:num`, el progreso, las revisiones y las descargas no se modifican.
- No se reinterpreta el número editorial como identificador de capítulo. La insignia «Sección global N» permite explicar la diferencia.
- La preferencia reside en `volumes.format_chapter_titles boolean not null default false`, con migración **aditiva**. Los volúmenes antiguos siguen apagados por defecto.
- La casilla es decisión del traductor, no una configuración global. No habilitar automáticamente en obras existentes.
- La importación conserva el mecanismo previo de copia/rollback del volumen. Si cambia la preferencia de un volumen existente, el valor anterior también se incluye en el respaldo para deshacer errores.
- No se cambian políticas RLS ni se introducen servicios de pago.

## Validación

`node scripts/chapter-title-import-optin-check.mjs` comprueba prefijos, títulos ambiguos, secciones, modo desactivado, persistencia y preservación de rutas.

La comprobación se incorpora a GitHub Actions. El despliegue de la aplicación necesita que la migración aditiva esté aplicada **antes de desplegar** el código que consulta `format_chapter_titles`.
