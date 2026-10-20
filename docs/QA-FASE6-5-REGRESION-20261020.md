# Fase 6.5 — Auditoría de regresión integrada y correcciones finales

**Fecha:** 20 de octubre de 2026. **Proyecto GitHub:** `MikeMR13/THEOBIPROJECT`. **Proyecto Vercel:** `theobiproject`.  
**Rama de QA:** `test/fase6-5-regresion-final-20261020`, derivada del PR #19; se abrirá PR separado contra la fase 6.4.  
**Estado de producción:** `main` y los despliegues de producción quedan fuera del alcance. No se usan datos de usuarios reales ni se ejecutan SQL de escritura.

## Objetivo

Regresión cruzada de Inicio, Catálogo, Studio, cuentas, equipos, permisos, temporadas, preferencias, lector, EPUB y publicaciones, después de las fases visuales 1–5 y funcionales 6.1–6.4. Conservar HTML/CSS/JS nativo, Supabase, interfaces editoriales, modos de lectura y animaciones normales. Sin gastos adicionales ni reescrituras de arquitectura.

## Incidencias reproducibles y correcciones

### QA-REG-01 (Alta) — Guardar una lectura anterior con la cuenta actual

**Condición:** el usuario A abre un capítulo; en la misma pestaña, cambia a B sin cerrar la vista antigua y se dispara `pagehide`, `visibilitychange` o el guardado de posición por desplazamiento. Aunque las claves `obi-pos-<usuario>__<serie>` ya estaban separadas, `saveProgress()` consultaba al usuario actual en vez de verificar el propietario del capítulo abierto. Podía grabar el progreso de A como B, tanto en localStorage como en `reading_progress`.

**Cambio:** al abrir capítulo se fija `S.activeOwner`; `saveProgress()` rechaza cualquier guardado si la identidad actual no coincide. `open()` comprueba también la identidad después de operaciones asíncronas para no mostrar un capítulo de una solicitud de sesión anterior. La sincronización pendiente se detiene si cambia la identidad durante el recorrido. Sin cambios a tablas ni claves remotas.

**Prueba:** ejecución aislada de la función real `saveProgress()`: A activo + B conectado no escribe; A conectado escribe solo para A; B con capítulo propio puede escribir solo para B. La enumeración de claves locales prueba aislamiento de A, B e invitados.

### QA-REG-02 (Alta) — Respuesta tardía de «Continuar leyendo»

**Condición:** `contBtn()` consulta el progreso de A, cambia el usuario a B y comienza la consulta de B. Si A responde al final, puede sobrescribir el botón de B o recuperar metadata ajena.

**Cambio:** cada consulta captura identidad y objeto de solicitud. Una respuesta solo puede actualizar `CB` y el botón si sigue correspondiendo a la sesión y a la solicitud vigente. El botón anterior se oculta al detectar cambio de cuenta. La función comparte la enumeración de claves por usuario del lector.

**Prueba:** se ejecuta `contBtn()` real con promesas controladas; B responde primero y A responde después. El botón debe continuar señalando la novela de B.

### QA-REG-03 (Media) — Preferencias remotas desactualizadas tras editar

**Condición:** una petición de `reader_prefs` tarda en responder mientras el lector modifica preferencias locales. Sin control de generación, el resultado del servidor puede sustituir la preferencia recién elegida.

**Cambio:** `loadPrefs()` captura secuencia de petición y versión de edición; `savePrefs()` incrementa la versión. El resultado remoto solo se aplica si identidad, secuencia y versión no han cambiado. La aplicación tardía de ajustes en la vista comprueba también que se trata del mismo lector.

### QA-REG-04 (Baja) — Estado de guardado en Studio

En `Studio → Preferencias → Lectura predeterminada`, se deshabilitan los selectores mientras la escritura de `reader_defaults` está pendiente, evitando que el usuario haga cambios que podrían perderse cuando llega la confirmación. El servidor mantiene la autorización RLS existente.

## Pruebas de regresión incluidas

`scripts/phase6-regression-check.mjs`, incorporado al CI con `node` y `vm` (aislado, sin navegador remoto, sin red), comprueba:
- Separación local de preferencias y progreso entre cuentas/invitados.
- Ejecución de `saveProgress` del repositorio bajo cambio de identidad.
- Ejecución de `contBtn` del repositorio con respuestas de red invertidas.
- Protección de preferencias por versión, guardado y consulta por identidad.
- Presencia de controles y funciones previos: Inicio, carruseles, filtro, fechas, equipos, autorización, temporadas y «Solo colores».
- Controles de EPUB: negritas/cursivas, ruby/furigana, fuentes, progreso por bloque, continuidad, guardado de defaults por equipo.

Se ejecuta además el CI preexistente: `npm run check`, build, `verify` (fases 1–4), fase 5, fases 6.1–6.4, Chromium Studio y Chromium responsive, validaciones de rendimiento y compilación Preview ficticia. **El estado definitivo se consulta en el run del último commit; ninguna prueba equivale a una sesión real en producción.**

## Matriz de QA

| Módulo | Cobertura automática | Pendiente manual |
|---|---|---|
| Inicio y Catálogo | Cinta/carruseles/portadas, búsqueda, filtros, fechas, viewport 320–1440 | Navegación real, contenido y enlaces en Preview final |
| Temporadas | Prioridad manual, automática, ocultación, «Solo colores», simulación | Dos equipos y múltiples usuarios con preferencias distintas |
| Studio | Cambio de equipo, permisos cacheados, guardar/publicar separados, lector predeterminado | Roles reales y RLS en Supabase de pruebas |
| EPUB | `strong`, `em`, `ruby`, `epub_fonts`, ilustraciones en Chromium | EPUB real con fuentes incrustadas, contenido largo y CJK |
| Lector | Preferencias equipo→global→volumen, continuidad y progreso | Restauración real en múltiples dispositivos y fuera de línea |
| Cuentas | Aislamiento de cachés, posiciones, respuestas tardías | Inicio/cierre de sesión con dos cuentas reales y pruebas RLS |
| Rendimiento/accesibilidad | Build, checks previos, reduced-motion y controles móviles | Lighthouse móvil, lector de pantalla y dispositivos reales |

## Límites de esta entrega

- **No es aprobación de QA manual visual**. La última versión de la rama deberá desplegarse a una Preview *del mismo commit* en `theobiproject` y utilizar un backend aislado. Las Previews de commits anteriores no verifican estos cambios.
- No se realizaron mutaciones de bases de datos, roles, permisos, infra, dominios o producción; no hay costos adicionales.
- No se corrigen resultados no reproducidos con datos auténticos sin una verificación autorizada.
- Los PR #10–#19 y sus ramas permanecen separados. Una futura integración definitiva requerirá confirmar manualmente los casos señalados y revisar CI verde del PR #20.
