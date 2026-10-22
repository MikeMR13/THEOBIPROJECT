# Bibliotecario: autoridad administrativa, no edicion editorial

Estado: **codigo de la etapa 1 preparado; SQL NO aplicado**.

## Principio aprobado
El Bibliotecario es la maxima autoridad administrativa de El Obi del Lector.
Puede supervisar todos los equipos, obras, volumenes, capitulos y borradores,
pero su rol no le concede automaticamente facultades para traducir, editar,
publicar, programar, borrar archivos de los equipos o modificar sus disenos.
La edicion pertenece a los integrantes con el rol correspondiente, dentro
de cada equipo. La moderacion se realiza mediante operaciones especificas,
justificadas, reversibles cuando sea posible y auditadas.

## Etapa 1: archivos de la rama de validacion
- `supabase/migrations/20261022145000_bibliotecario_supervision_no_editorial.sql`:
  quita la concesion administrativa de `private.team_can` y las politicas
  directas `series admin`, `teams admin` y `members admin`.
- Conserva `private.in_team` para lectura de supervision, **no** para escribir.
- Restringe carga/sustitucion de archivos `obi-media` y `obi-epub`.
- Protege mediante trigger la salida/degradacion del ultimo propietario.
- Exige propietario registrado en `admin_create_team`.
- Exige justificacion en `admin_add_publisher` y `admin_remove_member`.
  No permite asignar o retirar propietarios a traves de estos dos RPC.
- `src/admin.js` se adapta a las nuevas firmas de esos RPC.
- `scripts/admin-permissions-check.mjs` aporta comprobaciones estaticas
  (no es una prueba de autorizacion de la base de datos).

## Criterios para validar en un Supabase AISLADO
Nunca aplicar estas instrucciones directamente a la base Supabase productiva.
El despliegue preview de Vercel **no** crea una base de datos staging.

1. Partir de copia saneada del esquema y comprobar que todos los equipos
   tienen al menos un propietario; ejecutar la migracion solo en staging.
2. Confirmar que Bibliotecario puede leer obras, capitulos no publicados,
   integrantes, solicitudes, reseñas e informes de toda la plataforma.
3. Confirmar que Bibliotecario **no puede** insertar, editar, programar o
   eliminar series, capitulos, volumenes ni recursos editoriales ajenos,
   ni por el Mostrador ni llamando directamente a PostgREST/Storage.
4. Confirmar que propietario y equipo siguen realizando todas sus acciones
   editoriales originales y que un integrante de otro equipo no puede hacerlo.
5. Confirmar que crear equipo sin propietario, propietario inexistente o
   propietario Bibliotecario falla sin crear equipo parcial.
6. Confirmar que crear equipo con usuario registrado genera miembro `owner`,
   que se convierte en publicador y puede entrar al Studio.
7. Confirmar que el Bibliotecario puede asignar/cambiar roles no propietarios
   solo indicando un motivo de longitud suficiente y que existe auditoria.
8. Confirmar que una reasignacion no conserva `role_id` ni `overrides` previos.
9. Confirmar que retirar un miembro no propietario requiere motivo, deja
   capitulos previamente asignados sin asignacion y registra el cambio.
10. Confirmar que borrar/degradar al ultimo propietario falla incluso por
    intentos directos; la eliminacion normal de un equipo no debe quedar
    inadvertidamente bloqueada por la comprobacion del trigger.
11. Confirmar que los flujos de aprobacion de solicitudes, reseñas,
    verificacion de enlaces y configuracion general siguen operativos.
12. Ejecutar `node scripts/admin-permissions-check.mjs`, el conjunto
    completo de verificaciones del repositorio y analisis de seguridad.

## Pendiente de etapas siguientes
- Transferencia excepcional de propiedad mediante flujo propio, razon,
  confirmacion, notificacion y auditoria.
- Sanciones y suspensiones de cuentas/equipos separadas del estado editorial.
- Intervenciones de contenido con justificacion, cola y restauracion.
- Auditoria reforzada de ajustes generales y moderacion de reseñas.
- Autorizacion explicita del endpoint `season-sync`.
- Rotacion y proteccion de la credencial del endpoint `publish-asset`.
- Pruebas reales RLS, RPC y Storage con usuarios de cada rol en staging.
- Plan de despliegue coordinado: primero migracion probada, luego frontend.
  No promocionar esta rama a `main` mientras el backend sea incompatible.

## Riesgo del preview
Las nuevas llamadas del Mostrador usan firmas de RPC que la base de
produccion aun no tiene. Si una preview apunta a esa base, **no deben
probarse alli** crear equipos, agregar o retirar miembros: daran error
hasta validar el backend en staging. Esto no implica modificar produccion.

Referencia: `src/admin.js`, `src/studio.js`, `supabase/migrations/`.
