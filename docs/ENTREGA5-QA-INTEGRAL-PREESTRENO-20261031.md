# Entrega 5 — actualización del dictamen de preestreno
**Corte técnico:** 31 de octubre de 2026. **Base:** `main` (`76970debc16c0c242899c4f53546aa46487d9a20`) + migraciones productivas ya aplicadas. **No equivale a aceptación manual ni autoriza el estreno.**

## Bloqueos del informe original: situación verificada
1. **Acceso y Patreon:** el arreglo del PR #231 está fusionado. `src/studio.js` ahora exige `chapters.data` y verifica `chapters.error` después de la paginación. La Entrega 5 simula 503 capítulos en dos obras para evitar regresiones.
2. **Difusión automática:** el mismo PR #231 corrigió el `thenable` de PostgREST y añadió un corte preventivo por anuncios antiguos. La Edge Function `diffusion-dispatch` desplegada (v2) y el archivo correspondiente en `main` coinciden byte a byte; no se desplegó ninguna función adicional en esta actualización.
3. **Dos anuncios automáticos vencidos:** la consulta de solo lectura actual muestra **1 `discord` y 1 `telegram` en `cancelled`**. Ya no están en `planned`; por tanto, el bloqueo de esos dos casos históricos está resuelto. No se enviaron mensajes en este trabajo.
4. **Fichas de novelas:** el arreglo PostgREST (PR #237) ya fue aplicado a Supabase como migración `20261031221858`. Se elimina la FK inversa ambigua; el validador editorial sigue activo. SQL y prueba se incluyen en la rama de cierre.
5. **Carrusel de Inicio:** el arreglo del feed (PR #238) ya fue aplicado como migración `20261031225243`. El feed devuelve 80 novedades, con 14 de 14 obras representadas en la comprobación posterior; se documenta el mismo SQL en la rama de cierre.

## Automatización y controles
- `scripts/entrega5-preestreno-qa-check.mjs`: comprueba los contratos, simula RPC sin `.catch()`, verifica barrera de vencidos y prohíbe envíos externos, y genera `qa-evidencia/entrega5-resultado.json`.
- La matriz cubre lector, Biblioteca, Estudio, Difusión, SEO, perfil, PWA, responsive y accesibilidad con los recorridos de GitHub Actions (sin servicios de pago).
- Dos pruebas SQL adicionales evitan reintroducir relaciones ambiguas o novedades monopolizadas por una importación masiva.
- **`--strict` debe seguir fallando** hasta que se valide manualmente el estreno. No maquillar el resultado como `READY`.

## Aceptación manual pendiente antes del estreno
1. Lector autenticado real: Biblioteca, Continuar, progreso entre dispositivos, acceso restringido y lectura sin conexión.
2. Editor real: Acceso y Patreon en obras de múltiples volúmenes; comprobar precios y niveles de acceso sin cambios accidentales.
3. Bibliotecario/editor con permisos distintos: revisar Difusión y calendario sin publicar ni reclamar mensajes reales.
4. Capturas y navegación con sesión real a 320, 390, 768 y 1440 px; incluir lector, ficha, ranking, preferencias y Estudio.
5. Carrusel: confirmar en navegador real la portada inicial, preestrenos, rotación y publicación de capítulos nuevos; la lógica de recarga en pestaña abierta necesita actualización del frontend.

## Política de costos y despliegue
No modificar el dominio en esta entrega. Vercel producción permanece en el commit `76970deb` (READY). Las reparaciones de SQL **ya están en Supabase** y no requieren construir frontend otra vez. La rama se mantiene en PR hasta contar con una ruta que garantice **cero cargos adicionales de Vercel, Supabase y Cloudflare**; GitHub Actions será el único runner de CI.

**Resultado técnico:** bloqueos históricos P0 resueltos en el código y servicio desplegado, aceptación manual todavía pendiente. No declarar el preestreno liberado.
