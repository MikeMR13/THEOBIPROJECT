# Telegram · Difusión Fase 2c

- **Alojamiento:** el mismo Supabase, Vault y Vercel existentes. Sin proveedores nuevos de pago ni cron.
- **Destinos admitidos:** canales Telegram (`@usuario` o ID `-100...`). Crear un bot con @BotFather, añadirlo como administrador al canal con permiso para publicar, y registrar su token únicamente en Conexiones; **no pegarlo en chat ni GitHub**.
- **Prueba manual:** con botón, verifica identidad del bot, destino tipo canal y permisos de publicación; un intento por conexión cada 60 segundos.
- **Anuncios manuales:** obra, volumen y capítulo; portada estricta según nivel, foto real mediante `sendPhoto`, texto y URL de lectura. Sin imagen válida el servidor no envía el anuncio.
- **RLS, roles y protección:** equipos solo sus redes, Bibliotecario solo redes oficiales. Sin acceso de anon/authenticated a secretos. Reserva idempotente por contenido y conexión; fallos inciertos `unknown` sin reintento automático.
- **Solo se considera finalizada la conexión** después de una prueba enviada realmente desde la interfaz por alguien autorizado. No se crean ni envían bots automáticamente.
- **Precaución:** Telegram debe poder descargar la portada desde el bucket público obi-media; no se publica un mensaje solo texto como fallback.
