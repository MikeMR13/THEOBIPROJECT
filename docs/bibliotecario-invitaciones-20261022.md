# Invitaciones de equipo: implementación y pruebas funcionales

**Estado al 22 de octubre de 2026:** la migración aditiva
`team_invitations_one_time` está aplicada en Supabase de producción.
La integración del frontend se gestiona en el PR #60 y su despliegue en
Vercel. GitHub Actions ejecutó satisfactoriamente el flujo con Supabase Auth,
PostgREST y PostgreSQL **locales**, además de CI y la compilación de Vercel.
Ningún dato ni credencial de producción se empleó para estas pruebas.

## Flujo preparado
1. El Bibliotecario, desde «Invitaciones», elige entre dos destinos:
   - **Crear equipo nuevo:** indica nombre y slug del futuro equipo, correo,
     caducidad (24/48/168 horas) y motivo administrativo. El rol es
     obligatoriamente **Propietario**, que incluye todas las facultades de
     Administrador dentro de ese equipo.
   - **Equipo existente:** selecciona el equipo, el correo y un rol ordinario
     (Administrador/Traductor/Editor/Corrector/Colaborador), sin otorgar
     propiedad por esta vía.
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
   de la cuenta. Para un equipo nuevo, crea **equipo + miembro propietario +
   consumo del token en una sola transacción**. Si cualquier paso falla, no
   queda un equipo vacío. Para un equipo existente, agrega únicamente el
   integrante invitado.
6. El trigger existente `private.sync_publisher` transforma la cuenta de
   `lector` a `publicador`. El rol `owner` confiere todos los permisos de
   administrador dentro del nuevo equipo; NO se crean dos membresías ni se
   concede el rol global `bibliotecario`.
7. El Bibliotecario puede consultar estados y revocar invitaciones pendientes
   con motivo obligatorio; creación, revocación y canje se auditan.

## Limitaciones intencionadas
- El rol `owner` sólo se concede mediante una invitación autorizada para
  **crear un equipo nuevo**. En equipos existentes, el enlace nunca transfiere
  la propiedad ni altera al propietario actual.
- La invitación para nuevo equipo **no lo crea al generar el enlace**. Sólo
  después de la aceptación autenticada con el correo correcto.
- El nombre y el identificador del nuevo equipo deben estar libres. Si alguien
  ocupa el identificador antes de canjear el enlace, se rechaza el canje sin
  crear un equipo parcial y el Bibliotecario emite otra invitación.
- La lista de invitaciones **nunca muestra el token** una vez abandonada la
  pantalla de creación. Si se perdió, revoca y crea otra.
- Es una invitación al equipo, **no** un Magic Link que por sí solo inicie sesión.
- Tras registrarse y confirmar el correo (posiblemente en una pestaña nueva),
  el invitado puede reabrir el enlace original para continuar.
- Los flujos de autenticación no se reemplazan y las temporadas siguen intactas.
- No resuelve las vulnerabilidades heredadas del Bibliotecario por
  `private.team_can` ni las operaciones administrativas pendientes de revisión;
  son iniciativas separadas que requieren auditoría específica.
- La creación real de invitaciones debe hacerse únicamente desde una sesión
  del Bibliotecario; no se usan enlaces de ejemplo en producción.

## Pruebas funcionales y escenarios complementarios

Las pruebas gratuitas de `.github/workflows/invitaciones-local-functional.yml`
superaron la migración SQL real sobre un esquema sintético, registro de
usuarios reales en GoTrue, bloqueo de inicio de sesión hasta verificar correo,
autorización JWT/RPC, creación atómica del equipo y propietario, concurrencia
de doble canje, alta de administrador en equipo existente, revocación y auditoría.
También superó la suite general `.github/workflows/ci.yml`.

Escenarios adicionales recomendados antes de futuras ampliaciones:
1. Usar un Bibliotecario real y otro usuario normal: sólo Bibliotecario puede
   crear/listar/revocar invitaciones y los tokens no pueden consultarse por REST.
2. Probar cinco roles para equipos existentes (prohibiendo `owner` allí).
   Para nuevo equipo aceptar **únicamente** `owner`, rechazando `admin`
   como rol inicial, equipo_id previo, nombres/slugs inválidos, nombres
   demasiado largos, duplicados, falta de motivo o correo inválido.
3. Registrar una cuenta nueva con el correo invitado, confirmar ese correo
   y aceptar; comprobar que **no existía el equipo antes del canje**, que
   ahora se crea exactamente uno con `team_members.role='owner'`, que
   `profiles.platform_role='publicador'` y puede administrar su equipo
   en el Estudio sin obtener privilegios de Bibliotecario.
   Comprobar que el equipo nunca queda sin propietario si falla una escritura.
4. Probar un publicador ya existente de otro equipo: conserva su otra
   membresía y gana únicamente el acceso invitado.
5. Probar correo distinto, cuenta sin confirmar, cuenta suspendida/borrada,
   Bibliotecario receptor y cuenta que ya es miembro. Todos deben fallar.
6. Lanzar dos canjes simultáneos con el mismo token: exactamente uno debe
   crear membresía y el otro debe devolver error. El token queda inutilizable.
7. Revocar uno pendiente y verificar que jamás permite canje; verificar
   expiración y que no se puedan revocar los canjeados.
8. Comprobar que ningún integrante/propietario pierde sus permisos anteriores,
   que un Administrador/Propietario de equipo no tiene facultades globales,
   y que las invitaciones a equipos existentes no transfieren propiedad.
9. Comprobar que la bitácora registra creación, revocación y canje, pero no
   contiene el token en claro.
10. Ejecutar `npm run team-invitations-check`, `npm run check`,
    verificaciones existentes y pruebas de navegador, también en móvil.
11. Revisar `supabase db advisors` para permisos de funciones SECURITY
    DEFINER y políticas RLS antes de cualquier promoción.
12. Confirmar que «Temporadas» y `season-sync` no han cambiado.

## Despliegue sin base alojada adicional

El repositorio es público y las pruebas usan un runner estándar gratuito
de GitHub Actions; la base Supabase se levanta de forma efímera y aislada,
se destruye al terminar, y solo contiene identidades y datos ficticios.
La migración aditiva se publicó en Supabase producción tras el resultado
verde. La actualización del frontend se integra en `main` mediante el PR #60,
con compilación de producción supervisada y temporadas intactas.
