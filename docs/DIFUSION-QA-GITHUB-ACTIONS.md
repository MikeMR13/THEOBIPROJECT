# Difusión — pruebas aisladas en GitHub Actions

Los workflows usan contenedores temporales sin conectar con el Supabase alojado, sin ramas pagadas, sin datos ni credenciales reales.

## PostgreSQL 17 mínimo

`diffusion-isolated-db.yml` aplica los archivos SQL de Difusión en un esquema sintético de Auth, roles y dos equipos. Comprueba RLS, privilegios, RPC y separación de equipos con un adaptador de firmas Vault **simulado**.

## Supabase CLI con Vault real

`diffusion-vault-real.yml` crea una pila Supabase completamente local. Aplica las migraciones `20261025232409_diffusion_phase1_controlled_20261025.sql` y `20261025232432_diffusion_discord_manual_controlled_20261025.sql`, prueba dos equipos, Bibliotecario y anónimo, verifica cifrado auténtico Vault y confirma borrado del secreto al revocar.

**Limitaciones:** el fixture recrea solo los contratos relevantes y no todos los esquemas históricos; las pruebas SQL no equivalen a pruebas HTTP con usuarios reales ni confirman una publicación externa en Discord.

## Regla editorial

Equipos traductores autónomos sin autorización del Bibliotecario. Revisión opcional interna de equipo; redes oficiales exclusivas del Bibliotecario.

Los nombres actuales de migración coinciden con las versiones ya aplicadas en el historial de Supabase, evitando intentos de instalación duplicada en futuras sincronizaciones.
