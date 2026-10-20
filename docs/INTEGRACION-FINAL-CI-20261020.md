# Integración conjunta de estabilización, optimización y QA — 20 de octubre de 2026

**Origen:** main `7b080e24d5fc5fca4959241ab4fac828cdf113ea`.  
**Rama:** `integration/stabilization-optimization-qa-20261020`.  
**Contenido:** PR #1 (estabilización) y PR #2 a #7 (fases 1–4 y QA, apilados).
**Tecnología respetada:** HTML, CSS, JavaScript nativo y módulos ES, PostgreSQL/Supabase, Cloudflare Worker y Vercel. Sin cambiar a React/Next.js ni instalar dependencias adicionales.

## Conflictos resueltos

Los cambios independientes coincidían exactamente en tres archivos:
1. `scripts/build.mjs`: se **eliminaron** URL y publishable key predeterminadas de producción (PR #1), validó HTTPS y rechazó `sb_secret_`/`service_role`; se **conservaron** el bloqueo de Preview contra Supabase real, el CSS modular, precarga mínima del Service Worker y controles de aislamiento de PR #7. Se incorporaron comprobaciones de sintaxis de Worker, Studio y scripts.
2. `package.json`: se conservan `build`, `check`, `verify`, comprobaciones de fases 1–4 y pruebas de Studio/navegador/Preview; ningún paquete nuevo.
3. `.github/workflows/ci.yml`: incorpora credenciales ficticias en CI, parseo TOML, sintaxis, build, estabilidad, comprobaciones de Fases 1–4, pruebas funcionales simuladas, suite Chromium y build Preview con endpoint `.invalid`. Nunca usa credenciales de producción.

Todos los cambios no superpuestos del PR #1 se conservaron: reparación de TOML/SQL, ubicación estándar de función Patreon, protección de email mediante `CRON_SECRET`, bloqueo de endpoint de caché de capítulos del Worker, documentación y pruebas de estabilidad. **No se desplegaron Edge Functions, Workers ni migraciones SQL desde esta integración**.

## Pruebas ejecutadas

- GitHub Actions [#39444084508](https://github.com/MikeMR13/THEOBIPROJECT/actions/runs/39444084508), commit `df811fbfea7e699774e5e30202b1d69cc7870a41`: **SUCCESS**. Incluyó `npm run verify`, `npm run optimize-check`, `npm run db-phase2-check`, `npm run phase3-check`, `npm run phase4-check`, `npm run studio-functional-check`, `npm run integration-check`, `npm run studio-browser-check`, validación TOML y build Preview.
- Prueba combinada `scripts/integration-check.mjs`: comprueba fallos seguros si faltan variables o hay claves secretas, URL HTTP insegura o Preview apuntando al dominio Supabase de producción; verifica que se retienen el SW optimizado, paginación, módulos Studio y pruebas navegador.
- Suite Chromium en loopback con Supabase simulado: 13 casos en escritorio y 13 en viewport móvil simulado de 390 px, sin conexión a APIs reales. Comprueba creación de obra/volumen/capítulo, permisos simulados, rechazo de archivos, carga diferida y CSS.
- Lectura del esquema remoto mediante SELECT (sin escrituras): existen `series`, `volumes`, `chapters`, `team_members`, `import_jobs`, `private.home_snapshot`, `public.series_last`, `public.series_daily`, y RPC `my_team_permissions`, `publish_volume`, `media_in_use` y `save_chapter`. **Esto comprueba existencia, no una prueba funcional con roles en producción.**
- Entorno Vercel: URL + clave ficticias únicamente para Preview, reales solo en Production. Preview sigue deliberadamente no funcional para persistencia; `scripts/build.mjs` integrado no permite conexiones implícitas a la base de producción.

## Límites y condiciones posteriores

1. **Sin migración SQL remota**: `docs/SQL-FASE2-HOME-SNAPSHOT.sql` permanece como propuesta. No crear migración ni aplicar sobre producción hasta disponer de entorno separado y validar datos y reversión.
2. **Sin despliegue manual de Worker/Edge Function**: código `notify-email` requiere `CRON_SECRET` antes de publicarse; el Worker de caché de capítulos todavía no se actualiza en Cloudflare automáticamente.
3. **Integración frontend**: unir en main inicia el despliegue de Git a Vercel. Verificar que el deployment queda READY y que las variables de Production permiten build. Si falla, detener operaciones y considerar rollback.
4. **No se asegura E2E de autenticación, EPUB/DOCX/PDF real, uploads ni Lighthouse**. Los mocks no deben presentarse como validación de RLS o rendimiento real.
5. Las primeras pruebas requieren revisión de accesos y publicación con equipo en backend aislado antes de activar cambios de infraestructura y futuras migraciones.

## Estado de la fusión

Este documento acompaña al PR de integración. La fusión final se autoriza después de que CI valide el commit exacto integrado y de confirmar que la rama principal no cambió desde el punto de partida. Conservar evidencia GitHub Actions y deployment Vercel asociados.
