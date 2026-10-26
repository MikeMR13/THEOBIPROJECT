# Carga lenta de Inicio: miniaturas y créditos paralelos (26 oct 2026)

## Síntoma
Los encabezados y menús aparecen, pero las obras y portadas se dibujan después.

## Diagnóstico fundamentado
- Supabase: `private.home_snapshot` fresco, aproximadamente 12.5 KB en JSON; `public.home_feed` alrededor de 29 ms de media en consultas acumuladas de `pg_stat_statements` (no mide latencia de la red del lector).
- El código de Inicio tenía un orden secuencial: esperar `home_feed + my_adult_ok + volumes`, **luego** esperar otra RPC para `series_public_credits`, y finalmente renderizar.
- En un bucle, Inicio reemplazaba `series.cover_path` con la portada del último volumen y asignaba `series.cover_thumb_path=null`. El inventario de producción mostró **3 de 9 obras** en las que se perdería una miniatura válida por esta ruta. Algunas imágenes originales superan 2 MB, mientras que las miniaturas pesan 30–55 KB.
- `heroSlide` y la sección de lanzamientos seleccionan expresamente `v.cover_path` para volúmenes nuevos: no necesitan alterar la portada de la obra entera.
- Cloudflare aplica un desafío 403 a los runners desde algunas regiones; esa prueba no mide latencia del lector. El subdominio de Vercel respondió HTTP 200 desde el runner.

## Cambios de código
1. Iniciar `series_public_credits` inmediatamente después de disponer de `home_feed` y de la autorización +18, **mientras continúa la carga de volúmenes**.
2. Conservar `series.cover_path` y `series.cover_thumb_path` sin sobreescribirlos desde `volumes` (el primer render de tarjetas sigue usando WebP).
3. Mantener las portadas específicas del volumen en Hero y Lanzamientos y toda la validación +18 previa a dibujar obras.
4. Añadir un test de regresión al `npm run verify` y dejar los demás contratos/funciones intactos.

## QA y liberación
- `npm run verify`, compilación, QA responsive/portadas y CI general de GitHub.
- Confirmar navegación pública, cuentas con y sin permiso +18, logos de colaboradores, lanzamientos de volúmenes y portadas en móvil.
- No se crean servicios nuevos, caches de pago ni recursos Supabase.
- Revertir solo el commit de este PR para restaurar el orden previo si aparece una regresión.
- No tocar Cloudflare ni DNS: los HTTP 403 de automatización provinieron de reglas de seguridad regional/bot, no de una prueba concluyente de la navegación del usuario.

El cambio reduce una dependencia secuencial y evita transferencias de imágenes grandes para tarjetas. El beneficio medible desde la ubicación de cada lector todavía debe comprobarse.
