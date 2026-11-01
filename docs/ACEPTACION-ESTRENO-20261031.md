# Aceptación de estreno — El Obi del Lector
**Corte:** 31 de octubre de 2026. **Estado operativo:** `REQUIRES_MANUAL_REVIEW`. **Política innegociable:** ningún costo adicional en Vercel, Supabase ni Cloudflare.

## Lo que está comprobado (evidencia, no autorización de estreno)
- `main` incorpora el PR #239 y conserva `vercel.json: git.deploymentEnabled=false`. El frontend nuevo aún **no está desplegado**; el sitio continúa sirviendo el commit `76970deb`.
- GitHub Actions `ci` **105/105 pasos**: ejecución [41252885137](https://github.com/MikeMR13/THEOBIPROJECT/actions/runs/41252885137), con tests Chromium y de PWA/lector/Estudio/Vitrina.
- Supabase: la reparación `20261031221858` de relaciones PostgREST y `20261031225243` del carrusel ya estaban aplicadas a producción antes de la fusión.
- Comprobación en base de producción, **transacciones READ ONLY con ROLLBACK**: `anon` puede acceder a `home_feed()` y no puede leer `admin_overview()`; `authenticated` simulado sin rol administrativo tampoco puede leer `admin_overview()`. No se crearon usuarios ni se modificó información.
- Dos anuncios automáticos históricos cancelados; cero anuncios automáticos vencidos `planned` al verificarlos. No se enviaron mensajes.
- No hay ninguna obra con `reading_start_chapter_id` configurado: el funcionamiento completo de esa función no puede declararse validado con uso real.

## Seguridad y privilegios
El asesor de Supabase avisó de 32 funciones `SECURITY DEFINER` ejecutables por `anon` y 134 por `authenticated`; esas cifras **no significan 166 vulnerabilidades**. La revisión de funciones concretas documentó:
- `public.admin_create_team`: rechaza si `private.is_admin()` es falso.
- `public.reorder_chapters` / `public.renumber_volume`: verifican `private.team_can(...,'edit')`.
- `public.diffusion_schedule_create`: verifica `private.diffusion_scope_ok` para el equipo y la publicación.
- `public.reader_stats`: filtra por identidad, preferencias de privacidad y bloqueos.
- `public.series_toc`: distingue miembros del equipo de publicaciones públicas, y marca acceso restringido.
- `public.home_feed`: es una RPC pública intencional; lee snapshot público de `private.home_snapshot`.
Estas son **comprobaciones de código y dos pruebas de acceso limitado**; no sustituyen una auditoría exhaustiva de cada RPC. No revocar `EXECUTE` a ciegas: rompería rutas públicas o herramientas de edición.

**Protección contra contraseñas filtradas:** el asesor indicó que está desactivada. La organización de Supabase usa plan **Pro**, donde la función está incluida (según la lista de precios de Supabase). Esta conexión permite leer la configuración, pero no cambiar Auth. Una persona con acceso al Dashboard deberá entrar a **Authentication → Settings → Password Security** (los nombres pueden variar), habilitar la protección y comprobar que desaparece el aviso. No activar complementos ni opciones con precio.

**Control de gasto de Supabase:** revisar la sección Billing → Cost Control → Spend Cap (Pro). No se ha modificado la protección de gasto. El Spend Cap no cubre todos los productos (ej. cómputo); no equivale a garantía de costo cero.

## Pruebas manuales obligatorias
Cada caso requiere evidencia **no sensible**, referencia HTTPS (por ejemplo un run o informe del repositorio), fecha y responsable. Nunca adjuntar tokens, contraseñas, cookies, datos personales ni capturas de información privada.

| ID | Perfil / requisito | Pasos y resultado esperado |
|---|---|---|
| `reader-real` | Lector auténtico | Iniciar sesión con una cuenta de prueba propia, abrir Biblioteca y Continuar, cambiar de capítulo, reabrir y verificar progreso, probar contenido restringido sin acceso, descargar un capítulo y comprobar modo avión |
| `editor-real` | Editor auténtico | Acceso/Patreon: dos obras multivolumen, permisos y precios; seleccionar y quitar **Iniciar lectura aquí** sobre una obra editorial de prueba sin perjudicar a lectores actuales; verificar que una cuenta nueva entra a la sección elegida |
| `librarian-real` | Bibliotecario auténtico | Consultar equipo, permisos, historial de Difusión, calendario y resultados; **no** publicar, reintentar anuncios ni activar crons durante la prueba |
| `responsive-real` | Dispositivos reales | iPhone/Safari, Android/Chrome y escritorio; 320, 390, 768 y 1440 px; Inicio, ficha, índice, lector, Estudio y Bibliotecario sin desbordes ni botones inaccesibles |
| `security-auth` | Seguridad Auth y RPC | Comprobar protección contra contraseñas filtradas activada, permisos de usuarios sin equipo y catálogo de RPC sensibles; revisar el detalle de los avisos del asesor, sin revocaciones masivas |
| `public-url` | Navegación real en dominio | Tras eventual despliegue, comprobar /, /catalogo, /serie/:slug, /leer/:slug/:chapter y metadatos SEO; descartar bloqueo Cloudflare o error PostgREST |
| `vercel-no-charge` | Facturación | Obtener confirmación verificable de que el método de publicación no generará costos **incrementales**, incluyendo almacenamiento y tráfico. `--prebuilt` elimina el build remoto, pero NO prueba costo total cero |

## Puerta de salida
- Archivo de estado: `qa/aceptacion-preestreno.json`; toda aprobación debe incluir `evidence_url`, `reviewed_by`, `reviewed_at`.
- Evaluación sin conectarse a producción: `node scripts/release-readiness-gate.mjs --self-test`. Genera `qa-evidencia/release-readiness.json`.
- Puerta estricta: `node scripts/release-readiness-gate.mjs --strict` debe seguir en rojo hasta que todas las revisiones tengan evidencia y el release esté publicado/verificado con autorización.
- No convertir `pending` en `approved` solo porque Chromium simuló los flujos.
- No habilitar `git.deploymentEnabled`, no fusionar un despliegue, no desplegar funciones ni crear ramas de Supabase para simular una aceptación.

**Conclusión:** preparación técnica aprobada; estreno total NO autorizado. El siguiente avance real depende de pruebas autenticadas en cuentas controladas, de habilitar la opción Auth ya incluida y de una verificación de facturación sin cargos.
