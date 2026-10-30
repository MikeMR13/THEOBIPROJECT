# Editor Fase 4 — Revisión editorial antes de publicar

Fecha: 30 de octubre de 2026. Proyecto: El Obi del Lector.

## Funciones

Se reutilizan las tablas existentes `review_requests` y `teams.require_approval` y el tablero `/estudio/flujo`, sin sustituir el historial ni crear otro esquema de publicaciones.

En el editor, el panel **Aprobación** permite solicitar revisión sobre la versión actual guardada, consultar solicitudes anteriores, aprobar o pedir cambios (solo un integrante con permiso `review` distinto del autor), y activar/desactivar la aprobación obligatoria del equipo si se tiene rol owner/admin.

La revisión obligatoria **está desactivada por defecto** y no cambia ninguna preferencia existente. La activa voluntariamente un propietario/administrador. No afecta retroactivamente a capítulos ya publicados. Si hay capítulos programados sin aprobación vigente, se rechaza la activación para no dejar publicaciones automáticas bloqueadas.

El tablero muestra si un capítulo tiene solicitud pendiente, aprobación vigente por versión o correcciones solicitadas. No se aplican cambios al texto con estos botones.

## Seguridad y concurrencia

La política `rr team` permitía modificar `review_requests` directamente a cualquier integrante. Se sustituye por SELECT restringido a integrantes del equipo; solo RPCs de seguridad definida pueden insertar/modificar solicitudes.

Las funciones `editor_submit_review` y `editor_decide_review` comprueban autenticación, permisos, propiedad del equipo, identidad del revisor, versión, estado y límites. Se bloquea la autorrevisión. Una nueva solicitud deja la anterior pendiente como «cambios».

La aprobación guarda la huella MD5 calculada **en el servidor** sobre versión, título y JSON de bloques. La guardia de `chapters` valida que coincida al pasar a estado `scheduled` o `published`. Si la versión cambia, se necesita nueva aprobación. Un capítulo programado protegido debe desprogramarse antes de cambiar su texto; así no se publica automáticamente un texto diferente del aprobado.

El editor evita guardar una revisión adicional al publicar una versión ya aprobada, porque eso invalidaría su huella. Con el requisito desactivado, conserva el guardado histórico de publicación previo a cambiar de estado.

La opción de equipo está protegida por trigger incluso frente a un UPDATE directo de `teams.require_approval`. Solo owner/admin pueden cambiarla; no se conceden nuevos permisos públicos de escritura.

## Pruebas obligatorias

- PostgreSQL 17 efímero en GitHub Actions, sin conexión a Supabase real: accesos anon y externos, denegación de escritura directa, solicitud por editor, aprobación por revisor, rechazo de autorrevisión, edición de contenido programado, versiones obsoletas, política opt-in.
- Test estático de módulos UI y controles server-side, junto a los flujos previos de Fases 0 a 3.
- CI general, Vitrina, SEO, auditoría transversal y Vercel Preview.
- Verificar almacenaje y 490 capítulos / 490 respaldos / 491 revisiones antes y después.
- Activar migración sin crear ramas de pago y sincronizar su versión registrada, fusionar y verificar Vercel READY.

## Límites

- La aprobación valida el contenido exacto y la versión, no reemplaza lectura humana.
- La ejecución de las pruebas usa usuarios ficticios. Una prueba manual con dos cuentas reales del equipo sigue siendo recomendable.
- El equipo puede seguir publicando como antes mientras `require_approval=false`; la fase no activa esa política sin consentimiento de la persona administradora.
- La comparación de versiones y sugerencias de Fase 3 se conservan sin aplicación automática.
