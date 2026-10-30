# Fase 3 del editor — colaboración, sugerencias y comparación de versiones
Fecha: 30 de octubre de 2026 · Proyecto: El Obi del Lector

## Qué añade
- Panel **Sugerencias** en la edición de capítulos, con un fragmento original, la redacción propuesta y una justificación opcional.
- Cada propuesta guarda su autor, capítulo y **versión de origen**, sin reescribir el libro.
- Las propuestas solo son legibles por el equipo al que pertenece el capítulo, mediante Row Level Security.
- Otro integrante con permiso de **review** puede marcar la sugerencia **Revisada (no aplicada)** o **Descartada**; el autor no puede revisar su propia propuesta.
- La marca Revisada indica que una persona la evaluó, no que se haya insertado en el capítulo. La aplicación al texto sigue siendo manual por un editor autorizado con guardado versionado.
- Historial del editor: **Comparar** muestra diferencias de bloques y título entre una revisión histórica y el borrador actual, incluidos cambios locales no guardados. La comparación no restaura ni modifica contenidos.

## Protección de datos
- `public.editor_suggestions` tiene RLS habilitado. `anon` no recibe lectura ni escritura; `authenticated` solo tiene SELECT si pertenece al equipo.
- Los cambios pasan por `editor_create_suggestion` y `editor_review_suggestion` con permisos y versión comprobados, `auth.uid()` obligatorio, `search_path` fijado y acceso concedido únicamente a `authenticated`.
- No existe operación automática de aplicación ni RPC que modifique `chapters` o `chapter_revisions`.
- La revisión requiere identidad distinta y permiso `review`. Las decisiones son finales.
- Se limita la longitud, número de propuestas pendientes por autor y capítulo y el volumen de datos entregados en la interfaz.
- Las propuestas se eliminan si se elimina definitivamente el capítulo, de acuerdo con las relaciones existentes; los respaldos privados de Fase 0 permanecen independientes.

## Validación antes de producción
1. GitHub Actions: PostgreSQL 17 efímero (`editor-phase3-qa.yml`) ejecuta fixture, migración y validación de RLS/autorización/no modificación de capítulos.
2. CI general: `node scripts/editor-phase3-collaboration-check.mjs`, importación, editor, navegador Chromium, Fases 0-2, lector, SEO, Vitrina, temporadas.
3. Vercel Preview READY y cotejo con `main`.
4. Verificar almacenaje/plan existente y respaldos antes de aplicar SQL. No se crea rama pagada de Supabase.
5. Aplicar la migración **una vez**; confirmar en SQL tabla, políticas, privilegios, funciones, conteos de capítulos y respaldos sin cambios.
6. Alinear versión de archivo de migración con el ID real registrado en Supabase, fusionar PR y verificar deploy READY en Vercel.

## Límites conocidos
- La comparación muestra el tramo de bloques distinto, con una vista previa de 12 bloques por lado; no es un diff carácter por carácter. Usa «Ver» para acceder a una revisión completa.
- Solo se muestran 100 sugerencias recientes para evitar un panel lento.
- Una sugerencia obsoleta se etiqueta con su versión; una decisión de revisión no hace merge ni reescribe el capítulo.
- No hay notificaciones push ni asignación automática de responsables. No se contrata ningún servicio.
