# Fase visual 4 — Validación integral y corrección de fechas 1996 en Inicio

**Fecha:** 20 de octubre de 2026  
**Rama:** `fix/visual-fase4-qa-fechas-20261020`, basada directamente en `main` (`f0b3931`).  
**Estado:** pendiente de validación visual manual. **NO fusionar ni desplegar a producción sin aprobación.**

## Incidencia: fechas mostradas como «año 96»

**Comprobación de origen (solo lectura, sin alterar datos):** Supabase `THEOBIPROJECT` reportó 150 capítulos, sin `publish_at` anterior al año 2000 y con registros entre el 8 y 20 de octubre de 2026. La función `home_feed()` expuso 80 actualizaciones, sin fechas de 1996 ni valores nulos, y entre el 9 y 20 de octubre de 2026.

No fue posible reproducir la fecha de 1996 con esos datos en el momento de la consulta. La causa exacta en la sesión donde se observó **no está demostrada**; podrían intervenir cachés o datos transformados en el cliente. No sustituir fechas legítimas por «2026» inventado ni ejecutar UPDATE masivos.

**Corrección implementada:**
- `src/publication-dates.js`: valida timestamps completos antes de convertirlos en fecha de publicación. Rechaza `96`, `1996`, valores fuera de rango, fechas mal formadas y fechas futuras en etiquetas de «publicado hace».
- `src/ui.js`: usa la validación en `ago`, encabezados «Hoy/Ayer/Esta semana», novedades y distintivos del destacado. La novela y el capítulo siguen visibles si no hay fecha fiable; la etiqueta de fecha anómala desaparece, sin mostrar un año falso.
- En `Últimas actualizaciones`, la etiqueta `<time>` se crea solo si el timestamp es válido. No se toca `home_feed`, Supabase, RLS, `publish_at` ni los datos guardados.

## Validaciones automatizadas

1. `npm run verify` incluye `scripts/visual-phase4-check.mjs`: pruebas positivas (2026, 2000) y negativas (año 96, formato abreviado, fechas imposibles o futuras); comprueba también la presencia de cinta deslizante, carruseles, anuncios y elementos de Catálogo/Ficha.
2. `npm run visual-browser-check`: prueba en Chromium sin backend real usando los estilos actuales de `src/ui.js`, `src/styles.css` y `src/studio.css`. Mide desbordamientos de tarjetas, fichas, volúmenes y avisos a **320, 390, 768, 1024 y 1440 px**. Se integra en GitHub Actions.
3. CI original: compilación, optimización, contratos existentes, pruebas funcionales y navegador de Studio, y validación Preview aislada.

La prueba sintética revisa CSS real pero **no** confirma que los datos y navegación de producción se vean igual; requiere revisión visual real autenticada.

## Matriz de compatibilidad (revisión de parches PR #10, #11 y #12)

| Ruta compartida | PR relacionados | Riesgo |
| --- | --- | --- |
| `package.json` | #10, #11, #12 y fase 4 | Cada PR agrega scripts de verificación: unirlos sin sobrescribir el comando `verify`. |
| `src/admin.js` | #10, #11 | Tablas responsive frente a controles y pestañas del Bibliotecario; combinar CSS y comprobar ambas cosas. |
| `src/studio.css` | #10, #11, #12 | Selector de equipo visible, navegación móvil, tarjetas; posible conflicto/duplicidad entre media queries. |
| `src/studio.js` | #10, #11 | Equipo y navegación: preservar `teamPicker()` único, permisos y menú. |
| `src/ui.js` | #11, #12 y fase 4 | Conservar `aria-current`, bandas editoriales, carrusel y filtro de fechas al combinar. |

**Conclusión:** no debe hacerse fusión automática de las cuatro ramas. Los CI individuales validan cada fase de manera aislada y **no** demuestran que las cuatro estén integradas sin conflictos. Preparar una revisión de integración explícita con solución de conflictos, ejecutar CI del conjunto y la validación manual **antes** de autorizar merge a `main`.

## Checklist manual pendiente

- Inicio: cinta deslizante animada, pausa por foco/hover, carrusel principal automático y manual, carruseles secundarios y anuncios.
- Fecha: comprobar en la misma sesión donde se observó «1996» y con caché renovada; registrar el dato bruto si vuelve a aparecer, sin exponer credenciales.
- Catálogo: Galería y Fichero, filtros, títulos largos, portadas presentes/ausentes.
- Ficha: datos de novela, volúmenes, capítulos, estado de lectura y logo enlazado a equipo.
- Studio: roles diversos, cambio de equipo, navegación compacta, publicaciones, filtros y tablas del Bibliotecario.
- Temas estacionales: vista previa móvil **sin edición/publicación** y edición completa de equipos en >=768 px; contrastes de color.
- Lector: progreso, fuentes, modos, enlaces y configuración conservados.
- Accesibilidad: teclado/Escape, foco, contrastes, reducir movimiento; claro/oscuro; teléfonos físicos y tabletas.
- Anchuras: 320, 390, 768, 860, 1024 y 1440 px. El script automatizado cubre cinco anchos; 860 px necesita especial revisión por el cambio de breakpoint de Studio.

## Fuera de alcance

Sin borrado de componentes, reescritura de carruseles o banners, despliegue, fusión, cambios de roles, tablas, políticas RLS, migraciones, paquetes o costos adicionales. PR #10, #11 y #12 se conservan en borrador, aislados de la fase 4.
