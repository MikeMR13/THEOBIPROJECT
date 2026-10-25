# Discord · Difusión Fase 2a · Desarrollo sin despliegue

La implementación está exclusivamente en la PR #116. No aplicar SQL ni desplegar funciones en Supabase alojado sin aprobación.

## Alcance

- Migración SQL: referencias privadas a secretos cifrados mediante Supabase Vault. Ninguna URL o token se devuelve al navegador.
- RPC de vinculación, prueba limitada a una ejecución por 60 segundos y desconexión segura, con permisos independientes para cada equipo y para el Bibliotecario.
- Función servidor: autenticación de usuario, comprobación de permiso, URL limitada a Discord y mensaje de prueba fijo sin menciones.
- Interfaz: campo privado para URL, guardar conexión, ejecutar prueba manual y desconectar.
- No se activa ninguna regla, trabajo en cola, cron, difusión automática ni llamada externa desde CI.

## Límites de QA

El workflow PostgreSQL utiliza una implementación simulada de las firmas de Vault para comprobar el SQL y los permisos. No demuestra cifrado real en ese entorno. Antes de producción, validar con Supabase CLI completo, Vault auténtico y el flujo HTTP con usuarios de prueba.

## Siguiente acción para el responsable

Conservar el webhook recién creado en Discord sin compartir su URL. Cuando se apruebe y despliegue el conector, entrar al Centro de Difusión, pegar la URL en el campo privado y enviar una prueba explícita. Confirmar recepción en #difusion-pruebas.
