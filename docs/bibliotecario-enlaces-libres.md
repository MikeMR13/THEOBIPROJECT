# Enlaces libres de un solo uso · El Obi del Lector

## Política aprobada
- **Crear equipo nuevo:** correo obligatorio; el invitado acepta después de verificar ese mismo correo y se convierte en **Propietario**, con todas las facultades de administración interna.
- **Unirse a equipo existente:** el Bibliotecario puede elegir **correo específico** o **enlace libre**, que se comparte manualmente por cualquier canal.
- **Enlace libre:** no pide correo al generarlo, pero la primera persona que lo acepte **sí debe iniciar sesión y tener su correo confirmado**. Solo puede recibir los roles de Traductor, Editor, Corrector o Colaborador; se prohíben Propietario y Administrador.
- Las invitaciones siguen caducando en 24/48/168 horas, son de un uso, pueden revocarse con motivo y se auditan. El token solo se muestra una vez.

## Seguridad y compatibilidad
El esquema mantiene los enlaces preexistentes por correo; la migración solo permite `invite_email IS NULL` en invitaciones `join` con rol de privilegio no administrativo.
`team_invitation_preview` y `team_invitation_redeem` mantienen la comprobación de correo confirmado y cuenta no suspendida, y comparan el correo solo cuando la invitación lo especifica. El canje sigue usando `SELECT FOR UPDATE` para impedir dos reclamaciones simultáneas. La concesión de roles se valida dentro de la RPC, no solo en la interfaz.

## Validación sin infraestructura nueva
`.github/workflows/invitaciones-local-functional.yml` reproduce las migraciones en Auth GoTrue + PostgREST + PostgreSQL desechables de GitHub Actions. Prueba que dos cuentas de correo distinto compiten por el enlace libre, exactamente una lo consume, ninguno se convierte en Bibliotecario y se conserva al propietario inicial. Las pruebas también rechazan enlaces libres para admin, owner y creación de equipo. `scripts/invitaciones-visibility-browser.mjs` comprueba ocultamiento del correo y del selector en móvil/escritorio.

## Despliegue
Aplicar primero `20261022232000_team_invitation_open_links.sql` y después `20261022232100_team_invitation_redeem_guard.sql` (condición de correo opcional explícita en canje).
Publicar migración primero; comprobar ACL de las RPC y RLS; después fusionar el frontend a `main`. No modificar `Temporadas`, `season-sync` ni otros equipos.
