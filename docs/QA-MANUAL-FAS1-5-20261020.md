# QA visual manual de las fases 1–5 — Registro de validación

**Fecha:** 20 de octubre de 2026  
**Integración bajo prueba:** PR #15, rama `test/integracion-fases1-5-preferencias-20261020`.  
**Regla:** ninguna fusión a `main` ni despliegue de producción sin autorización posterior.

## Resultado ejecutivo

**Validación manual visual con versión integrada: BLOQUEADA por falta de Preview del PR #15.** La lista de despliegues de Vercel `nlobi` consultada para la rama integrada devuelve **0 despliegues**; los despliegues recientes hallados apuntan a `main`. No se debe dar por aprobada una pantalla que no se ha abierto en un navegador autenticado.

**Validación automatizada previa: APROBADA.** CI de GitHub Actions [#39482710006](https://github.com/MikeMR13/THEOBIPROJECT/actions/runs/39482710006), cubre compilación, contratos 1–5, pruebas funcionales de Studio, Chromium aislado y fechas. Los datos de las pruebas Chromium son ficticios y no equivalen al diseño real del sitio.

**Revisión manual de fuente e infraestructura: PARCIAL, con incidencia.** Se revisaron componentes, permisos, navegación, CSS móvil y los controles de vista previa del equipo; consultas SQL de solo lectura confirmaron las columnas y la existencia de datos de configuración.

## Evidencias no sensibles (consultas de solo lectura)

- Supabase: `platform_settings.seasons`, `profiles.ui_prefs`, `reader_prefs.global`, `reader_prefs.per_volume`, `teams.design` y `teams.reader_defaults` existen como `jsonb` y son no nulos.
- El calendario estacional contiene **108 entradas** y la configuración global tiene **22 temporadas automáticas**, intensidad `sutil` y densidad `pocas` al comprobarla.
- **1 equipo** con diseño configurado; **0 equipos** con `reader_defaults` distintos de `{}`; **1 registro** de preferencias del lector, **0** con ajustes por volumen; **0 perfiles** con `ui_prefs` no vacíos. Por tanto, falta cobertura con casos reales personalizados para comprobar persistencia y precedencia tras recargar.
- **No** se consultaron contraseñas ni datos personales, y no se ejecutó ninguna escritura.

## Incidencia QA-MANUAL-01 · Acción «Compartir» en previsualización móvil

**Severidad: media, discrepancia funcional con la condición aprobada de solo lectura.** En `src/studio.css`, `@media(max-width:767px)` oculta el panel, el botón Publicar y el botón Descartar, pero mantiene visible `#pf-share`. Su handler en `src/studio.js`, `$('#pf-share').onclick`, ejecuta la RPC `team_design_save` y puede emitir `team_design_new_token`.

- Los controles del simulador `#pf-msim` y `[data-mdeco]` no llaman por sí mismos a guardado; el ajuste temporal se aplica en `previewDesign`.
- No se ha demostrado que la simulación borre contenido; el problema es que **Compartir** sí escribe, en contraste con la descripción «sin guardar ni publicar cambios».
- **Acción recomendada:** definir el flujo correcto para «Compartir» desde móviles: no permitir operaciones de guardado implícito; reutilizar enlace existente solo si no hay cambios o explicar explícitamente que se va a guardar. Revisar permisos de acceso al borrador y los controles visibles.
- Estado: **ABIERTO; no corregido en esta pasada manual**, para evitar cambiar comportamiento de publicación sin decisión expresa.

## Cobertura manual requerida para aprobar la fase integrada

Estados: **PASS** solo con interacción y evidencia de navegador real; **PENDING** sin ejecutar; **BLOCKED** por falta de Preview/autenticación.

| Caso | Perfil | Anchuras | Comprobación | Estado |
|---|---|---|---|---|
| MV-01 | Público | 320, 390, 768, 1440 | Home: cinta animada, carrusel principal automático/manual, botones y avisos completos | BLOCKED |
| MV-02 | Público | 320, 390, 768 | Galería/Catálogo, vista Fichero, filtros, resultados, portada real y respaldo obi | BLOCKED |
| MV-03 | Público | 320, 390, 1024 | Ficha de novela, capítulos, etiquetas editoriales, logo/enlace del equipo | BLOCKED |
| MV-04 | Público | 390, 1440 | Fechas publicadas correctas; no «1996» ni fechas falsas al recargar | BLOCKED |
| MV-05 | Público | 390, 1024 | Temporadas: decorar Inicio, Catálogo, fichas y restaurar correctamente al cambiar ruta | BLOCKED |
| MV-06 | Lector autenticado | 320, 390, 1024 | Preferencias: color/tema del sitio, navegación, hora y zona horaria tras recarga/login | BLOCKED |
| MV-07 | Lector autenticado | 390, 1024 | Preferencias globales > predeterminado equipo; preferencia de volumen > global | BLOCKED |
| MV-08 | Lector autenticado | 390, 1024 | EPUB: imágenes, negritas, cursivas, furigana y fuentes; progreso y modo continuo/paginado | BLOCKED |
| MV-09 | Lector autenticado | 390 | Desactivar temporadas, navegar, recargar y reactivar; modo reducir movimiento | BLOCKED |
| MV-10 | Traductor autenticado | 320, 390, 768, 860, 1024 | Studio: selector de equipo, menú agrupado, roles, avisos y filtros | BLOCKED |
| MV-11 | Traductor autenticado | 320, 390 | Vista previa de temporadas, completo/solo colores, publicada/borrador, sin edición | BLOCKED |
| MV-12 | Traductor autenticado | 768, 1024, 1440 | Edición real de temporadas, saludos, logos, guardar/publicar (solo en entorno de prueba) | BLOCKED |
| MV-13 | Bibliotecario | 320, 390, 1024 | Tablas desplazables, controles estacionales y calendario sin desbordamientos | BLOCKED |
| MV-14 | Todos | 320, 390, 768, 860, 1024, 1440 | Foco con teclado, contraste, overflow lateral, safe area, reduced-motion | BLOCKED |
| MV-15 | Traductor | 390, 768 | Clic en Compartir no debe persistir silenciosamente el borrador en solo lectura | ISSUE |

### Condiciones para ejecutar pruebas de manera segura

1. Disponer de una **Preview Vercel del commit exacto del PR #15**, aislada de producción; registrar URL, SHA y tipo de protección. **No usar `nlobi.vercel.app` como evidencia de la rama.**
2. Revisar primero acceso público anónimo. Para escenarios autenticados, usar sesiones de prueba autorizadas con roles lector, traductor y Bibliotecario; no pedir claves ni contraseñas en el chat.
3. Evitar guardar/publicar cambios de diseño contra datos reales: usar datos de prueba o detener esa comprobación si la Preview comparte el backend de producción.
4. Capturar pantalla completa/viewport y resultados funcionales con fecha para cada caso; documentar errores de consola, red y permisos sin incluir tokens ni credenciales.
5. Aceptar fusión solo al cerrar incidencias funcionales y revisar evidencias manuales. CI verde por sí solo **no** implica aprobación visual.

## Integridad de ramas

El PR #15 conserva los cambios combinados; los PR #10–#14 siguen aislados, y esta auditoría no autoriza fusión, despliegue o cambios de base de datos.
