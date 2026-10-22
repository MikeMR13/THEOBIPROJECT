# Invitaciones de equipo: validación antes de producción

**Estado:** funciones SQL versionadas en GitHub; ninguna migración ejecutada en
Supabase de producción. Vercel Preview sólo verifica compilación y contratos
estáticos. La nueva pestaña «Invitaciones» informa que no está activa hasta
instalar las funciones RPC.

## Flujo preparado
1. El Bibliotecario, desde «Invitaciones», selecciona un equipo **existente con
   propietario**, correo del destinatario, rol, duración (24/48/168 horas)
   y motivo administrativo de al menos 12 caracteres.
2. El backend genera 32 bytes criptográficamente aleatorios. Sólo guarda SHA-256;
   devuelve el enlace una sola vez al Bibliotecario para que pueda copiarlo.
   Las solicitudes de creación se serializan para impedir duplicados concurrentes.
3. La URL utiliza `/invitacion#token=…`: el secreto en el fragmento no viaja en
   la petición GET. El cliente lo guarda sólo en `sessionStorage` de la pestaña
   y lo quita de la barra de direcciones al abrirla.
4. El invitado inicia sesión o se registra, **confirma el mismo correo** y,
   posteriormente, pulsa «Aceptar e ingresar al equipo». La confirmación del
   correo se gestiona con el Auth ya existente.
5. `team_invitation_redeem` compara el hash, bloquea la fila con
   `SELECT … FOR UPDATE`, comprueba vigencia, correo confirmado y restricciones
   de la cuenta; crea la membresía y marca el token consumido en una transacción.
6. El trigger existente `private.sync_publisher` transforma la cuenta de
   `lector` a `publicador`. Su rol `admin` (Administrador) pertenece sólo al
   equipo. El rol `bibliotecario` no se puede conceder por invitación.
7. El Bibliotecario puede consultar estados y revocar invitaciones pendientes
   con motivo obligatorio; creación, revocación y canje se auditan.

## Limitaciones intencionadas
- Las invitaciones son para equipos **ya creados**; la creación de un equipo
  nuevo y la atribución de propietario no se hacen mediante un enlace
  administrativo de rutina. El rol `owner` está prohibido.
- La lista de invitaciones **nunca muestra el token** una vez abandonada la
  pantalla de creación. Si se perdió, revoca y crea otra.
- Es una invitación al equipo, **no** un Magic Link que por sí solo inicie sesión.
- Tras registrarse y confirmar el correo (posiblemente en una pestaña nueva),
  el invitado puede reabrir el enlace original para continuar.
- Los flujos de autenticación no se reemplazan y las temporadas siguen intactas.
- No resuelve las vulnerabilidades heredadas del Bibliotecario por
  `private.team_can` ni las operaciones administrativas pendientes de revisión;
  son iniciativas separadas que deben probarse en staging.
- No habilitar públicamente los nuevos enlaces antes de aplicar la migración
  probada; de lo contrario los RPC faltarán y la página lo indicará.

## Ensayos obligatorios en Supabase aislado
1. Usar un Bibliotecario real y otro usuario normal: sólo Bibliotecario puede
   crear/listar/revocar invitaciones y los tokens no pueden consultarse por REST.
2. Probar los cinco roles permitidos y rechazar ausencia de motivo,
   `owner`, roles desconocidos,
   duración no permitida, correos inválidos y equipos sin propietario.
3. Registrar una cuenta nueva con el correo invitado, confirmar ese correo
   y aceptar; comprobar `team_members.role` y `profiles.platform_role`.
4. Probar un publicador ya existente de otro equipo: conserva su otra
   membresía y gana únicamente el acceso invitado.
5. Probar correo distinto, cuenta sin confirmar, cuenta suspendida/borrada,
   Bibliotecario receptor y cuenta que ya es miembro. Todos deben fallar.
6. Lanzar dos canjes simultáneos con el mismo token: exactamente uno debe
   crear membresía y el otro debe devolver error. El token queda inutilizable.
7. Revocar uno pendiente y verificar que jamás permite canje; verificar
   expiración y que no se puedan revocar los canjeados.
8. Comprobar que ningún integrante/propietario pierde sus permisos anteriores,
   que un admin de equipo no tiene facultades globales y que `owner` permanece.
9. Comprobar que la bitácora registra creación, revocación y canje, pero no
   contiene el token en claro.
10. Ejecutar `npm run team-invitations-check`, `npm run check`,
    verificaciones existentes y pruebas de navegador, también en móvil.
11. Revisar `supabase db advisors` para permisos de funciones SECURITY
    DEFINER y políticas RLS antes de cualquier promoción.
12. Confirmar que «Temporadas» y `season-sync` no han cambiado.

## Despliegue
Primero habilitar staging (previa autorización expresa del costo), probar
la migración y sus RPC, integrar los fallos descubiertos. Sólo después
planificar backend productivo y frontend `main` de forma coordinada.
