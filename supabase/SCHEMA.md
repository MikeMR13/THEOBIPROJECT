# Esquema en producción · snapshot 2026-10-15

Proyecto `qfllthjpjuaztppvpsrk`. 22 migraciones aplicadas (la última: `fix_chapters_read_team_on_insert`) (`20261014032358_obi_core_schema` → `20261015182906_translator_requests_flow`); `glossary_terms` existe pero se aplicó fuera del registro de migraciones. Para versionar el SQL completo: `npx supabase db pull`.

## Tablas (public)
- `annotations`: id, user_id, chapter_id, block, start_at, end_at, quote, color, note, shared, created_at, updated_at
- `bookmarks`: id, user_id, chapter_id, pct, label, created_at
- `chapter_revisions`: id, chapter_id, created_by, title, body, note, created_at, kind (manual|auto|restore|publish), version, lint_count — solo se escriben vía `save_chapter`
- `chapters`: id, series_id, vol, num, title, body, status chapter_status, publish_at, public_at, created_at, updated_at, section_type, sort_order, review_status, deleted_at, legacy_id, version, volume_id, teaser, teaser_on, content_warnings text[], lint jsonb, lint_count
- `characters`: id, series_id, name, role, descr, portrait_path
- `collaborations`: id, series_id, inviter_team, invited_team, status, created_at
- `collections` / `collection_items` / `collection_saves`
- `comments`: id, chapter_id, user_id, para, parent_id, body, spoiler, created_at
- `comment_votes`: comment_id, user_id, value
- `download_links`, `purchase_links`, `support_links`
- `editorial_tasks`: id, team_id, series_id, title, details, status, priority, assigned_to, created_by, due_at, created_at, updated_at
- `follows`: series_id, user_id, channels jsonb
- `glossary` (legacy: term, cat, def) y `glossary_terms` (term, category, definition) — duplicadas
- `import_jobs`: id, team_id, created_by, filename, file_type, mode, status, result, created_at, fingerprint, media_paths
- `moderation_audit`: id, actor, action, target_type, target_id, detail, created_at
- `notifications`: id, user_id, kind, body, link, read, created_at
- `patreon_events`: id, team_id, event, payload, created_at
- `patreon_tiers`: id, team_id, name, price_usd, early_weeks, patreon_tier_id
- `profiles`: id, username, avatar_url, role app_role, donor_tier, donor_until, patreon_user_id, discord_id, telegram_id, adult_ok, bio, banner_url, discoverable, public_library, public_activity, platform_role
- `publication_events`: id, team_id, series_id, actor, event, summary, created_at
- `ratings`, `reactions`, `reviews`, `review_votes`
- `read_chapters`, `reading_history`, `reading_progress` (chapter_id, block, offset_px, pct, mode), `reader_prefs`, `reader_follows`, `shelves`
- `reports`: id, chapter_id, user_id, kind, quote, fix, status report_status, created_at
- `review_requests`: id, chapter_id, requested_by, assigned_to, note, status, review_note, approved_hash, created_at, reviewed_at
- `schedule`, `volume_schedule`
- `series`: id, team_id, slug, title, … theme, cover_path, views, published, tags, …
- `team_join_requests`, `team_members` (role team_role, permissions, overrides)
- `teams`: id, slug, name, bio, color, langs, socials, official_verified, settings, reader_defaults, scene_separator, require_approval, status, avatar_path, banner_path
- `translator_requests`
- `volumes`: id, series_id, num, title, cover_path, status, published_at, …, epub_fonts, announced_at

## Enums
app_role(reader|translator|proofreader|collaborator|mod|admin) · team_role(owner|editor|proofreader|collaborator|admin|translator) · chapter_status(draft|scheduled|published) · report_status(open|fixed|dismissed)

## Funciones
- `save_chapter(p_id, p_expected int, p_title, p_body, p_note, p_snapshot, p_meta, p_kind)` — única versión; la de timestamptz se eliminó
- RPC: admin_add_publisher, admin_audit, admin_create_team, admin_decide_request, admin_overview, admin_remove_member, admin_users, cancel_translator_request, media_in_use, my_team_permissions, obi_user_by_email, publish_volume, save_chapter, submit_translator_request, team_find_user, whoami
- private: audit, can_edit_team, chapter_readable, chapter_team, collab_team, complete_on_final_volume, guard_publish, handle_new_user, in_team, is_admin, is_donor, is_mod, is_publisher, purge_old, require_approval, review_rules, run_publications, series_team, sync_publisher, team_can, team_role_of

## Triggers
chapters: final_volume, require_approval, guard_publish · volumes: guard_publish · review_requests: review_rules · team_members: sync_publisher
**No existe** el webhook `chapters → obi-notify`.

## Storage y extensiones
Buckets: obi-epub (privado), avatars, obi-media, obi-app (públicos). Extensiones: pgcrypto, uuid-ossp, supabase_vault, pg_cron, pg_net.

## Fase 3 · Equipo
- `team_roles`: id, team_id, name, color, description, perms jsonb (view, edit, create, import, publish, schedule, delete, review, board, members, profile, log), base, sort. Cada equipo nuevo recibe 5 roles (trigger `teams_seed_roles`). Solo lectura por RLS; se escribe con `team_role_save` / `team_role_delete`.
- `team_members.role_id` → team_roles. `private.team_can`: propietario > excepción individual (`overrides`) > permisos del rol > rol heredado (enum).
- Integrantes solo por RPC: `team_member_add(p_team, p_email, p_role)`, `team_member_set(p_team, p_user, p_role, p_overrides)`, `team_member_remove(p_team, p_user)`. Solo el propietario concede «members».
- `chapters.stage` (traduciendo | correccion | listo), `assigned_to`, `stage_at`. «Programado» = status scheduled. `chapter_move(p_id, p_stage, p_assignee, p_set_assignee)` exige «board» y avisa en `notifications`.
- `team_log`: bitácora llenada por triggers (chapters, chapter_revisions manual/restore, team_members, team_roles, teams, series). Lectura con permiso «log». Cron `obi_team_log_purge` borra lo de más de 12 meses.
- `teams`: perfil editable con permiso «profile» (`can_edit_team`); restricción `teams_profile_checks` (nombre, slug, bio ≤ 600, color).

## Fase 4 · Lectores
- `chapter_views(chapter_id, day, n)`: sin lectura directa. `track_view(p_chapter)` (anon) suma 1 y también `series.views`; el lector lo llama una vez por capítulo y día por dispositivo.
- `series_stats(p_series, p_days)` → jsonb { daily, followers, chapters[{views, views_total, finished, here, comments, reactions, reports}] }. Solo integrantes.
- `comments.pinned`; `team_comments(p_team, p_unanswered, p_series, p_limit, p_before)`; `comment_pin(p_id, p_on)` (permiso review). Borrar comentarios y cerrar erratas: permiso «review».
- Avisos (`notifications`): respuesta a tu comentario, errata nueva (al asignado o a quien tenga «review»), errata corregida (a quien la reportó). `notifications_read_all()`.
- `download_links`: + volume_id, label, donor_only, clicks, sort. Lectura directa solo para el equipo; público vía `series_downloads(p_series)` (sin URL) y `download_open(p_id)` (devuelve la URL, cuenta el clic, exige donador si aplica).
- Corrección: `private.can_edit_team` vuelve a significar «edit»; perfil del equipo usa «profile» y solicitudes de ingreso «members».

## Fase 5 · Extras
- `purchase_links`: + volume_id, created_by, verified_at, clicks. El equipo propone (verified=false) y quita; solo el Bibliotecario modifica/verifica (trigger `purchase_guard`). Públicos solo los verificados. `purchase_open(p_id)` cuenta el clic y devuelve la URL. Cola: `admin_purchase_queue()`.
- Zona horaria del equipo: `teams.settings.timezone` (IANA). El Estudio muestra y captura fechas en esa hora.
- Importador: las imágenes van a `obi-media/{team}/obras/{slug}/vol-{n}/` (fuentes en `…/fuentes/`); el editor sube a la misma carpeta. La portada elegida se guarda en `volumes.cover_path` (y opcionalmente `series.cover_path`). Del EPUB se toman ISBN, editorial y sinopsis para el volumen si estaban vacíos.
- `publish_volume(p_volume, p_at default null)`: única versión (se eliminó la de un solo argumento, sin permisos). Sin fecha publica; con fecha futura programa.
- `chapters`: política extra «chapters read team» (in_team por series_id) para que INSERT … RETURNING funcione al crear o importar.

## Página del equipo (Preferencias y Anuncios)
- `teams.design` jsonb: diseño publicado (tema, plantilla, colores, tipografía, formas, patrón, lema, orden de secciones, destacadas, anuncio, animaciones, partículas, temporadas). Se normaliza en `src/teampage.js`.
- `team_design_drafts` (borrador + token de vista previa), `team_design_versions` (últimas 10). RPC: team_design_save, team_design_publish, team_design_restore, team_design_new_token, team_design_preview.
- `team_custom_themes` (máx. 12 por equipo). `team_follows` + `team_followers(p_team)`.
- `team_announce_set(p_team, p_announce)`: publica el anuncio directo en el diseño publicado y en el borrador.
- `season_calendar` (2026–2029) + cron diario `obi-season-notices` → `private.notify_seasons()` avisa 7 días antes.
- Permiso de equipo usado: «profile».

## Ranking (migración 20261024_ranking.sql)
- `series_daily(series_id, day, n)`: lecturas únicas por obra (1 por lector o dispositivo y día). `private.series_seen` deduplica (se purga a los 2 días).
- `track_view(p_chapter, p_device)`: sigue sumando `chapter_views` por capítulo; `series_daily` y `series.views` solo una vez por lector/día.
- `series_ratings(series_id, user_id, score 1–5)` (RLS: cada quien lo suyo). `series_rating(p_series)` → {avg, n, mine}. Se copiaron los votos de `ratings` si existían.
- `read_chapters.read_at` (los anteriores sin fecha: solo cuentan en Histórico).
- `rankings(list, period, series_id, pos, prev_pos, score, votes, computed_at)` lectura pública. Listas: leidas, tendencia, calificadas (≥25 votos), terminadas, novedades (≤30 días). Periodos: hoy, semana, mes, anio, historico (tendencia/novedades solo hoy–mes). Top 500 por lista.
- `private.compute_rankings()` cron `obi-rankings` cada 6 h. Avisa (`notifications`, kind tablero) a los integrantes cuando una obra entra al Top 10 semanal de cualquier lista (máx. 1 por obra/lista cada 7 días).
- `ranking_list(p_list, p_period, p_genre, p_status, p_limit)`: filtra +18 según `profiles.adult_ok`; estado en_curso = active/paused, terminada = completed.

## Lectores: avisos y estadísticas (20261025)
- Avisos `kind = 'capitulo'` a quien sigue la obra (`follows`, salvo `channels.web = false` e integrantes del equipo). Trigger `chapters_notify_followers` + cron `obi-chapter-notify` (cada 10 min, capítulos programados). Agrupa: si hay un aviso sin leer de la misma obra, lo actualiza a «N capítulos nuevos» (`link` = {href, series, n, from}). `private.chapter_notified` evita duplicados; lo publicado antes de la migración no avisa.
- `reader_stats(p_user default auth.uid())` → {chapters, month, series, finished, following, genres[{g,n}]}. Solo el propio lector o si `profiles.public_activity`.
- `reader_public(p_username)` → perfil público (ruta `/lector/:usuario`).
