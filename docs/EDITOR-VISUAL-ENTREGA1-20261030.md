# Auditoría visual del editor — Entrega 1 (2026-10-30)

Se desarrolla sobre `main` después del parche PR #219. Alcance: vista previa fiel al lector, sincronización de selección, título multilínea, agrupación de controles y esqueleto de carga. **No se modifican capítulos, revisiones, roles, calendarios, ni migraciones.**

## Incluido

1. **Vista previa del lector:** comparte `formatChapterIndex` y `repeatedOpeningHeading` con el lector. Presenta `Capítulo 07 · La espada` en vez del número global `c.num`, reconoce prólogos y no oculta encabezados salvo que `smart_title===true`. Los bloques solo se filtran durante la representación; no cambian en base de datos.
2. **Vista previa fija y alineada:** en escritorio (anchuras mayores a 1100px), la vista previa permanece visible en modo Ambos. El bloque donde está el cursor queda identificado en la vista previa y esta se desplaza a su zona correspondiente. El seguimiento se pausa 2,5 segundos tras rueda, toque o puntero sobre la vista previa, para respetar desplazamientos manuales. En móvil no se fuerza una vista dividida ni un panel fijo.
3. **Título largo:** reemplazo de input de una línea por textarea multilínea con crecimiento moderado, contador y `maxlength=300`. La aplicación comprueba 300 caracteres antes de llamar a `save_chapter`, para no generar discrepancia entre título truncado del capítulo y título histórico. Los títulos existentes superiores al máximo se señalan y exigen una corrección consciente antes de guardarlos.
4. **Controles ordenados:** estado y Guardar visibles en primer nivel, modo concentración accesible y paneles de Revisar/Historial/Sugerencias/Aprobación dentro de `<details>`. La programación/publicación ocupa una fila propia sin cambiar las acciones ni sus permisos.
5. **Esqueleto de carga:** al entrar al editor desde Studio, muestra barra/título/texto simulados y `role=status` durante la importación del módulo y la consulta del capítulo. Se reemplaza al obtener contenido real.

## Límites

- La sincronización por índice corresponde a bloques editoriales y no es alineación matemática por línea. El usuario puede desplazar manualmente el panel de lectura, y el seguimiento no lo interrumpe durante 2,5 segundos.
- La vista previa conserva el estilo simplificado del lector, no simula funciones de cuenta o TTS.
- El esqueleto aparece una vez que el enrutador de Studio inicia la pantalla; no se modifica el arranque global de páginas públicas.
- Quedan para entregas posteriores: revisión caso por caso, sugerencias dentro del texto, mejoras del formulario de nueva obra y ajustes individuales de ilustraciones.

## Verificaciones gratuitas

`node scripts/editor-visual-entrega1-browser.mjs` ejecuta Chromium sobre hojas CSS reales con anchuras 1440, 390 y 320px. Confirma reglas de título del lector, marcado inteligente optativo, títulos largos, estado de controles, geometría fija y scroll al bloque de la vista previa. Se añade al CI general, junto al parche de sticky de 3000px y las fases del editor anteriores. Sin nuevos servicios y sin credenciales Supabase.
