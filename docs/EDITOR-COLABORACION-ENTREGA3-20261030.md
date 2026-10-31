# Entrega 3 — Colaboración avanzada (2026-10-30)

Rama acumulativa: `feat/editor-productividad-obra-nueva-entrega2-20261030`, PR #221.
**No fusionar a `main` todavía.** La integración conjunta se hará cuando se hayan verificado todas las entregas. Sin migraciones ni cambios en Supabase/Vercel/Cloudflare.

## Revisar caso por caso
- Panel «Revisar» incluye navegador de coincidencias individuales: dobles espacios, puntos suspensivos, espacios antes de signos, rayas de diálogo, comillas y capitalización de glosario. También señala manualmente imágenes sin descripción y signos de apertura.
- «Ir al caso» muestra el bloque afectado. «Aplicar solo este caso» opera en el nodo de texto seleccionado y únicamente si el fragmento original no ha cambiado, y deja el capítulo como borrador sin publicarlo.
- Límite de 200 incidencias listadas para proteger capítulos muy largos. La revisión general existente continúa disponible.

## Sugerencias en línea y notas del equipo
- Al seleccionar texto de **un único párrafo** aparece una barra pequeña con «Sugerir cambio» y «Anotar párrafo». No se inyecta marcado en el cuerpo ni se sobrescriben capítulos al proponer.
- Las sugerencias reutilizan `editor_create_suggestion`, vinculadas a la versión guardada. Antes de crear una propuesta se exige guardar cambios locales y no tener conflicto.
- Las notas editoriales usan el registro `editor_suggestions` ya existente, con propuesta idéntica al fragmento y prefijo `[Obi:p:N]` en `note`. Se presentan distinguidas de los cambios de texto y llevan un enlace al párrafo solamente cuando la versión coincide. El equipo puede revisarlas con el permiso `review`; nadie revisa sus propias sugerencias.
- Este anclaje es **por índice de bloque y versión**, no por identificador persistente de párrafo. Si la versión cambia, se muestra «versión anterior» y se oculta el salto al párrafo para evitar referencias engañosas. No constituye anotación colaborativa en tiempo real.

## Comandos rápidos
- `Alt+Mayús+S`: sugerir sobre la selección; `Alt+Mayús+N`: nota del párrafo.
- `Alt+Mayús+J` / `Alt+Mayús+K`: siguiente/anterior incidencia de revisión.
- Los controles también son botones accesibles, con objetivos táctiles de 44 px.

## Validación y límites
- Ejecutar `node scripts/editor-colaboracion-entrega3-check.mjs`, CI integral y `npm run studio-browser-check`.
- No usa nuevos servicios ni funciones de pago. Las pruebas de CI son con datos simulados.
- Antes de fusionar: completar QA manual autenticada (varios roles, edición concurrente, versiones obsoletas y nota con equipos reales), verificar que la migración previa `20261030222055_editor_phase3_collaboration_20261030.sql` está aplicada en el entorno de destino, sin ejecutarla de nuevo desde aquí.
