# Fase 6.2 — Temporadas, temas y preferencias

**Fecha:** 20 de octubre de 2026. **Rama:** `test/fase6-2-temporadas-preferencias-20261020` derivada de fase 6.1 (PR #16). **Sin fusión ni despliegue de producción.**

## Objetivo y alcance

Preservar las elecciones del lector y del equipo traductor, con prevalencia manual/automática y sin alterar contenidos, portada, avisos, cinta, carruseles, Studio ni preferencias almacenadas en Supabase.

## Hallazgos y correcciones

**QA-THEME-01 — Preferencia de temporada apagada pero con banner de Inicio.**
La función `platformKey()` devolvía la temporada activa aunque la persona hubiese guardado `obi-season=off`; el Home la consultaba independientemente para insertar la invitación «El sitio se viste de temporada». Ahora `platformKey` devuelve `null` con las temporadas desactivadas; el parámetro de simulación explícito `?temporada=…` conserva su prioridad y no cambia la preferencia guardada.

**QA-THEME-02 — La página pública de un equipo ignoraba la opción personal de desactivar temporadas.**
El render de equipo usaba `TP.effective` con el calendario propio de la traducción, sin respetar `obi-season=off`. Ahora la página pública pasa `sim: ''` a `TP.render` y a `TP.effective` únicamente cuando el lector apagó la decoración. Conserva todas las preferencias normales del equipo (tipografía, logos, portada, plantilla, acento y patrón base). **No se altera `TP.effective` ni la simulación de Studio**, que sigue permitiendo evaluar temporadas explícitamente y sin escribir en Supabase.

**QA-THEME-03 — Aplicación tardía del tema de una página anterior.**
`afterRender()` espera operaciones asíncronas de temporadas; al cambiar rápidamente de ruta, una respuesta anterior podía llegar después e intervenir en el tema del destino. Se añadió contador de aplicación y comparación de `pathname+search` antes de aplicar el estilo. No se cambia la navegación.

## Matriz de conservación

| Área | Garantía de código | Verificación |
|---|---|---|
| Inicio | La insignia estacional adicional obedece a preferencia del usuario | Test directo de `season.platformKey` |
| Catálogo | El tema estacional global depende de la misma función | Contrato de `app.js` y prueba de desactivación |
| Ficha de obra | La temporada del equipo prevalece sobre la de plataforma si se eligió; pero el lector la puede apagar | Contratos de `app.js` / `season.apply` |
| Equipo público | Diseño sin adorno de temporada cuando `obi-season=off`; logo, patrón base y contenido permanecen | `TP.render` con datos ficticios |
| Vista previa de Studio | Permite simular `hanami` u otras temporadas sin escribir el diseño | `TP.render`, `structuredClone` y comparación |
| Calendario de equipo | Manual prevalece sobre auto; «Solo colores» sin partículas | `activeSeason`, `TP.effective` |
| Preferencias del lector | Predeterminado del equipo → global → volumen | Contratos existentes y nueva aserción |
| Preferencias de interfaz | Se restaura `profiles.ui_prefs` tras iniciar sesión y se guarda en local | Contratos sobre `app.js` |
| Navegación | No se aplica un tema tardío de ruta anterior | Protección por secuencia de `afterRender` |

## Pruebas

- `scripts/phase6-seasons-preferences-check.mjs`: usa `season.js`, `anim.js` y `teampage.js` reales, con mock de calendario Supabase, sin datos personales ni red.
- Ejecuta activación, desactivación, simulación explícita, prioridad manual, «Solo colores», render público con y sin temporada, inmutabilidad del diseño y contratos de sincronización/preferencia.
- Nuevo paso en `.github/workflows/ci.yml`, junto con CI conjunto y Chromium de fases anteriores. **El resultado del CI definitivo debe consultarse tras la última modificación de esta rama.**

## Validación visual/manual pendiente

No se ha inspeccionado desde este entorno una sesión autenticada del Preview correcto con configuraciones reales. Verificar, en el mismo usuario, antes/después de recargar: (a) apagar/reencender decoración desde Preferencias; (b) Home/Catálogo/ficha/página de equipo y lector, (c) dos equipos con temporadas distintas, (d) menú móvil, (e) simulación y publicación de equipo por una cuenta de pruebas autorizada, (f) navegación rápida Inicio → Catálogo → Ficha para detectar temas residuales, (g) cambios de accesibilidad, tipografía, tema, modo de lectura y preferencias por volumen.

**No se afirma cobertura integral WCAG ni persistencia real verificada con cuentas.** Las pruebas de funciones no equivalen a validación visual del despliegue.

## Restricciones

Ningún cambio a Supabase, tablas, RLS, credenciales, costos, roles, cuentas, producción o dominio. PR #10–#16 intactos; esta fase se mantiene aislada como continuación de PR #16 y no debe fusionarse a `main` sin aprobación.
