# Integración temporal — Fases visuales 1–5 y preservación de preferencias

**Fecha:** 20 de octubre de 2026. **Rama:** `test/integracion-fases1-5-preferencias-20261020`, basada en el commit aprobado de la fase 2 (PR #11, `efccc03f`). **No es `main` y no está autorizada para fusión/despliegue.** Los PR #10–#14 se mantienen intactos.

## Estrategia de integración aplicada

- Se tomó **fase 2 como base** por concentrar la navegación móvil de Studio, la vista previa de temporadas, preferencias y los controles estacionales del Bibliotecario.
- Se incorporó fase 1: `src/styles.css` completo (áreas táctiles), tablas desplazables de `src/admin.js` y la condición de no ocultar el selector de equipos en `src/studio.css`.
- Se incorporó fase 3: ajustes editoriales de tarjetas de Studio, CSS de portadas y avisos en `src/ui.js`, composición obi respetuosa de ilustraciones, `src/teampage.js` con tratamiento de logos y corrección de contraste.
- Se incorporó fase 4: importación de `publication-dates.js`, validación de fechas en Inicio sin alterar datos, suites de QA responsive y modificación de `scripts/build.mjs`.
- Se incorporó fase 5: `src/index.html` con acceso al contenido, `reader-a11y.css` y pruebas de teclado y preferencias de movimiento.
- Se unificó `package.json`: `npm run verify` encadena las pruebas de estabilidad y fases 1–4; `visual-browser-check` y CI incorporan las suites de navegadores y un **nuevo contrato de preferencias cruzadas**.
- Se combinaron explícitamente los puntos de conflicto de `src/admin.js`, `src/studio.css`, `src/ui.js`, `package.json` y `.github/workflows/ci.yml`. No se sobrescribieron las preferencias de `src/profile.js` (fase 2) ni el sistema de lector y cuenta de la rama base.

## Verificación estacional, temas y preferencias

| Configuración | Regla a conservar | Prueba |
| --- | --- | --- |
| Temas de equipo | Tinta, Sakura, Biblioteca, Neón Tokio y Washi | exportaciones reales `THEMES` y `normalize` |
| Cubiertas y logos | Portada, bolsillo, obi; cuadrado/círculo/hanko | `COVERS` y `LOGOS` |
| Temporadas | Manual tiene prioridad sobre festividad automática y sobre estación | `activeSeason` con fechas controladas |
| Personalización | Saludos, adornos subidos, exclusión de adornos y hemisferio | `normalize`, `render`, `effective` |
| Solo colores | Cambiar paleta **sin partículas, patrones estacionales ni adornos** | prueba funcional añadida |
| Simulación móvil | No cambiar `design`, `seasons`, preferencias guardadas ni publicar | comparación por copia y contratos de `studio.js` |
| Ajustes globales del sitio | `ui_prefs` persistidos en perfiles, sincronizados y revertidos si falla | contratos de `profile.js` |
| Lector | Predeterminados del equipo → global del lector → por volumen | contrato de `reader.js` y persistencia `reader_prefs` |
| Decoración del lector | Preferencia individual de desactivar/activar `obi-season` | `season.js` mediante `setOff/isOff` |
| Modo accesible | Movimiento reducido solo si se solicita; animaciones normales intactas | Chromium en ambas variantes |
| Novedades | Ninguna fecha «96/1996» mostrada en Inicio | suite de fase 4 |

### Límite detectado en los valores predeterminados de equipo
El lector consulta `teams.reader_defaults` y aplica los valores del equipo antes de los ajustes globales y por volumen. Sin embargo, en los archivos actuales de Studio, Preferencias y perfil de equipo revisados **no se encontró una interfaz para editar esos valores predeterminados**. Se verifica la lectura y la prioridad de la configuración existente, **no** la gestión de ese campo desde una pantalla del equipo. Esta ausencia queda pendiente de confirmación funcional separada y no se añade un editor nuevo dentro de la integración temporal.

### Ajuste detectado al verificar preferencias
El renderizador previo de `src/teampage.js` seguía incluyendo un adorno y partículas en el modo «Solo colores». Se corrigió **solo en esta rama temporal**, de forma que la opción funciona según la intención confirmada: paleta de la temporada sin decoración adicional. El modo completo mantiene su funcionamiento y no se modifican los registros guardados.

## Compatibilidad y seguridad

No se realizaron cambios de base de datos, RLS, cuentas, ajustes remotos, roles o almacenamiento. No se ha efectuado despliegue a Vercel, Cloudflare o Supabase. Se mantienen todos los componentes del Inicio (cinta, carrusel, avisos), temas estacionales, las preferencias personales, importador EPUB, Studio y navegación editorial.

## Validación pendiente

El CI del PR temporal comprobará compilación, integridad, sintaxis, suites 1–5, configuración de temporada/lector y navegadores aislados. **El resultado final del CI debe consultarse antes de declarar la integración técnica aprobada.**

Después del CI queda la revisión visual/manual con contenido auténtico, cuentas lector/traductor/administrador y dispositivos reales de 320, 390, 768, 860, 1024 y 1440 px. La prueba automatizada y las verificaciones de fuente no prueban por sí solas persistencia completa con sesiones reales ni cumplimiento integral WCAG.

**Prohibición expresa:** no fusionar a `main`, no actualizar PR #10–#14, no desplegar producción antes de autorización explícita.
