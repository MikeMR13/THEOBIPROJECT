# Centro de Difusión — alcance editorial Discord y Telegram

## Alcance cerrado (octubre de 2026)

Las únicas integraciones contempladas son Discord (webhook nativo privado, sin intermediario externo) y Telegram (Bot API, grupos, supergrupos y canales).
Se retiran del menú las demás redes sociales y el módulo de webhooks personalizados. No se desinstala el webhook propio de Discord porque sostiene su conexión.

## Flujo manual

1. Cada equipo administra sus conexiones y el Bibliotecario solamente sus conexiones oficiales.
2. En **Borradores**, un editor puede crear un texto, partir de una plantilla rápida, editarlo y guardarlo.
3. Un usuario con permiso de publicación pulsa **Preparar anuncio** en un borrador, escoge destinatario y obra/volumen/capítulo público, y solicita vista previa al servidor.
4. La vista previa expone título, portada correspondiente al nivel y enlace público validados por el backend. El texto es editable y también puede guardarse como nuevo borrador.
5. **Solo** el botón de confirmación explícita realiza un envío externo; se previenen duplicados por canal/contenido. Los resultados fallidos o inciertos se muestran sin reintento ciego.

## Control de acceso

- `diffusion_compose` permite crear y editar borradores mediante RPC autorizada; sin publicación automática.
- `diffusion_publish` permite vista previa y publicaciones explícitas, manteniendo los controles server-side de contenido público.
- Se mantiene el aislamiento RLS entre equipos y cuentas oficiales del Bibliotecario.
- No se migran ni exponen secretos, tokens ni URLs privadas, y no se modifican conexiones existentes.

## Pendiente deliberado

- **Programación/calendario de difusión:** placeholder, no hay despachador.
- **Automatizaciones (fase 4):** todas desactivadas y sin cron nuevo.
- **Historial y analíticas avanzadas (fase 5):** aún pendiente ampliar.
- **QA de envío real:** por seguridad se requiere una confirmación explícita desde el panel con contenido público seleccionado. CI ejecuta comprobaciones sin enviar mensajes a Discord o Telegram.
