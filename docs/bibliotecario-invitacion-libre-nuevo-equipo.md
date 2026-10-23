# Invitación libre para crear equipo con nuevos usuarios

**Solicitud:** un enlace libre generado por el Bibliotecario debe permitir que una persona no registrada se registre, confirme su correo y cree su propio equipo traductor al aceptar.

## Opciones disponibles
- **Nuevo equipo + correo específico:** el destinatario autorizado será Propietario.
- **Nuevo equipo + enlace libre:** la **primera persona** que complete el registro, confirme su correo y canjee el enlace será Propietario, con todas las facultades administrativas de ese equipo; el equipo se crea solo al aceptar.
- **Equipo existente + correo específico:** roles de Administrador, Traductor, Editor, Corrector o Colaborador.
- **Equipo existente + enlace libre:** roles Traductor, Editor, Corrector o Colaborador, sin elevar permisos administrativos.

## Medidas
- Únicamente el Bibliotecario genera enlaces.
- Enlaces criptográficamente aleatorios de 256 bits, el servidor guarda solo SHA-256.
- Un enlace libre para nuevo equipo puede ser reclamado por **cualquier persona** que lo conozca, no necesariamente la prevista. La UI advierte expresamente que la primera persona que lo acepte será dueña del equipo.
- Toda aceptación requiere inicio de sesión, correo verificado y confirmación explícita.
- El canje en una transacción, con SELECT FOR UPDATE, crea grupo + primer owner + consume el token. Dos personas que lo reclamen simultáneamente no pueden ambas triunfar.
- Caducidad, revocación y bitácora inalteradas.
- No existe promoción a Bibliotecario.
- Los enlaces con correo específico anteriores mantienen su comportamiento.

## Pruebas gratuitas
`scripts/invitaciones-supabase-local-http-check.mjs`: se invita a crear un equipo antes de registrar las cuentas. Luego dos personas nuevas crean su cuenta y la verifican; ambas intentan reclamar el token simultáneamente. Exactamente una recibe owner y el grupo se crea una vez. Las pruebas también cubren enlaces personalizados, miembros de equipos existentes, intentos anónimos y revocación.

`scripts/invitaciones-visibility-browser.mjs`: selector de enlace libre visible al crear equipos, correo opcional solo en ese modo, advertencia de propiedad, alternancia reversible; tamaños móvil y escritorio.

No se modifica Temporadas, calendarios o `season-sync`. Se publicará en `main` y producción solo después de las pruebas automatizadas exitosas.
