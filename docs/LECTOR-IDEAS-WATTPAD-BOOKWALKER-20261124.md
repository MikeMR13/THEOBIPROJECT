# Lector · ideas de Wattpad, BOOK☆WALKER y Kindle (24-nov-2026)

Rama: `feat/lector-ideas-wattpad-bookwalker` (sale de `test/integracion-fases1-5-preferencias-20261020`).
Costo: $0. Nada usa servicios nuevos; todo corre en el navegador o en tablas que ya existían.

## Qué se agregó

| Función | Inspirada en | Dónde | Necesita la migración |
|---|---|---|---|
| Comentarios por párrafo: globo con contador, panel filtrado, «Comentar» al seleccionar | Wattpad | `reader.js` (usa `comments.para`, que ya existía y el Estudio ya mostraba) | No |
| Modo paginado: columnas CSS, toque en bordes, deslizar, ← → AvPág, progreso por página | BOOK☆WALKER / Kindle | `reader.js`, `reader-plus.css` | No |
| Visor de ilustraciones: pantalla completa, zoom con toque, galería del volumen, «Ir al capítulo» | BOOK☆WALKER | `reader-extras.js` (carga diferida) | Solo la galería completa (`volume_images`); sin ella muestra las del capítulo |
| Glosario sin spoilers: el término se marca desde un capítulo y sus datos se revelan por capítulo | Kindle X-Ray | `reader.js`, Estudio › Glosario | Sí (`since_num`, `updates`) |
| Notas del traductor emergentes (Aa › Notas del traductor) | Kindle / Apple Books | `reader.js`; el importador convierte notas al pie de EPUB en notas | No |
| Tiempo restante con velocidad personal; un toque alterna min / % capítulo / % volumen / página | Kindle | `reader.js` | No |
| Final de capítulo: 6 reacciones con conteo + adelanto del siguiente | Wattpad / Webnovel | `reader.js` (usa la tabla `reactions`, que ya existía) | No |
| Cita como imagen: ver «Tarjeta de cita» abajo | Wattpad / Kindle | `reader-extras.js` | Solo para elegir entre todas las ilustraciones del volumen; sin ella, las del capítulo abierto |

Ajustes nuevos en Aa (se guardan como los demás, globales o por volumen): `layout` (scroll/paged), `notes` (inline/popup), `pcom` (globos sí/no). La velocidad de lectura se guarda en `reader_prefs.global.wpm`.

## Antes de publicar
1. Supabase › SQL Editor: ejecutar `supabase/migrations/20261124_lector_glosario_spoilers_ilustraciones.sql`.
   Solo agrega columnas opcionales y una función de lectura (`security invoker`, respeta el RLS de `chapters`).
   También agrega `glossary_terms.updated_at`, que el Estudio ya usaba al editar un término y no existía en producción.
2. El lector funciona sin la migración: el glosario se comporta como antes y la galería usa las ilustraciones del capítulo abierto.

## Decisiones
- El número de nota y el contador de comentarios se pintan con CSS (`attr(data-n)`), no como texto: así los subrayados, las citas y la posición guardada por párrafo no cambian.
- Las notas emergentes se ocultan con clase (`.tn-hid`) y no se quitan del DOM, para que los índices `data-b` sigan iguales.
- En paginado se pausa la lectura continua (solo el capítulo activo); el pie con «siguiente capítulo» aparece al pasar la última página.
- El adelanto del siguiente capítulo solo usa texto ya descargado por la precarga existente (respeta ahorro de datos y 2G).
- La cita como imagen limita a 280 caracteres para que no se compartan capítulos completos.

## Tarjeta de cita (todas las opciones)
Panel con 4 pestañas; la última combinación se recuerda en el dispositivo (`obi-quote-card`), nunca el texto.
- **Imagen**: fondo color / portada del volumen (o de la obra) / ilustración del volumen (selector de miniaturas); diseño Obi, imagen completa, dividido o marco; encuadre (5 posiciones); con imagen completa, oscurecer (0–80 %) y desenfoque.
- **Texto**: recortar la cita (solo recortar: si el texto no está dentro de la selección original se rechaza, para no atribuir a la obra algo que no dice), tipografía (Mincho, Literata, Manuscrita, Sans), tamaño (automático, grande, mediano, pequeño), alineación, comillas (「」, « », “ ”, ninguna) y «dicho por» (40 caracteres).
- **Colores**: Noche, Papel, Puerto, Sakura, Bosque, Tinta, Temporada (acento de la temporada activa) y Equipo (`teams.color`).
- **Formato**: 4:5, 1:1, 9:16 y 16:9; mostrar u ocultar título, volumen y capítulo, equipo y el usuario de quien comparte. La dirección del sitio siempre aparece.
- **Cómo se elige el texto**: seleccionando en el lector (arrastrar con el mouse o mantener presionado en el celular) y tocando «Imagen». La selección puede abarcar varios párrafos seguidos del mismo capítulo (se omiten notas del traductor, ilustraciones y separadores; la tarjeta respeta los saltos de párrafo). «Párrafo completo» en el menú de selección hace la tarjeta con los párrafos enteros, así en el celular basta mantener presionada una palabra. Con mouse, al pasar sobre un párrafo aparece un botón 「 en el margen que cita ese párrafo sin seleccionar (un solo botón que se mueve; no aparece si no cabe en el margen ni en pantallas táctiles). Los subrayados siguen guardándose por párrafo.
- Acciones: compartir (hoja nativa con archivo), descargar PNG, copiar imagen al portapapeles, copiar texto y restablecer.

## Segunda revisión (24-nov, tarde)
- Velocidad de lectura: las pausas largas ya no se descartan (se cuentan hasta 2 min); antes un lector lento en paginado salía «rápido».
- Paginado: espacio sobre un botón enfocado lo activa en vez de pasar página; → en la última página con el pie a la vista abre el siguiente capítulo; sin escuchas duplicadas al alternar el modo; alto de página medido en vivo (antes se cortaba la última línea en celular) y recalculado si cambia la barra o cargan ilustraciones; se guarda el primer párrafo que empieza en la página.
- Tarjeta de cita: imágenes vía `fetch` CORS + `createImageBitmap` (como las miniaturas del Estudio), con respaldo para SVG; si una imagen falla se avisa en el panel y se conserva la elección. Vista previa fija arriba en celular.
- La ficha (`series`) y los volúmenes ahora traen `cover_path` para la portada de la tarjeta.

## Pruebas
- Todo `npm run check/build/verify/...` y las pruebas de navegador del CI: OK.
- Prueba e2e con Supabase simulado (sin red), Chromium 1280×860 y 390×844: 106 comprobaciones OK, sin errores de consola
  (glosario por capítulo, globos y panel por párrafo, notas emergentes, visor + galería + teclado, tarjeta PNG, reacciones,
  adelanto, tarjeta con portada / ilustración / Obi / imagen completa / historia / crédito, paginado: páginas, teclado, toque, progreso guardado y restaurado tras recargar).

## Pendiente / siguiente paso posible
- Pestaña «Ilustraciones» en la ficha de la serie reutilizando `volume_images` y el visor.
- Notas al pie de DOCX en el importador (hoy solo EPUB).
- Reacciones por párrafo (requeriría una tabla nueva).
