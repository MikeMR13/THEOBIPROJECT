# THEOBIPROJECT — QA aislado de Studio en navegador (fase posterior a PR #6)

**Fecha:** 20 de octubre de 2026.  
**Estado:** pruebas y seguridad de Preview implementadas, sin fusionar ni desplegar en producción.  
**Rama:** `qa/studio-browser-mock-20261020`.  
**Base:** `qa/native-js-studio-functional-20261020` (PR #6).  
**Stack:** HTML, CSS, JavaScript nativo con ES Modules, GitHub Actions, Vercel y Supabase. Sin frameworks ni dependencias npm nuevas.

## 1. Objetivo y aislamiento de datos

No hay rama de desarrollo de Supabase en `qfllthjpjuaztppvpsrk`. Los proyectos existentes incluyen producción y otros proyectos históricos/no dedicados a staging; **no se ha copiado ni migrado información real** ni creado un proyecto nuevo.

Las builds Preview de Vercel carecían de `OBI_SUPABASE_URL` y `OBI_SUPABASE_PUBLISHABLE_KEY`, lo que activaba valores de respaldo hardcodeados hacia **la base de producción**. Se implementaron dos controles, **únicamente en Preview**:

1. Variables Preview `OBI_SUPABASE_URL=https://obi-qa-backend.invalid` y `OBI_SUPABASE_PUBLISHABLE_KEY` con identificador ficticio público; `.invalid` es deliberadamente no enrutable. Se conservaron intactas las variables Production. Esta acción no habilita lectura o escritura de base real desde una Preview.
2. El build `scripts/build.mjs` de esta rama falla si `VERCEL_ENV=preview` y faltan variables específicas, o si la URL coincide con Supabase productivo. También elimina del HTML Preview la preconexión directa al dominio productivo. **No cambia la precarga de producción**.

**Alcance temporal:** las variables de Vercel Preview protegen las *nuevas compilaciones*. Las URL de compilaciones antiguas conservan sus propios `config.js`: no suponer que se han reconfigurado; **no utilizarlas para probar cuentas o datos**.

No se incurrió en nuevos servicios de paga. La ejecución de GitHub Actions usa minutos del plan disponible (que siguen sujetos a sus límites), sin suscribir servicios externos.

## 2. Navegador real y backend simulado

Archivos implementados:

- `scripts/studio-browser-e2e.mjs`: inicia un servidor HTTP de loopback `127.0.0.1` con lista blanca de rutas, abre Chrome/Chromium en headless, extrae resultados del DOM y exige éxito para salir con código 0.
- `scripts/fixtures/studio-browser-fixture.mjs`: monta el **`createStudio` real** en el DOM del navegador con respuestas de Supabase estrictamente simuladas. No utiliza credenciales ni hace conexiones al servicio real.
- `scripts/fixtures/studio-browser-parent.js`: ejecuta el mismo escenario dentro de un iframe con ancho declarado de **390 px**; el ancho útil del documento fue **375 px** (scrollbar). Comprueba CSS responsive y ausencia de desbordamiento horizontal importante.
- `scripts/preview-isolation-check.mjs`: verifica la compilación Preview sin dominio de Supabase productivo en `dist/config.js` ni `dist/index.html`.
- `scripts/build.mjs`, `package.json`, `.github/workflows/ci.yml`: sintaxis y nuevos pasos de CI, sin dependencias npm añadidas.

La página local aplica CSP restrictiva: `connect-src 'none'`, `script-src 'self'`, `img-src 'self' data:` y `frame-src 'self'`. Por ello no se cargan cuentas, tablas, claves ni APIs externos durante estas pruebas.

## 3. Casos efectivamente ejecutados en Chrome

**13 comprobaciones por escenario**, tanto escritorio como ancho móvil:

1. `Nueva obra` se renderiza con la hoja CSS ya cargada.
2. El inicio de Studio no descarga automáticamente `studio-editor.js`, `studio-importer.js` ni `studio-media.js`.
3. Crear «Crónicas del Dragón» produce un `slug` correcto, tipo editorial completo y estado privado (`published=false`) en el PostgREST simulado.
4. Crear el Volumen 1 y el Capítulo 1 genera la secuencia `series → volumes → chapters`, ambos borradores, y navega al editor.
5. El rol sin permiso de creación ve el bloqueo y no emite ningún INSERT.
6. El rol sin permiso de importación no puede abrir el flujo de importación autorizado ni escribir obras.
7. La biblioteca multimedia de solo lectura no muestra subir ni eliminar.
8. El asistente de importación permitido muestra el selector de archivo y la previsualización inicial.
9. Un EPUB de prueba con tamaño declarado superior a 80 MB es rechazado antes de empezar una importación.
10. Un archivo de extensión no admitida (`.txt`) es rechazado, sin crear `import_jobs`.
11. El editor de un capítulo no accesible redirige a la ruta de Studio en el mock.
12. Los módulos de editor, importador y multimedia se descargan al abrir esas rutas y no antes.
13. No hubo errores de ejecución detectados por el navegador ni desbordamiento horizontal mayor al margen permitido.

**Resultado GitHub Actions:** [#39436256213](https://github.com/MikeMR13/THEOBIPROJECT/actions/runs/39436256213) — **SUCCESS**, commit `3e72d3c7b00170f94ccaf16179fbe6c186e58664`.

Evidencia de logs:
- Chromium 1280 × 900: `QA_BROWSER_PASS 13 comprobaciones; viewport=1265`.
- Chromium en iframe de 390 px: `QA_BROWSER_PASS 13 comprobaciones; viewport=375`.
- Compilación Preview: `sin dominio Supabase productivo en config.js o HTML: OK`.

## 4. Cómo reproducir las pruebas

```sh
npm install --no-audit --no-fund
npm run check
npm run build
npm run studio-functional-check
npm run studio-browser-check
VERCEL_ENV=preview OBI_SUPABASE_URL=https://obi-qa-backend.invalid OBI_SUPABASE_PUBLISHABLE_KEY=sb_publishable_qa_mock_not_connected npm run build
npm run preview-isolation-check
```

Se requiere Chrome o Chromium en el runner para `studio-browser-check`; el entorno Ubuntu de GitHub Actions ya lo incluye. No hace falta una base de datos.

## 5. Qué falta antes de fusionar o publicar

- **Importación real:** EPUB con fuentes y CSS incrustados, DOCX, PDF y multipart, vistas previas, reemplazo de volúmenes, subida de imágenes, programa de publicación y rollback sobre un **backend de staging aislado**. Los parsers importan bibliotecas de `esm.sh` y deliberadamente no se ejecutan en el harness sin red externa.
- **Permisos y RLS reales:** contrastar lector, traductor, editor, administrador, propietario; cambios de cuenta y equipo con autenticación real y pruebas SQL de funciones. Los mocks no prueban las políticas RLS de PostgreSQL.
- **Estado y migraciones:** reconciliar el historial SQL entre GitHub y Supabase y validar el trigger `home_snapshot` de Fase 2 en una base aislada antes de aplicarlo.
- **Rendimiento:** medir bytes transferidos, CPU, LCP, INP, CLS y Lighthouse con un entorno que sirva datos de prueba y un lector completo. Chromium headless en CI **no** equivale a una auditoría Lighthouse.
- **Previews:** verificar rutas completas solo cuando se disponga de backend staging; la URL `.invalid` bloquea intencionadamente el acceso a una base.
- **Seguridad de previews previas:** las compilaciones Vercel previas al cambio de variables pueden conservar endpoints reales; no usarlas para QA con datos.

## 6. Decisión

**Aprobado:** pruebas de navegador de DOM/UI y carga modular con datos ficticios, compilación Preview aislada y CI estático de Fases 1–4.  
**No aprobado todavía:** E2E de escritura/lectura en Supabase aislado, importación/publishing reales, migraciones y publicación a producción.

Este PR debe mantenerse apilado sobre PR #6, **en borrador**. No se fusiona con `main`, no se altera Supabase productivo y no se despliega producción.
