# Estudio editorial — ficha completa en Nueva obra e Importar
Fecha: 2026-10-20
Rama: `feat/studio-ficha-importacion-relaciones-20261020`
Base: `test/integracion-fases1-5-preferencias-20261020`

## Objetivo
Al crear una obra manualmente o importar un EPUB/DOCX/PDF como **novela nueva**, presentar los mismos campos editoriales, evitar metadatos incompletos y permitir enlazar obras relacionadas desde el primer guardado. Mantener HTML, CSS y JavaScript nativo, flujos de permisos, publicación en borrador, estilos negro/dorado/naranja y sin costes extra.

## Cambios realizados
- `src/studio-work-fields.js`: catálogo compartido de géneros, demografías con definiciones breves, tipos de relación, creación de ficha, estado editable y normalización de datos.
- `src/studio.js`: formulario completo de Nueva obra; creación **privada**; portada opcional JPG/PNG/WebP (hasta 8 MB); relación opcional con obras del catálogo de otros equipos; conservación del segundo paso «primer volumen» y su primer capítulo; búsqueda de géneros y descripción de demografía también al editar Datos de la obra.
- `src/studio-importer.js`: al elegir «+ Nueva obra» en Destino, se muestran todos los campos compartidos con datos prellenados del EPUB cuando existen. El flujo de volumen de obras existentes se mantiene intacto. Se conserva la selección de portada, secciones, fuentes incrustadas, modo de importación y publicación.
- `src/studio.css`: retícula responsive, campos con ancho estable, chips de género con búsqueda y relación accesible.
- `src/app.js`: versión de importación de Studio actualizada; `studio.css` y el importador actualizan sus versiones de ruta.
- `scripts/studio-work-fields-check.mjs`: prueba aislada para catálogos, validación, normalización y ambos flujos; adaptadas las pruebas funcionales y de navegador preexistentes.
- CI: incorpora `npm run studio-fields-check`.

## Demografías
Valores anteriores conservados: Shōnen, Shōjo, Seinen, Josei.
Nuevas opciones: Kodomo, Juvenil general (valor Juvenil), Young Adult, New Adult, Público general (valor General).
«Sin asignar» continúa disponible. La explicación visible es editorial y **no** una calificación por edad; el campo +18 sigue siendo independiente.

## Géneros
Se conservan los anteriores sin migración, y se añaden opciones como Academia, Alquimia, Apocalíptico, Aventura espacial, Boys Love, Chicas mágicas, Comedia romántica, Cultivo, Detectives, Demonios, Dungeon, Economía, Espionaje, Familia, Fantasía urbana, Girls Love, Gótico, Horror cósmico, Idols, Intriga política, Misterio sobrenatural, Otome, Política, Regresión temporal, Romance histórico, Sátira, Steampunk y Viajes en el tiempo. Máximo cuatro seleccionados, con búsqueda en el selector.

## Obras relacionadas
La tabla `public.series` **ya tiene** `relations jsonb NOT NULL DEFAULT '[]'`. Se utiliza el mismo formato que la edición actual (`[{id, kind}]`) y las mismas claves: `precuela`, `secuela`, `spinoff`, `universo`, `paralela`, `adaptacion`, `alterna`, `otra`. Límite de 12 enlaces. Se consultan obras publicadas o del equipo propio visibles mediante RLS; el enlace no transfiere permisos de edición a otros equipos.

## Compatibilidad
- Campos: `series.demographic` (texto nullable), `genres` y `tags` (arrays), `relations` (jsonb), `title_romaji`, `publisher`, estados editoriales y `cover_path`, ya presentes en el esquema comprobado.
- No requiere una migración SQL.
- Toda obra nueva comienza con `published=false`. Los estados no confirmados de la obra original conservan «Sin asignar».
- El estado de traducción no admite NULL en el esquema actual: conserva el valor inicial explícito «En traducción» y permite las opciones reconocidas por el código.
- El importador sigue haciendo rollback de obras, volumen, capítulos y multimedia en errores de importación.
- En creación manual, si falla la carga de portada tras crear la ficha, la obra privada permanece creada; se informa de la incidencia y la portada puede añadirse después.

## Validaciones
1. `npm run check` — sintaxis de JS.
2. `npm run studio-fields-check` — datos y catálogos.
3. `npm run studio-functional-check` — obra -> volumen -> capítulo y permisos.
4. `npm run studio-browser-check` — Chromium con Supabase simulado.
5. `npm run verify` y `npm run integration-check` — regresiones de estilos e integración.
6. Confirmar visualmente en móvil y escritorio: título extenso, 4 géneros, descripción demográfica, selector de relación y portada.

Estado: implementado en rama independiente. **Sin merge ni despliegue a producción; el resultado definitivo depende de CI y revisión funcional.**
