# Editor de texto — Fase 5: escritura y glosario (30 de octubre de 2026)

## Fuente y alcance

Basado en «Editor de texto.docx», auditoría de 29 de octubre: prioridad P1 para autocorrección tipográfica y glosario dentro del texto, y mejora técnica de la copia local. Sin editor paralelo, sin tocar capítulos históricos, sin servicios de pago.

## Implementado

- Autocorrección optativa por navegador, desactivada inicialmente. Convierte tres puntos en … y dos guiones al inicio de párrafo en raya — durante la escritura.

- No modifica texto al abrir o importar, ni al pegar. La entrada por IME (japonés, chino, coreano), ruby e imágenes queda protegida.

- Glosario contextual: muestra hasta cinco coincidencias tras tres caracteres. Incluye categoría y definición. Solo inserta al hacer clic en una propuesta; nunca cambia automáticamente el texto.

- CSS Custom Highlight opcional: subraya términos del glosario en el bloque actual sin modificar HTML ni datos. Fallback de sugerencias cuando no es compatible.

- Copia local como máximo aproximadamente una vez por segundo; se fuerza al ocultar/salir y se elimina al confirmar guardado remoto. Se mantiene control de versiones y autoguardado original.

## Garantías

- No hay migraciones SQL ni cambios de RLS, roles, contenidos, publicaciones o calendario.

- Los capítulos existentes, copias de Fase 0, revisiones, sugerencias y aprobaciones anteriores se conservan.

- La autocorrección optativa evita aplicar automáticamente reglas ambiguas como comillas o ***.

## Pruebas

- scripts/editor-phase5-writing-check.mjs ejecuta Chromium local aislado: autocorrección voluntaria, IME, puntero de inserción de glosario, exclusiones y regresión estática.

- GitHub Actions valida también las fases previas, Vitrina, lector, móvil, SEO, publicación y accesibilidad. Vercel Preview debe estar READY antes de fusionar.

- Tras la integración verificar producción READY y los 490 capítulos, 490 respaldos y 491 revisiones.

## Trabajos posteriores de la auditoría original

Pendientes para próximas etapas: notas internas ancladas, restauración parcial de párrafo, buscar/reemplazar por volumen, imágenes separador/tamaños, original alineado y exportación DOCX/EPUB. No se incluyen aquí para evitar riesgos editoriales.

## Límite

Las preferencias se conservan en localStorage del navegador; no se sincronizan entre dispositivos. El resaltado requiere soporte CSS Custom Highlight. Una prueba manual autenticada complementa las pruebas locales.