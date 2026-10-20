# The Obi Project — Bitácora de optimización y carga (Fase 1)

> Estado: **propuesta en rama separada**. No fusionado, no desplegado deliberadamente a producción.
> Proyecto: MikeMR13/THEOBIPROJECT.
> Rama: `optimization/native-js-loading-phase1-20261019`.
> Base: `main` en 7b080e24d5fc5fca4959241ab4fac828cdf113ea.
> PR de estabilización **#1**, independiente y sin fusionar.
> Tecnología conservada: HTML, CSS, JavaScript nativo con ES Modules, Service Worker, Vercel y PostgreSQL/Supabase; **sin React, Next.js ni dependencias nuevas**.

## Objetivos y alcance

Disminuir descargas y trabajo innecesario en el inicio, el lector y el Service Worker,
sin alterar formatos editoriales, pantallas, rutas públicas, temas de temporada,
modos de lectura, importaciones o permisos. No se han cambiado el esquema ni los
datos de Supabase ni se han desplegado Edge Functions, Workers o Vercel de manera manual.

## Registro completo de correcciones

| Archivo | Antes | Cambio | Resultado esperado / cautela |
|---|---|---|---|
| `src/index.html` | Nueve precargas `modulepreload` y dos preconexiones a Supabase | Se conservan las precargas del arranque esenciales: `supabase.js`, `app.js`, `ui.js`, `reader.js`, `blocks.js`. Se eliminan las precargas de Patreon, temporada, animaciones y equipo; se quita la preconexión duplicada. | Menos competencia de red inicial; verificar vista de temporada y navegación a equipos/Patreon. |
| `src/ui.js` | Home pedía todos los `series.theme` después de recuperar el feed y cargaba `anim.js` por separado. | Se utiliza `theme` incluido tanto en `home_feed()` como en el respaldo `SERIES`; se obtiene el festival desde `season.js` que ya exporta `SEASONS`. | Se elimina **una consulta SQL** adicional y una importación explícita redundante sin cambiar las portadas ni las tarjetas. |
| `src/reader.js` | El cuerpo del siguiente capítulo se precargaba incluso con `saveData` o conexión 2G; solo omitía ilustraciones. | `canPrefetch()` detiene la precarga en pestañas ocultas, ahorro de datos y conexiones 2G. Revalida al ejecutarse la tarea inactiva; captura fallas; carga normal intacta. | Menor consumo móvil y de datos, sin deshabilitar la lectura normal ni la descarga offline elegida. |
| `src/anim.js` | `requestAnimationFrame` seguía programándose con el lienzo invisible. | `pause()` cancela el ciclo al salir del viewport o al ocultar pestaña; `resume()` lo recupera; se retiran observadores/oyentes al desmontar. | Menor CPU y batería; probar al alternar pestañas y al desplazarse. |
| `public/sw.js` | Cada visualización de portada cacheada volvía a lanzar una solicitud de red. | Una sola actualización por URL por ciclo de vida del Worker, con cota de memoria y caché sin cambiar el primer render. | Menos solicitudes repetidas; verificar reemplazos de portadas y expiración natural del Worker. |
| `public/sw.js` | Una caché global interceptaba solicitudes de `/rest/v1/chapters` potencialmente autenticadas. | Se deja esa respuesta en red; el lector conserva su propia caché `obi-bodies` y descargas explícitas `obi-offline-v1`. | Evita respuestas de otros usuarios de caché compartida; probar modo offline y cierre/inicio de sesión en navegador compartido. |
| `scripts/build.mjs` | El precache obligatorio del Service Worker incluía temporada, animaciones y diseño de equipo. | El arranque obligatorio solo mantiene módulos de base; archivos opcionales pasan a precarga diferida. Se valida sintaxis del nuevo script. | Instalar más rápido la PWA; probar arranque offline y escenarios de temporada. |
| `package.json` y `.github/workflows/ci.yml` | Solo sintaxis JS y build | `npm run optimize-check` verifica contratos estáticos y se ejecuta después de build en CI. | Previene ciertas regresiones, pero **no mide** rendimiento real. |
| `scripts/optimization-check.mjs` | Inexistente | Pruebas de precargas, llamadas redundantes, animaciones, lectura, caché y shell del Worker con `node:assert`. | Sin instalar herramientas nuevas. |
| `docs/OPTIMIZACION-CARGA-FASE-1.md` | No existía bitácora de esta fase | Este registro, línea base y lista de validaciones futuras. | Revisiones reproducibles. |

## Línea base observada (auditoría previa; lecturas del proyecto real)

- Según el asesor de rendimiento de Supabase había **297 avisos**, incluidos 70 claves foráneas sin índice, 54 de inicialización RLS y 165 políticas permisivas superpuestas. **No equivalen a 297 fallas funcionales**.
- `private.home_snapshot.built_at` aparecía `-infinity` pese a que `pg_cron` registraba ejecuciones exitosas cada cinco minutos. La función `public.home_feed()` toma la instantánea si es reciente y, en otro caso, ejecuta `private.build_home()`. **No se cambió esta función ni la tabla**: diagnosticar por qué no persiste la fecha antes de proponer un parche SQL.
- Estadísticas acumuladas: `home_feed` 586 llamadas, media SQL ~18.7 ms, máximo ~1.14 s; `series_last` 489 llamadas, media SQL ~135 ms, máximo ~978 ms. **No son métricas de Lighthouse, ni latencia de red, ni mediciones comparativas de esta rama.**
- `private.build_home()` **sí incluye** `theme` en cada registro `series`, lo que respalda la eliminación de la consulta adicional desde Home.

## Validación automatizada

En rama con CI de GitHub Actions:
```sh
npm install --no-audit --no-fund
npm run check
npm run build
npm run optimize-check
```

El build de este PR sigue siendo el de su rama base, por lo que la seguridad de variables de entorno y la reparación TOML/SQL del **PR #1** se mantienen en ese PR y no se duplican aquí.

## Pendientes obligatorios antes de fusionar

1. **Backend / datos**. Investigar `built_at = '-infinity'` con cron/funciones, ejecutar `EXPLAIN (ANALYZE, BUFFERS)` sobre `series_last` sin escritura, y comparar planes `anon` y `authenticated` en entorno de prueba. Respaldar y reconciliar migraciones. No modificar RLS ni crear los 70 índices por lotes.
2. **Vercel Preview**. Configurar un backend aislado sin costo adicional solo si ya existe o usar pruebas locales; la rama `main` anterior al PR #1 tenía un valor de Supabase por defecto al compilar. No realizar pruebas de datos con una preview que apunta a producción. Es necesario validar la integración eventual con el PR #1 antes de un deploy.
3. **Carga fría**. Medir PageSpeed/Lighthouse en móvil, Web Vitals (LCP/INP/CLS) y bytes transferidos sin caché; comparar contra la referencia previa del proyecto (móvil 72 puntos, LCP 5.6 s del 17-oct-2026; no corresponde al estado actual).
4. **Carga caliente**. Medir requests de red tras una segunda visita a home, catálogo, equipo y lector con SW activado; confirmar cachés y que se descargan solo imágenes públicas.
5. **Lector**. Probar normal, continuo, cambio de capítulo, preferencias individuales, EPUB con fuentes y formatos, anotaciones, descarga offline, restauración de posición y ahorro de datos.
6. **Equipo y Studio**. Probar acceso al perfil de traductor y a Studio, importación EPUB/DOCX/PDF, publicación y subida de medios. Las áreas de Studio no se alteran en esta fase.
7. **Animaciones**. Comprobar en escritorio/móvil, `prefers-reduced-motion`, pausa al ocultar, retorno a pantalla y limpieza al cambiar de ruta.
8. **Autenticación**. Probar cierre de sesión y acceso de una segunda cuenta en navegador compartido; verificar que no se reutilice una respuesta PostgREST de capítulos.
9. **Seguridad**. Mantener evaluación de RPC `SECURITY DEFINER`, políticas RLS y los cambios pendientes del PR #1.

## Próximas fases propuestas

- **Fase 2**: corregir `home_snapshot` y optimizar `series_last` tras diagnósticos y baseline de migraciones; evaluar índices realmente usados.
- **Fase 3**: reducir bloqueo del primer pintado en Home y paginar consultas de catálogo y Studio tras comparaciones de comportamiento.
- **Fase 4**: modularizar el editor de Studio en archivos JavaScript nativos `import()` sin reemplazar la implementación de bloques.
- **Fase 5**: pruebas E2E y mediciones Lighthouse/LCP/INP/CLS en móvil y escritorio.

## Regla de integración

**No fusionar ni desplegar automáticamente**. Revisar el PR de esta fase por separado;
comprobar la compatibilidad al integrar eventualmente con el PR #1.
