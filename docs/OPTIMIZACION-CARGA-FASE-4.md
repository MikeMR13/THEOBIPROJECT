# THEOBIPROJECT — Fase 4: modularización nativa de Studio

**Estado:** implementación en rama de GitHub, no fusionada ni desplegada.
**Rama:** `optimization/native-js-studio-phase4-20261020`.
**Base:** `optimization/native-js-loading-phase3-20261020` (Fase 3 / PR #4).
**Stack conservado:** HTML, CSS, JavaScript ES Modules, Supabase/PostgreSQL, Vercel y Service Worker; no se agregó framework ni dependencia.

## 1. Validación de entrada

- PR #4 de Fase 3 abierto en borrador, sin fusionar. CI #39429393127: SUCCESS para el commit 014d09a13d944a89a35cc6e1b3d9672e990145de.
- PR #1 de estabilización independiente; PR #2, PR #3 y PR #4 sin fusionar.
- Propuesta SQL de `home_snapshot` de Fase 2 todavía NO aplicada. Esta fase no ejecuta SQL ni crea recursos de pago.

## 2. Cambios implementados

| Archivo | Modificación | Comportamiento preservado |
|---|---|---|
| `src/studio.js` | Sustituye editor, importador y biblioteca multimedia por imports dinámicos con caché de promesas/factory. Conserva rutas y nombres `editor`, `importer` y `library`. | Selector de equipo, permisos, menú, navegación y funciones del tablero. |
| `src/studio-editor.js` | Traslada el editor existente a `createEditor(deps)`, carga `blocks.js` solo cuando se necesita. | Guardado, autoguardado, borradores, notas, ruby/furigana, historial, revisiones, ilustraciones y publicación. |
| `src/studio-importer.js` | Traslada asistentes y analizadores EPUB/DOCX/PDF a `createImporter(deps)`; los servicios de importación solo se solicitan al entrar en esa vista. | Fuentes EPUB, CSS, negritas/cursivas, imágenes, secciones, portada, sustitución/append, programación y reversión si falla. |
| `src/studio-media.js` | Traslada la biblioteca de Storage a `createLibrary(deps)` sin alterar sus acciones. | Carpetas, paginación, carga, borrado controlado con `media_in_use`, seleccionar y cambiar portada. |
| `src/studio.css` | Extrae los estilos originales del string STCSS sin interpolaciones dinámicas. | Diseño, accesibilidad y responsive del Estudio. |
| `src/studio.js` (estilos) | Crea `link rel=stylesheet` una vez y espera carga en `ensure()`, en paralelo con la consulta de permisos. | Evita mostrar el tablero sin estilos. |
| `src/studio-importer.js` (PDF) | Retira un intervalo sin relación con el PDF que hacía referencia a UI de otra pantalla. | Análisis PDF, sin temporizador cruzado. |
| `scripts/build.mjs` | Verifica sintaxis del test Fase 4. Excluye `studio-editor.js`, `studio-importer.js`, `studio-media.js` de la lista de precargas opcionales automáticas del Service Worker. | Descarga solo cuando el usuario abre esa función. |
| `scripts/phase4-check.mjs` | Pruebas de módulos/guards, build, hash de imports, CSS y multimedia protegida. | Gate CI. |
| `package.json`, `.github/workflows/ci.yml` | Integra `npm run phase4-check`. | Conserva CI de fases anteriores. |

## 3. Medida de estructura — NO es Lighthouse

- Código fuente original `src/studio.js`: **371,917 bytes**.
- Tras mover editor, importador, biblioteca multimedia y CSS: aproximadamente **233 KB** en `src/studio.js`, ~37% menos JavaScript inicial de Studio sin minificar.
- Los módulos extraídos siguen existiendo y se descargan únicamente en las pantallas correspondientes. Esta división no elimina funcionalidades ni representa igual porcentaje de reducción del peso total del proyecto.
- La hoja CSS se descarga una sola vez; no contiene dependencias de JSX, React, Next.js ni cambios a la base.
- No hay medición de LCP/INP/CLS con navegador para esta rama todavía. No confundir el ahorro de bytes fuente con aceleración medida.

## 4. Validación automática

```sh
npm install --no-audit --no-fund
npm run check
npm run build
npm run optimize-check
npm run db-phase2-check
npm run phase3-check
npm run phase4-check
```

Estas verificaciones cubren sintaxis, empaquetado, resolución de imports dinámicos, presencia de funcionalidades y guardias de permisos. NO sustituyen pruebas de uso real con una sesión autorizada en navegador.

## 5. Escenarios obligatorios en staging antes de fusionar

1. Desde Resumen, Obras y Perfil no descargar `studio-editor.js`, `studio-importer.js` ni `studio-media.js`. Abrir cada ruta y confirmar una sola descarga del módulo correspondiente.
2. Editor: crear y editar capítulos, autoguardado, borrador local, historial, publicador, notas, separadores, negritas, cursivas, ruby, ilustraciones, vista paginada y vista previa.
3. Importador: EPUB con fuentes y HTML/CSS interno, DOCX con imágenes, PDF; detectar capítulos, revisar, portada, publicar/programar y comprobar reversión ante error.
4. Multimedia: navegar carpetas, subir, paginar, copiar enlaces, cambiar portada, impedir borrar medios en uso.
5. Permisos: propietario/administrador/traductor/revisor/lector, y cambio de cuenta o equipo; conservar RLS.
6. Navegación rápida, volver al editor y abrir importador varias veces; sin listeners duplicados ni estado huérfano.
7. Probar CSS en móvil/escritorio y reducir movimiento, sin flash sin estilos; PWA y lectura offline.
8. Lighthouse móvil/escritorio, Web Vitals y comparación de kilobytes reales contra la rama anterior, en una preview con backend aislado.

## 6. Estado de integración y restricciones

- Esta fase debe proponerse mediante PR en borrador dirigido a la rama de Fase 3, no directamente a `main`.
- No aplicar SQL de Fase 2 sin pruebas de migración/reversión en una base aislada; tampoco desplegar estas ramas en producción.
- La extracción posterior de estadísticas, preferencias avanzadas y otros componentes administrativos es opcional tras pasar las pruebas funcionales de esta fase: evitar refactorización simultánea de permisos y publicaciones.
- Revisar compatibilidad con PR #1 (estabilización) antes de fusionar la cadena de PR.

## 7. Historial de validación

El resultado del CI final debe anotarse aquí después de que GitHub Actions termine para el último commit de la rama.
