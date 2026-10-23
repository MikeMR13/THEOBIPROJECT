# Fase 6 — Informe de validación del perfil público de grupos

Fecha de la auditoría: 2026-10-23

**Rama auditada:** `feat/perfil-grupal-fase1-20261023` · **PR:** #80  
**Producción:** `main` sin fusionar. **Decisión:** *NO-GO* hasta completar las pruebas autenticadas y visuales de los puntos marcados abajo.

## 1. Controles verificados

| Área | Resultado | Evidencia |
| --- | --- | --- |
| Build y compatibilidad Fases 1–5 | PASS automatizado | `npm run build`, 5 comprobaciones heredadas |
| Orden móvil distinto de escritorio | PASS automatizado | `scripts/team-profile-phase6-check.mjs` |
| Orden DOM para lectores de pantalla / teclado | PASS sobre estructura DOM simulada | Se reordenan nodos físicos, no solo con CSS |
| Restaurar orden original al ampliar pantalla | PASS sobre estructura DOM simulada | Test de cambio 390→1024→320 px |
| Pareja editorial destacado / lanzamiento | PASS sobre estructura DOM simulada | Se separa en móvil y restituye en escritorio sin IDs duplicados |
| Botones de carrusel y seguimiento | PASS inspección de estilos, falta dispositivo real | Objetivos 44 px para carrusel y botones del perfil |
| Controles de compositor táctiles | PASS inspección de estilos, falta dispositivo real | Flechas 40 px/44 px si `pointer: coarse` |
| Enlaces de sección y desplazamiento | PASS inspección de código, falta navegador | `scroll-margin-top` ampliado |
| Guardado y publicación de diseños | PASS inspección de RPC y RLS, **pendiente prueba autenticada** | Funciones `team_design_save`, `team_design_publish`, `team_design_restore` |
| Aislamiento de datos por equipos | PASS inspección de políticas y funciones, **pendiente test de cuentas** | `private.team_can(team_id, 'profile')` |
| Visibilidad de integrantes | PASS inspección de RPC y pruebas sintéticas | `team_public_members` obedece `settings.show_members` |
| Vínculo de vista previa | PASS inspección de función, pendiente navegador | `team_design_preview` requiere slug y token UUID |
| Composiciones guardadas por equipo | PASS en normalización y prueba sintética, pendiente persistencia real | JSON `savedCompositions` sin tabla nueva |
| Límite de datos guardados | PASS inspección de función; prueba con seis composiciones sintéticas | `pg_column_size(p_design) < 20000` |
| Temas personalizados | PASS comprobaciones de regresión, pendiente inspección visual | `exportTheme` excluye diseño móvil y composiciones |

## 2. Verificación de Supabase (SOLO LECTURA)

Se consultaron metadatos de `public.teams`, `public.team_design_drafts`, `public.team_design_versions`, `public.team_custom_themes`, `public.series`, `public.chapters`, `public.volumes` y `public.schedule`: las ocho tablas tienen RLS habilitado.

- `team_design_save`: función autenticada que valida `private.team_can(p_team, 'profile')`, verifica que la entrada sea objeto JSON y aplica un límite de tamaño interno de 20 000 bytes.
- `team_design_publish` y `team_design_restore`: validan permiso `profile`; no se ejecutaron con cuentas reales.
- `team_design_new_token`: solo es ejecutable por `authenticated` y valida permiso.
- `team_design_preview`: permite lectura anónima **intencional** mediante slug + token UUID de borrador. Tratar ese enlace como compartible, no como privado por sesión.
- `team_public_members`: accesible por diseño público; se limita a rol y nombre público y exige que `show_members` no esté desactivado. No usar avatar/perfil privado.
- No se identificó en la cuenta conectada un proyecto Supabase staging separado. Solo se consultó el esquema/metadatos del proyecto nombrado `THEOBIPROJECT`. **No se ejecutaron INSERT, UPDATE, DELETE, RPC de guardado o publicación ni cambios de permisos.**
- La herramienta de diagnósticos de Supabase señaló avisos de seguridad globales sobre funciones `SECURITY DEFINER` públicas. No modificar permisos generales sin auditar dependencias; una función pública con token o datos públicos puede ser intencional. Revisar como tarea de seguridad separada.

## 3. Validaciones obligatorias ANTES DE MERGEAR

1. **Entorno de prueba real:** proporcionar un proyecto Supabase staging o usuarios ficticios autorizados en entorno no productivo.
2. **Roles:** propietario del equipo puede guardar/publicar/restaurar; editor con permiso `profile` solo hace lo autorizado; integrante sin permiso y lector ajeno no pueden modificar ni leer borradores.
3. **Contenido público:** capítulos futuros y obras archivadas no salen; integrantes ocultos no salen; anuncios caducados no salen.
4. **Persistencia:** crear seis composiciones, recargar sesión, aplicar, guardar borrador, compartir vista previa, publicar, restaurar versión, volver a aplicar y comparar con el diseño publicado.
5. **Navegación real y foco:** en Chrome/Firefox/Safari para 320, 390, 768, 1024 y 1440 px, comprobar orden con Tab y lector de pantalla, en particular el par editorial.
6. **Diseños:** las plantillas Revista, Clásica y Editorial con colores Tinta, Sakura, Biblioteca y opciones personalizadas. Validar contraste en textos y botones.
7. **Pantallas móviles:** orientación horizontal, teclado táctil, barra Seguir, áreas de toque, ausencia de desbordamientos, zoom 200%, preferencias de movimiento reducido.
8. **Al publicar:** verificar `elobidellector.com` solo después de aprobación explícita, con comprobación de PR/merge y plan de reversión.

## 4. Corrección de accesibilidad de la Fase 6

La Fase 5 utilizaba `order` de CSS para recolocar secciones. Eso permitía un orden visual distinto del recorrido de teclado. Se sustituyó por una reorganización real de los nodos en pantallas pequeñas, usando `ResizeObserver`; conserva los mismos IDs y los nodos de la galería y los restaura cuando se regresa a escritorio.

Las pruebas automáticas cubren la estructura DOM mediante dobles de prueba, pero **no sustituyen** una prueba visual o de lector de pantalla en Chromium/Safari reales.

## 5. Publicación

**No se fusiona este PR ni se modifica la producción como parte de la Fase 6.** Las correcciones quedan disponibles en Vercel Preview hasta la aprobación del criterio de salida.
