# Fase 6.4 — Lector y formato predeterminado del equipo

**Fecha:** 20 de octubre de 2026  
**Rama:** `test/fase6-4-lector-defaults-epub-20261020`  
**Base:** PR #18 (fase 6.3). **No fusionar ni desplegar a producción.**

## Pendiente resuelto: configuración predeterminada del lector por equipo

Se añade una sección independiente a **Studio → Preferencias** para configurar el formato de lectura que el equipo ofrece inicialmente a sus obras. Controles: tema (incluido «auto» y OLED), fuente (incluida «Original del EPUB»), tamaño 14–30, ancho, interlineado, alineación, párrafos, ilustraciones, avisos de contenido, lectura por capítulo/continua, avance automático, segundos de espera y mantener pantalla encendida.

- Guardado **explícito**, sin autopublicar ni modificar `team_design_drafts`.
- Lectura y actualización **solo de la columna `teams.reader_defaults`**, con `id` del equipo seleccionado y `.select().single()` para comprobar el resultado.
- Verifica permisos `profile` e identidad/equipo vigente antes de escribir.
- Restablecer guarda `{}`, dejando que el lector use su configuración original.
- Valores normalizados por lista blanca `src/reader-team-defaults.js`: no acepta claves arbitrarias, tamaños fuera de rango, ni conversiones implícitas peligrosas.
- El esquema verificado **ya tenía** `teams.reader_defaults jsonb NOT NULL DEFAULT '{}'`. No se necesita migración.
- La política RLS verificada para `teams` autoriza `UPDATE` a través de `private.team_can(id, 'profile')`, con `WITH CHECK` existente. No se modifica RLS, `GRANT`, usuarios ni roles.

**Prioridad preservada:** predeterminado del equipo → preferencia global del lector → preferencia de ese volumen. La interfaz global guardaba antes un objeto completo de preferencias de fábrica al cambiar un único control, anulando accidentalmente preferencias del equipo. Ahora persiste solamente la opción modificada (estructura `R.global` dispersa).

## Fase 6.4 — Correcciones y verificaciones del lector

1. **Preferencias locales entre cuentas.** Tanto `reader.js` como Preferencias de lector usan `readerPrefsKey(userId)`; una cuenta no hereda la última caché de otra. Para invitados se mantiene `obi-reader-prefs`, separado del almacenamiento identificado.
2. **Guardado diferido.** Se captura una instantánea al programar el guardado y se verifica que siga autenticada la misma cuenta antes de sincronizar `reader_prefs`. Una carga remota atrasada tampoco sobrescribe los ajustes de otro usuario.
3. **Progreso y leídos sin conexión.** Posición `obi-pos-{uid}__{seriesId}` y cola `obi-read-q:{uid}` solo para el usuario actual; se actualiza también el botón «Continuar» del Inicio y el proceso que sincroniza las posiciones pendientes. Para invitados permanece la posición anónima `obi-pos-{seriesId}`.
4. **Fuentes EPUB.** Al recibir preferencias remotas atrasadas, `applyPrefs()` vuelve a establecer las variables de fuentes del volumen, sin reescribir el texto ni sacrificar familias originales.
5. **Formato del capítulo.** Las pruebas verifican que se conservan `strong`/`em`, `ruby`/`rt`, `data-epub-family`, ilustraciones, `epub_fonts` de los volúmenes, modo continuo, marcado de leídos y progreso por bloque.

**Compatibilidad:** no se elimina ni sustituye el lector, la importación EPUB/DOCX/PDF, los temas de temporada ni los diseños de equipo. El cambio a claves locales por cuenta no altera los registros del servidor; si un usuario inició sesión antes y solo tenía una posición local antigua (sin sincronizar), la posición remota sigue siendo la fuente de verdad y el dato antiguo no se adjudica automáticamente a una cuenta distinta.

## Pruebas incorporadas

- `scripts/phase6-reader-check.mjs`: valida normalización segura, precedencia de equipo/global/volumen, cachés por cuenta, fuente EPUB, renderizado y progreso.
- `scripts/fixtures/studio-browser-fixture.mjs`: amplía la prueba Chromium del Studio con **HTML EPUB real** (negrita, cursiva, ruby y fuente), ilustración y edición del panel de equipo, guardado, confirmación y restauración usando exclusivamente un mock local.
- `scripts/studio-browser-e2e.mjs`: permite cargar solo los nuevos módulos locales, conservando CSP de loopback sin conexiones externas.
- El CI ejecuta esta fase junto a fases 1–6.3, pruebas de Studio y compilación aislada. Debe confirmarse la conclusión final del último commit.

## Validación manual pendiente

Probar en una Preview *del mismo commit* con backend Supabase de pruebas aislado, sin operaciones contra el proyecto productivo:

- Dos cuentas distintas: permisos `profile`, cambio de equipo, edición y restauración de `reader_defaults`, salida/reingreso y recarga.
- Publicar una novela de pruebas con fuentes EPUB incrustadas: variantes regular/negrita/cursiva, ruby/furigana, figuras de página completa, separadores, caracteres CJK y texto mixto.
- Modos por capítulo, continuo en volumen y continuo entre volúmenes; progreso por bloque, marcado de leído, paso automático, restauración tras cerrar, navegación siguiente/anterior.
- Preferencias globales distintas de las del equipo y excepciones por volumen; verificar orden y continuidad al alternar dos cuentas en el mismo navegador.
- Lectura en línea y fuera de línea con conexión recuperada; comprobar que solo se sincronizan las posiciones y capítulos de la cuenta correspondiente.
- 320/390/768/1024/1440 px, teclado, accesibilidad, modo oscuro, temporadas.

**No afirmar auditoría visual real aprobada solo por pruebas simuladas.**

## Controles de seguridad

Repositorio correcto: `MikeMR13/THEOBIPROJECT`; Vercel correcto: `theobiproject`. Ninguna mutación SQL, migración de producción, modificación de RLS, deploy de producción, pago o fusión de ramas. El PR es de validación y requiere aprobación posterior.
