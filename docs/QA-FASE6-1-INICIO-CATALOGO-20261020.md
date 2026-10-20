# Fase 6.1 — Validación de Inicio y Catálogo (QA público)

**Fecha:** 20 de octubre de 2026  
**Rama de trabajo:** `test/fase6-1-inicio-catalogo-20261020`  
**Base:** `test/integracion-fases1-5-preferencias-20261020` (PR #15).  
**Estado:** pruebas automatizadas y revisión de código. **Auditoría visual real pendiente.** No fusionar a `main` ni desplegar a producción.

## Entorno correcto verificado

Proyecto Vercel **`theobiproject`**, conectado a `MikeMR13/THEOBIPROJECT`, dominio principal `elobidellector.com`.

- Preview de referencia: `https://theobiproject-mcz9yd0bt-cronica.vercel.app`, deployment `dpl_FXGDRVNfygu8uDseLGj3Vb8MmmQ2`, estado `READY`, commit `4fe714689dc7e046e28ec0e69009142368a3bded`.
- La Preview citada es de un commit anterior a esta rama y **no contiene los cambios de fase 6.1**.
- Las herramientas web de la sesión no pudieron abrir la URL y el Chromium local no puede resolver el dominio externo; por ello **no se realizaron capturas visuales reales ni navegación con sesión autenticada**.
- Se verificó en la configuración del proyecto Vercel la existencia de variables para el entorno Preview. **No se copian ni modifican credenciales.** `scripts/build.mjs` prohíbe en Preview conectar al Supabase productivo y requiere un backend explícito; no usar datos de producción para pruebas que escriban.

## Análisis de los componentes públicos

| Componente | Revisión del código | Validación manual |
|---|---|---|
| Cinta deslizante | Preserva `obTicker`, enlace de cada novedad y su modo de pausa | Pendiente en Preview |
| Carrusel principal | Preserva `heroSlide`, avance automático, flechas, indicadores, pausa/reanudación | Pendiente en Preview |
| Carruseles secundarios | Preserva `bindCars`, flechas, scrollbar horizontal y tarjetas de equipo | Pendiente en Preview |
| Avisos de equipos | Preserva `ob-s-ann`, títulos, descripción, enlace a equipo y fechas | Pendiente con datos reales |
| Catálogo | Preserva Fichero/Portadas, búsqueda, filtros, estados, Top, géneros y paginación | Pendiente en Preview |
| Portadas y obi | La variante ilustrada y la variante de respaldo siguen disponibles | Pendiente en Preview |
| Fechas | Reutiliza `publicationAge` y omite fechas imposibles como 1996 | Pendiente con contenido real |
| Temas y temporadas | Los componentes dinámicos y las preferencias siguen en la rama base | Pendiente en Preview |

## Incidencias de código corregidas aquí

### QA-PUBLIC-01 · Etiquetas de tiempo vacías

**Hecho:** al llegar una fecha inválida se ocultaba el tiempo relativo, pero en el carrusel y en las vistas de catálogo podía quedar un separador suelto (por ejemplo, «Último: cap. 4 · »).

**Solución:** `ageTag` agrega separador y fecha solamente cuando `publicationAge` devuelve una etiqueta válida. También se omite el `<span>` de la fecha del anuncio si falta un timestamp confiable. **No se modifica la fecha guardada ni se oculta el capítulo.**

### QA-PUBLIC-02 · Indicadores del carrusel de 10 px en móvil

**Hecho:** los indicadores del carrusel destacado tenían objetivos táctiles de 10 px de alto y ancho en `heroSlide`. Flechas y pausa/reanudación también tenían 40 px.

**Solución:** bajo 760 px se mantienen todos los controles, pero sus áreas táctiles pasan a 44 px. Los indicadores visuales siguen siendo franjas compactas de 10 px, colocadas dentro del área de pulsación. En móvil, la fila de indicadores admite desplazamiento horizontal para evitar ocultar los botones de avanzar, retroceder y pausar.

**No se elimina ni sustituye la animación, el temporizador, la cinta, los avisos o las portadas.** La distribución final requiere confirmación mediante captura de navegador real.

## Pruebas técnicas

`scripts/phase6-public-check.mjs` utiliza CSS real de `src/ui.js`, `src/styles.css` y `src/reader-a11y.css` con contenido ficticio y Chromium sin red. Verifica:
- Existencia de cinta, carrusel, pausa, flechas, anuncios, vistas del catálogo, búsqueda, paginación y filtros.
- Rechazo de fechas `96`/1996 o inválidas.
- Objetivos de 44 px en móvil y encaje del paginador.
- Anchuras **320, 390, 768, 1024 y 1440 px**.
- El test se ejecuta en CI junto con las pruebas anteriores de Studio y preferencias.

Esto es **QA sintética**, no validación con backend o capturas visuales del sitio publicado.

## Lista de aceptación manual para la Preview correcta

1. Inicio a 320, 390 y 1440 px: el carrusel reproduce, pausa y permite elegir cada una de las novelas; los botones no se superponen al texto.
2. Cinta con novedades: movimiento, enlaces correctos, no recortes y pausa al poner foco.
3. Carruseles secundarios: desplazamiento táctil/flechas y botones habilitados/deshabilitados en límites.
4. Anuncios de equipos: títulos y enlaces legibles; no desaparecen tras navegar a otra sección y regresar.
5. Portadas ilustradas/sin portada y títulos largos: jerarquía editorial, sin tapar la ilustración.
6. Catálogo a 320/390/768/1024/1440: búsqueda, filtros, exclusión de géneros, orden, vistas Fichero/Portadas, cero resultados y paginación.
7. Fechas: no mostrar 1996 ni separadores vacíos en tarjetas, avisos y destacado.
8. Temporadas/manual y preferencias de lector: ninguno de los temas seleccionados rompe contraste, espaciado ni visibilidad.
9. Consola/Red: sin errores JS, permisos, fuentes, imágenes y llamadas fallidas; evitar escrituras a base de producción.

## Aislamiento

PR de fase 6.1 independiente con base PR #15. Los PR #10–#15 no se fusionan ni cambian por esta fase. Se prohíben cambios de Supabase, migraciones, usuarios, despliegue o configuración de Vercel productivo sin nueva autorización.
