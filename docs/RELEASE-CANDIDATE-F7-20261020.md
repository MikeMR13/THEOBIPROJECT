# Versión candidata — Fase 7 | El Obi del Lector

**Fecha de preparación:** 20 de octubre de 2026  
**GitHub:** `MikeMR13/THEOBIPROJECT`  
**Vercel autorizado para QA:** `theobiproject` · dominio principal `elobidellector.com`  
**Rama candidata:** `release/candidata-fases1-6-20261020`  
**Punto de partida exacto:** `07592c0c946a7eedb393a3860428ec30c10fb1ec` (PR #20).  
**Base original:** `main` en `f0b3931bc30fa7e252795c8e039a7b3c5d9b8016`.

## Alcance y criterios de congelación

Esta rama consolida lo acumulado de las fases visuales 1–5 y de estabilización funcional 6.1–6.5. El objetivo es presentar **un solo PR candidato a `main`** para revisión, no ejecutar la fusión ni un despliegue productivo.

Al contrastar `main` con el final del PR #20 se observaron **98 commits por delante y 0 por detrás**, con **46 archivos añadidos/modificados**. No hay cambios divergentes en `main` en el momento de esta preparación.

### Historial y procedencia

| Fase | PR | Estado de integración |
|---|---|---|
| Visual 1 | #10 | Cambios funcionales incorporados a la rama integrada, pero el PR original permanece independiente |
| Visual 2 | #11 | Su commit es ancestro de PR #20 |
| Visual 3 | #12 | Cambios incluidos por integración; su rama original diverge |
| Visual 4 | #13 | Cambios incluidos por integración; su rama original diverge |
| Visual 5 | #14 | Cambios incluidos por integración; su rama original diverge |
| Integración visual | #15 | Ancestro de PR #20 |
| Inicio y Catálogo | #16 | Ancestro de PR #20 |
| Temporadas, temas | #17 | Ancestro de PR #20 |
| Studio y cuentas | #18 | Ancestro de PR #20 |
| EPUB y predeterminados del equipo | #19 | Ancestro de PR #20 |
| Regresión cruzada | #20 | Punto de partida del candidato |

**Importante:** las ramas originales #10, #12, #13 y #14 no son ancestros literales del PR #20. Su integración se verifica por las pruebas de conservación de fases 1–5 y el resultado combinado, no mediante fusionar esas cuatro ramas nuevamente. **No fusionar individualmente** las PR previas encima del candidato: podría repetir o sobrescribir cambios ya adaptados.

## Componentes congelados

- **Inicio:** cinta y carrusel de novedades, avisos, portadas, etiquetas de lanzamientos y fechas sin falsos positivos.
- **Catálogo:** vistas Fichero/Portadas, géneros/demografía y filtros, diseño adaptativo.
- **Temas y temporadas:** cambios manuales y automáticos, intensidad, «Solo colores», previsualización que no escribe datos, preferencia personal de desactivación.
- **Studio:** equipos, roles/permisos, portada/página pública, lector predeterminado `teams.reader_defaults`, guardar/publicar separados, enlaces de borrador, compatibilidad móvil.
- **Cuentas:** aislamiento de equipos, permisos, cola de progreso local, preferencias y respuestas tardías entre usuarios.
- **Lector:** EPUB con familias incrustadas, negritas, cursivas, furigana/ruby, ilustraciones, modo continuo/paginado, historial, posición y avance.
- **Preferencias:** prioridad equipo → lector global → volumen; estilos y accesibilidad, tipografía, animaciones reducidas y opciones de navegación.

No se migran tablas de Supabase, no se cambian roles/RLS y no se incorporan nuevas dependencias de pago.

## Puerta técnica añadida en la candidata

Se añade `scripts/phase7-release-check.mjs`, ejecutado **después** de compilar con el backend ficticio `https://obi-qa-backend.invalid` y `VERCEL_ENV=preview`.

La prueba comprueba que existan los módulos esenciales publicados en `dist` (incluidos los nuevos del lector y Studio), el manifiesto de CSS accesible, versión del service worker, conservación de `vercel.json` y destino de build. Rechaza uso de Supabase productivo en `dist/config.js` y cualquier llave privada en la configuración pública. Verifica la presencia de todas las pruebas de fases y elimina la ejecución repetida de la suite del lector para reducir trabajo CI innecesario.

**El resultado debe revisarse en el CI del último commit de esta candidata.** Un check automatizado no sustituye verificación visual y funcional con sesiones.

## Puertas pendientes antes de permitir fusión a main

1. **CI del commit exacto del PR candidato:** `npm run check`, build, smoke tests, fases 1–6.5, Chromium en móviles y escritorio, aislamiento Preview, puerta de artefactos fase 7. Ningún fallo permitido.
2. **Preview del mismo SHA en el proyecto correcto:** `theobiproject`, target Preview y estado READY. Una Preview de commit anterior no satisface este requisito.
3. **Backend Preview aislado y accesible:** revisar la URL de `OBI_SUPABASE_URL` y su entorno sin exponer claves; confirmar que no coincide con `qfllthjpjuaztppvpsrk.supabase.co`; comprobar esquemas y políticas en el proyecto de pruebas. Si solo hay backend ficticio, la QA con cuentas queda **bloqueada**.
4. **Inicio/Catálogo:** 320, 390, 768, 1024 y 1440 px, control real de carruseles, aviso, búsqueda/filtros, etiquetas, imágenes y fechas. Capturas de la Preview de este SHA.
5. **Temporadas:** al menos dos equipos y dos lectores con preferencias opuestas, recarga, navegación, simulación y versión publicada separadas. Comprobar la persistencia sin modificar datos reales.
6. **Studio/roles:** cuentas de pruebas con permisos distintos, cambio de equipo, compartir solo borradores guardados, publicación y restauración solo con permisos correctos, formato por equipo.
7. **Lector EPUB:** importar un EPUB de pruebas con fuentes incrustadas reales, strong/em, ruby, ilustraciones grandes; leer varios capítulos en continuo y paginado; recuperar progreso y ubicación por cuenta/dispositivo.
8. **Accesibilidad y rendimiento:** teclado, contraste, reducción de movimiento, safe-area móvil, consola sin errores y Lighthouse/LCP en Preview del candidato.
9. **Autorización explícita:** una vez documentada la QA, solicitar confirmación para fusionar; producción y migraciones se tratan como decisiones aparte.

## Estado y prohibiciones

**No se ha autorizado fusionar ni desplegar a producción**. Esta etapa solo deja rama y PR candidato en **borrador**. No eliminar todavía los PR de fases previas ni sus documentos, ya que conservan trazabilidad. No realizar escrituras de pruebas sobre Supabase productivo.

**Estado de la versión:** preparada para verificación automática; pendiente de CI del último commit, Preview coincidente y QA manual autenticada. Si uno falta, mantener PR en borrador.
