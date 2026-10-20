# Fase 6.3 — Studio, cuentas, roles y borradores compartidos

**Fecha:** 20 de octubre de 2026. **Rama:** `test/fase6-3-studio-cuentas-20261020`, basada en fase 6.2. **No fusionar ni desplegar a producción.**

## Alcance

Auditoría funcional de `Studio → Equipo`, navegación por equipos, permisos, edición y publicación de la página pública, enlaces de borrador y preferencias predeterminadas del lector. Se conservan todas las fases 1–6.2, incluidos temas, festividades, cintas, carruseles, estados editoriales y personalización de equipos. No se modifican Supabase, RLS, roles almacenados, migraciones ni cuentas reales.

## Incidencias y medidas

### QA-STUDIO-01 — «Compartir vista previa» guardaba silenciosamente

**Hallazgo:** `src/studio.js`, handler `#pf-share`, cancelaba el temporizador del editor y ejecutaba `team_design_save` antes de copiar el enlace. Esta acción contradecía la descripción de vista previa móvil «sin guardar ni publicar cambios» y podía guardar cambios recién simulados o aún pendientes.

**Corrección:**
- Se creó `src/studio-preview-share.js` para gestionar enlaces únicamente desde **borradores ya persistidos**.
- Compartir verifica que exista un borrador guardado, que no esté activo un guardado y que el contenido actual coincida con el último diseño confirmado.
- En caso contrario muestra un mensaje, sin detener el autoguardado existente y sin guardar/publicar por cuenta propia.
- Si ya existe token, lo reutiliza. Si no existe, `team_design_new_token` genera **explícitamente** un token para compartir el borrador guardado (operación de metadatos en la base, no guardado de diseño), sometido a los permisos de la función RPC original.
- Validación de formato UUID antes de construir `/equipo/{slug}?vista={token}`. No se publican cambios ni se modifican los datos de la obra.
- El guardado automático habitual de escritorio, `Publicar`, `Descartar`, historial y restauración de versiones permanecen disponibles. Tras confirmarse un guardado, se actualiza la huella del borrador persistido.
- Texto móvil aclara que simular una temporada no guarda nada y que el enlace solo corresponde al borrador previamente guardado.

### QA-STUDIO-02 — Selección y permisos podían persistir entre cuentas

**Hallazgo:** `createStudio` cacheaba `T.teams`, `T.team` y `T.perms` sin asociarlos al ID de usuario. Tras alternar usuarios en la misma pestaña, `ensure()` podía reutilizar equipos y permisos de la sesión anterior.

**Corrección:**
- Se asocia `T.userId` al usuario autenticado; cuando cambia o cierra sesión se reinicia equipo seleccionado, lista, permisos, roles, recuentos y zona horaria locales.
- `ensure()` recarga únicamente equipos asociados al usuario actual mediante `team_members` y verifica que la sesión siga siendo la misma tras cada respuesta asíncrona.
- `pickTeam()` descarta las respuestas de permisos y ajustes que lleguen después de cerrar sesión, cambiar cuenta o cambiar de equipo.
- El selector no continúa la navegación cuando falla la selección.
- Esto **no sustituye RLS** ni concede roles: las escrituras siguen dependiendo de las comprobaciones de servidor y permisos existentes.

## Cobertura y pruebas

`scripts/phase6-studio-accounts-check.mjs`, nueva suite de Node con datos simulados:

1. Compartir genera enlace válido, reutiliza token y no llama a operaciones de guardado/publicación.
2. Compartir sin borrador, con guardado en cola, guardado en curso o cambios no confirmados no genera token.
3. UUID inválido se rechaza.
4. `resetTeamSession` elimina equipos, permisos y datos de una cuenta distinta sin modificar el estado de la cuenta actual.
5. Flujo real `createStudio` con usuarios `u1 → u2 → sin sesión → u1`, verifica que se consulten los equipos y permisos correctos.
6. Contratos de UI existentes: permiso `profile`, selector de equipo, vista previa, guardado automático, publicar explícitamente, historial y restauración.
7. Se conserva el conjunto de CI de fases 1–6.2 y navegador Chromium.

La suite **no utiliza red, Supabase ni credenciales**.

## Punto pendiente: predeterminados de lectura del equipo

El lector interpreta `teams.reader_defaults` y respeta prioridad **equipo → global del usuario → volumen**, pero no se encontró un editor de `reader_defaults` en las pantallas de Studio analizadas. No se inventó una nueva operación `teams.update` ni una RPC sin comprobar RLS, permisos y manejo de conflicto. Se requiere diseño técnico específico y prueba funcional autenticada antes de habilitarla.

## QA manual todavía requerida

- Cambiar entre cuentas reales de lector, traductor y administrador; verificar que el selector de equipo y permisos se refresquen sin datos residuales.
- Probar miembros con y sin `profile` / `members`; confirmar que el servidor rechaza acciones prohibidas.
- Studio → Preferencias en móvil: cambiar simulaciones de temporada y modo «Solo colores» sin guardar/publicar, y compartir solo un borrador previamente guardado.
- Escritorio: guardar un cambio real en backend de pruebas, compartir, recuperar el diseño con token, publicar y restaurar desde historial.
- Cambiar de equipo durante consultas lentas, cancelar el formulario, cambiar de página, reabrir Studio y confirmar el estado del borrador.
- Comprobar la gestión de `reader_defaults` tras diseñar y autorizar un contrato seguro de escritura.
- Capturas a 320/390/768/860/1024/1440 px y pruebas de teclado; no realizar estas escrituras contra Supabase productivo.

**Estado técnico:** sujeto a CI final de la rama. **Estado manual:** pendiente de pruebas con backend aislado y sesiones autorizadas.

**Restricciones:** PR aislado con base fase 6.2; anteriores sin fusión; sin despliegue a producción ni costos adicionales.
