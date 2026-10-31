# Entrega 2 — Productividad y Obra nueva (2026-10-30)

Desarrollo aislado sobre `main`. No despliega el sitio ni escribe en Supabase.

## Nueva obra
- Extraído `newWork()` a `src/studio-new-work.js`, conservando selección de equipo, roles y el flujo **obra privada → volumen borrador → capítulo borrador**.
- Barra de guardado accesible con comportamiento sticky y foco en móvil.
- Vista previa del archivo de portada antes de guardarlo. Se libera el enlace temporal al sustituir la imagen.
- Contador de caracteres de la sinopsis y pasos con `aria-current="step"`.
- Borrador temporal guardado **solo localmente por usuario/equipo**; caduca a los 30 días. No almacena archivos de portada ni credenciales y se limpia cuando el servidor confirma la creación de la obra.

## Editor de capítulos
- Índice navegable a partir de títulos, separadores y posiciones de avance cada 25 bloques. No altera el capítulo.
- Fichas de glosario con búsqueda local y opción de localizar cada término en el texto. Se utilizan términos que ya se cargaban para revisar; sin consultas añadidas.
- Guía desplegable de atajos existentes. No agrega comandos de teclado que puedan interferir con el navegador.

## Seguridad, compatibilidad y pruebas
- Conservar permisos de creación, guardados en `series`, `volumes` y `chapters`, sin nuevos esquemas.
- Mantener intactos los eventos de publicación y el motor del lector.
- QA gratuito: `studio-functional-smoke.mjs`, `studio-work-fields-check.mjs`, `studio-obras-auditoria-check.mjs` y `editor-productividad-entrega2-check.mjs` con el CI vigente.
- Requiere verificación visual y funcional con cuenta de prueba antes de considerar la entrega lista para fusionar.
