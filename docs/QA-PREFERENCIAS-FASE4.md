# Preferencias — fase 4: evidencia y criterios de liberación

Fecha de ejecución: 2026-10-21 / madrugada 2026-10-22 UTC (GitHub Actions).

## Alcance e integración

Cadena de cambios pendiente de revisión y **sin fusionar a producción**:

1. `main` → PR #45 (fiabilidad y borradores, rama `fix/preferencias-fase1-confiabilidad-20261021`).
2. PR #45 → PR #46 (navegación y accesibilidad, rama `feat/preferencias-fase2-navegacion-20261021`).
3. PR #46 → PR #47 (vistas explicativas, rama `feat/preferencias-fase3-personalizacion-20261021`).
4. PR #47 → PR de fase 4 (QA, rama `test/preferencias-fase4-qa-integral-20261021`).

No combinar las ramas mediante copia de archivos sobre `main`. Revisar los PR en orden y verificar que no haya divergencias antes de hacer cada merge. Evitar utilizar la rama histórica `test/integracion-fases1-5-preferencias-20261020` como base nueva: diverge de `main` y podría revertir otras correcciones.

## Evidencia automatizada

Se ejecutan sin credenciales reales, con datos ficticios y sin llamadas externas:

- `npm run preferencias-fase1-check`: borradores de lectura, aislamiento por cuenta y sincronización por revisión.
- `npm run preferencias-fase2-check`: ocho rutas y cuatro grupos, selector móvil y accesibilidad de controles.
- `npm run preferencias-fase2-browser`: geometría en Chromium a 320, 390, 760, 768, 1024 y 1440 px.
- `npm run preferencias-fase3-check`: modelos de previsualización de lectura, audiencias y avisos.
- `npm run preferencias-fase4-browser`: abre el módulo **real** `src/profile.js` en Chromium a 320, 390, 768 y 1280 px y conecta un backend simulado. Comprueba:
  - selección móvil y navegación con borrador sin guardar (confirmar/cancelar);
  - vista de privacidad para visitante y cuenta, actualización de secciones y guardado simulado;
  - correo apagado, reactivación y persistencia de canales al volver a apagar;
  - guardado de lectura, fallo de sincronización, borrador local y recuperación;
  - cambio entre dos identidades ficticias sin herencia del caché;
  - tamaño de áreas táctiles, elementos responsive y desbordamiento.
- El flujo principal `ci` de GitHub Actions mantiene los contratos históricos, el build, QA editorial, offline, lector, Studio y seguridad de configuración.

**Importante:** una cuenta inventada en el navegador y una respuesta mock no demuestran que Supabase RLS, las funciones SQL, OAuth ni el correo real funcionen contra un servicio remoto.

## Bloqueos antes de producción

Pendiente de ejecutar con **cuentas de prueba autorizadas** en un **backend Supabase aislado de producción**:

- [ ] Iniciar sesión con dos usuarios reales de prueba (A y B), modificar ajustes y comprobar que B no puede leer el perfil privado ni los datos internos de A.
- [ ] En A: modificar tipografía/tamaño/tema global y por volumen, salir, volver a iniciar sesión y verificar recuperación tras recarga, sesión nueva y dispositivo distinto.
- [ ] Simular pérdida de conectividad durante el guardado, reiniciar la pestaña, restaurar conectividad y comprobar la confirmación del servidor y ausencia de duplicados o cambios perdidos.
- [ ] Abrir Perfil público, editar biografía, enlaces, portada y favoritas; cancelar la navegación, recuperarlo y guardar. Confirmar que la vista pública corresponde al resultado guardado.
- [ ] Verificar `all`, `auth`, `none` desde navegador anónimo y desde otra cuenta (incluidos enlaces directos, metadatos, resultados de búsqueda y acceso a reseñas y estanterías).
- [ ] Verificar avisos de campana y entregas de correo (inmediato/diario/semanal), zona horaria y lista de series seguidas mediante colas aisladas de QA, **sin contactar a lectores reales**.
- [ ] Revisar foco, navegación solo con teclado, lectores de pantalla, zoom de 200 %, movimiento reducido y dispositivos táctiles reales.
- [ ] Confirmar subida/cambio de avatar y portada sin archivos huérfanos; probar rutas de error, límites de tamaño y URL no válida.
- [ ] Comprobar rollback y restauración de `main`/despliegue anterior si el entorno Preview falla.
- [ ] Verificar Vercel Preview apunta únicamente a backend QA. **Nunca** ejecutar pruebas con mutaciones contra Supabase de producción.

## Decisión de liberación

**NO APTO PARA PUBLICAR** hasta completar la matriz autenticada anterior y tener CI verde para el commit exacto del candidato. La fase 4 automatizada puede estar aprobada y la liberación seguir bloqueada por falta de evidencia real.

Se puede revisar y fusionar en orden después de las pruebas; no se ha solicitado despliegue a producción.
