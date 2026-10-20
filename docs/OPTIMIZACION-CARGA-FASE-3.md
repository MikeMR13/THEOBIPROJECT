# THEOBIPROJECT — Optimización y carga, Fase 3

**Estado:** implementación en rama separada. No fusionar ni desplegar a producción sin pruebas funcionales.
**Rama:** `optimization/native-js-loading-phase3-20261020`, originada de `optimization/native-js-db-phase2-20261020`.
**Pila:** PR #1 estabilización independiente; PR #2 fase 1; PR #3 fase 2; esta fase en PR #4.
**Arquitectura preservada:** JavaScript nativo con módulos ES, CSS, HTML, Supabase, PostgreSQL y Service Worker. Ningún framework ni dependencia nueva.

## Antecedentes y criterio de entrada

- PR #3, commit `ad00f518f87d8dbd7980a2ac47cba12937c3bd2c`, pasó GitHub Actions #39428051454 (SUCCESS); comprobaciones de sintaxis, build, fase 1 y fase 2.
- La propuesta `docs/SQL-FASE2-HOME-SNAPSHOT.sql` **no** se ha aplicado a ninguna base real. No existe una rama aislada de Supabase conectada en la revisión previa; crearlo puede aumentar costos. El CI valida contratos, **no** confirma ejecución/reversión de SQL ni Lighthouse.
- Esta fase modifica únicamente JS y documentación. No cambia políticas RLS, roles de traductor, esquemas, contenido ni ajustes de producción.

## Cambios aplicados

| Archivo | Corrección | Justificación | Validaciones pendientes |
| --- | --- | --- | --- |
| `src/ui.js` (Home) | La consulta a calendario de temporadas arranca en paralelo, pero no bloquea el primer render del inicio. El aviso se inserta en su posición original una vez disponible. | La temporada no es necesaria para mostrar libros. | Con y sin temporada activa; cambio rápido de ruta; estabilidad visual/CLS en móvil. |
| `src/ui.js` (Catálogo) | Supabase se consulta con `.order('id').range(from,to)` en lotes de 250 y `readPages()`, conservando la lista completa para filtros/ordenamientos existentes. | Evita el corte silencioso de 1000 obras. No promete menos bytes totales para catálogos grandes. | Catálogo +1000 obras, orden por lectura/actualización, etiquetas, +18, cambio de usuario. |
| `src/ui.js` (Catálogo) | Renderiza solamente 24 obras por página con navegación accesible Anterior/Siguiente, reinicia página al cambiar filtros/vista, conserva números globales. | Menor DOM y trabajo de renderizado en bibliotecas grandes. | Filtros, búsqueda, teclado, páginas límite, apertura de ficha rápida. |
| `src/studio.js` (Panel de equipo) | Reemplaza `.limit(3000)` por lotes de 250 ordenados por ID. No se descartan capítulos por el máximo de PostgREST. | El panel necesitaba todos los capítulos para sus KPI. | Equipo de gran tamaño, capítulos programados, estado editorial, permisos. |
| `src/studio.js` (Ficha editorial) | Lee capítulos de cada obra en rangos de 250 con orden por `num`. | Evita el máximo implícito de 1000 filas en obras largas. | Listado de volúmenes, reordenamiento, borradores, publicación. |
| `src/paging.js` | Helper nativo, lazy import, error explícito si falla un lote o alcanza máximo seguro (80 páginas). | No ocultar errores ni omitir capítulos. | Cambios concurrentes durante paginación; grandes volúmenes. |
| `scripts/phase3-check.mjs` | Prueba paginación con 601 filas simuladas, error de red, respuesta vacía y límite de páginas; valida contratos de Home/Catálogo/Studio. | Previene regresiones sin framework de testing. | No reemplaza pruebas funcionales en navegador. |
| `scripts/build.mjs`, `package.json`, `.github/workflows/ci.yml` | Incluyen sintaxis/CI de las fases 1, 2 y 3. | Gate automático. | CI del commit final. |
| `docs/OPTIMIZACION-CARGA-FASE-3.md` | Este registro de cambios. | Trazabilidad para las siguientes auditorías. | Anotar Lighthouse tras staging. |

## Pruebas automáticas

```sh
npm install --no-audit --no-fund
npm run check
npm run build
npm run optimize-check
npm run db-phase2-check
npm run phase3-check
```

## Pruebas manuales obligatorias antes de integrar

1. Abrir Home como lector anónimo y autenticado, con y sin temporada activa. La obra destacada debe mostrarse antes del resultado del calendario; evitar banners tardíos que eleven CLS.
2. Catálogo con 0, 1, 24, 25, 250, 251 y más de 1000 novelas; todas deben existir al filtrar, buscar y ordenar. Cambiar el orden o los filtros vuelve a página 1.
3. Alternar fichas ↔ portadas en otra página; comprobar que la paginación responde con teclado y lector de pantalla.
4. Studio con equipo de más de 250 capítulos y una obra con varios volúmenes: conteos, tablero, invitaciones, programación, botones de edición, importación de archivos y permisos.
5. Simular error de una página de Supabase: debe mostrarse el error y no simular una biblioteca parcialmente válida.
6. Comprueba RLS como usuario normal para títulos restringidos y publicaciones ocultas. Las páginas no deben suprimir permisos.
7. PWA instalada y descarga offline para un capítulo; lector continuo y fuentes EPUB incrustadas.
8. Medir Lighthouse/LCP, INP, CLS y cantidad de requests antes y después, en móvil frío y caliente, usando una base aislada.

**No ejecutado en esta fase:** despliegue, migraciones SQL, pruebas Lighthouse reales o pruebas con cuentas/datos productivos.

## Próxima fase

Modularizar Studio en submódulos ES bajo carga dinámica. Priorizar importador, multimedia y editores avanzados; primero caracterizar su comportamiento para mantener compatibilidad. Integrar PRs por orden tras revisar conflictos, migraciones y seguridad.
