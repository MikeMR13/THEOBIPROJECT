# Editor — Fase 2: móvil y accesibilidad (30 de octubre de 2026)

## Implementación
- En pantallas de hasta 760 px, el editor comienza en vista **Editor** si la persona no guardó otra preferencia. Se respeta siempre `obi-ed-view` para las cuatro vistas existentes: Editor, Vista previa, Ambos y Original.
- Selector visible en móvil, sin menús nuevos ni pérdida de funciones; el estado seleccionado se transmite con `aria-pressed`.
- La barra completa de formato permanece disponible mediante desplazamiento horizontal, con una indicación de uso y controles táctiles de al menos 44 px.
- El área de escritura y el historial se adaptan al ancho pequeño, evitando desbordamiento horizontal.
- Los controles de formato solo con icono tienen nombres accesibles; vista, tema y dispositivo anuncian su estado seleccionado.
- Cada ilustración del editor admite foco por teclado (Tab) y abre su edición con Enter o Espacio. La descripción/ornamento, el texto alternativo, la ubicación y el pie siguen conservándose con las reglas de Fase 1.
- Escape cierra el panel Buscar y devuelve el foco a su botón, sin salir accidentalmente del editor.
- Se respeta la preferencia de reducción de movimiento y se mejora el espaciado seguro en modo concentración.

## Integridad y alcance
- **Sin SQL, sin cambio de tablas, sin cambios de contenido.** No se modifican capítulos, historial, versiones, permisos, roles, publicación, capítulos de preestreno, enlaces o activos.
- Se conservan los 490 respaldos iniciales protegidos por la Fase 0.
- La fase no contrata complementos Vercel/Supabase/Cloudflare.
- No cambia las preferencias del lector ni sus temas; los estilos se limitan a `.ed`.

## Pruebas
- `node scripts/editor-phase2-mobile-browser-check.mjs` ejecuta Chromium local, sin backend ni credenciales.
- Anchos de prueba: 320, 390, 760 y 1024 px; sin desbordamiento, toolbar operable, foco de figuras y vista adecuada.
- `node scripts/editor-phase1-quality-check.mjs` comprueba de nuevo el ida/vuelta de descripciones.
- Regresión general de GitHub Actions; revisar Preview de Vercel y fusionar solo con CI completo en verde.
- Tras fusionar, verificar despliegue `READY` en producción y que los conteos del historial y respaldos no han cambiado.

## Límite de verificación
Estas pruebas verifican comportamiento de Chromium con datos ficticios, geometría responsive y contratos de aplicación, pero no sustituyen un recorrido manual autenticado del Estudio con un dispositivo real y lector de pantalla.
