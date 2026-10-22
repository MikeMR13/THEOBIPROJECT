-- SEG-02: fixture sintético. No contiene exportación ni datos de producción.
-- PostgreSQL 17 para simular el catálogo mínimo implicado por la migración.
CREATE ROLE anon NOLOGIN;
CREATE ROLE authenticated NOLOGIN;
CREATE ROLE service_role NOLOGIN;
CREATE SCHEMA auth;
CREATE SCHEMA private;
GRANT USAGE ON SCHEMA public, auth TO anon, authenticated;
GRANT USAGE ON SCHEMA private TO authenticated;
CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE SET search_path='' AS $$
  SELECT nullif(current_setting('request.jwt.claim.sub',true),'')::uuid
$$;
CREATE FUNCTION auth.jwt() RETURNS jsonb LANGUAGE sql STABLE SET search_path='' AS $$
  SELECT coalesce(nullif(current_setting('request.jwt.claims',true),'')::jsonb,'{}'::jsonb)
$$;
GRANT EXECUTE ON FUNCTION auth.uid(),auth.jwt() TO anon,authenticated;
CREATE FUNCTION private.is_admin() RETURNS boolean LANGUAGE sql STABLE SET search_path='' AS $$
  SELECT coalesce(nullif(current_setting('request.jwt.claim.is_admin',true),'')::boolean,false)
$$;

CREATE TABLE public.profiles (
  id uuid PRIMARY KEY, username text UNIQUE NOT NULL, avatar_url text,
  role text DEFAULT 'reader', donor_tier text, donor_until timestamptz,
  patreon_user_id text, discord_id text, telegram_id text,
  adult_ok boolean DEFAULT false, bio text, banner_url text,
  discoverable boolean DEFAULT true, public_library boolean DEFAULT false,
  public_activity boolean DEFAULT false, platform_role text DEFAULT 'lector',
  seal_kanji text, accent text DEFAULT '#f2c230', links jsonb DEFAULT '[]',
  favorites uuid[] DEFAULT '{}', profile_sections jsonb DEFAULT '{}',
  profile_visibility text DEFAULT 'auth', show_since boolean DEFAULT true,
  hide_reading boolean DEFAULT false, hidden_series uuid[] DEFAULT '{}',
  notify jsonb DEFAULT '{}', ui_prefs jsonb DEFAULT '{}',
  delete_requested_at timestamptz, created_at timestamptz DEFAULT now(),
  username_changed_at timestamptz, needs_username boolean DEFAULT false,
  patron_wall boolean DEFAULT false
);
CREATE TABLE public.teams (id uuid PRIMARY KEY, settings jsonb DEFAULT '{}');
CREATE TABLE public.team_roles (id uuid PRIMARY KEY, team_id uuid, name text, color text);
CREATE TABLE public.team_members (team_id uuid, user_id uuid, role text, role_id uuid);
CREATE TABLE public.series (
  id uuid PRIMARY KEY, team_id uuid, slug text, title text,
  cover_path text, cover_thumb_path text, theme jsonb DEFAULT '{}',
  published boolean DEFAULT true, archived_at timestamptz,
  adult boolean DEFAULT false, translation_status text DEFAULT 'ongoing',
  genres jsonb DEFAULT '[]'
);
CREATE TABLE public.chapters (
  id uuid PRIMARY KEY, series_id uuid, assigned_to uuid,
  status text DEFAULT 'published', deleted_at timestamptz
);
CREATE TABLE public.comments (id bigint PRIMARY KEY, chapter_id uuid, user_id uuid, body text);
CREATE TABLE public.reports (id bigint PRIMARY KEY, chapter_id uuid, user_id uuid);
CREATE TABLE public.team_log (id bigint PRIMARY KEY, team_id uuid, actor uuid);
CREATE TABLE public.team_design_versions (id bigint PRIMARY KEY, team_id uuid, created_by uuid);
CREATE TABLE public.chapter_revisions (id bigint PRIMARY KEY, chapter_id uuid, created_by uuid);
CREATE TABLE public.user_blocks (user_id uuid, blocked_id uuid, kind text);
CREATE TABLE public.read_chapters (chapter_id uuid, user_id uuid, read_at timestamptz DEFAULT now());
CREATE TABLE public.reading_progress (series_id uuid, user_id uuid, updated_at timestamptz DEFAULT now());
CREATE TABLE public.follows (series_id uuid, user_id uuid);
CREATE TABLE public.series_reviews (series_id uuid, user_id uuid, body text, updated_at timestamptz DEFAULT now(), anonymous boolean DEFAULT false);
CREATE TABLE public.series_ratings (series_id uuid, user_id uuid, score numeric);

-- Permisos previos verificados en producción: lectura general permisiva,
-- UPDATE por columnas y política de propietario.
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "profiles read" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "profiles admin" ON public.profiles FOR SELECT USING (private.is_admin());
CREATE POLICY "profiles self update" ON public.profiles FOR UPDATE TO authenticated
  USING (id=auth.uid()) WITH CHECK (id=auth.uid());
GRANT SELECT, INSERT, DELETE, MAINTAIN ON TABLE public.profiles TO anon,authenticated;
GRANT UPDATE (username,avatar_url,discord_id,telegram_id,adult_ok,
  bio,banner_url,discoverable,public_library,public_activity,
  seal_kanji,accent,links,favorites,profile_sections,profile_visibility,
  show_since,hide_reading,hidden_series,notify,ui_prefs)
ON TABLE public.profiles TO authenticated;
GRANT ALL ON TABLE public.profiles TO service_role;

-- Contratos RPC preexistentes; no es una copia de sus cuerpos de producción.
CREATE FUNCTION public.my_profile() RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER
  SET search_path='' AS $$ SELECT to_jsonb(p) FROM public.profiles p WHERE p.id=auth.uid() $$;
REVOKE ALL ON FUNCTION public.my_profile() FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.my_profile() TO authenticated;
CREATE FUNCTION public.reader_public(p_username text) RETURNS jsonb LANGUAGE plpgsql
 STABLE SECURITY DEFINER SET search_path='' AS $$
 BEGIN RETURN private.reader_public_core(p_username); END $$;
CREATE FUNCTION public.export_my_data() RETURNS jsonb LANGUAGE sql AS $$ SELECT '{}'::jsonb $$;
CREATE FUNCTION public.deletion_preview() RETURNS jsonb LANGUAGE sql AS $$ SELECT '{}'::jsonb $$;
CREATE FUNCTION public.request_account_deletion() RETURNS timestamptz LANGUAGE sql AS $$ SELECT now() $$;
CREATE FUNCTION public.cancel_account_deletion() RETURNS void LANGUAGE plpgsql AS $$ BEGIN NULL; END $$;
CREATE FUNCTION public.favorite_candidates(p_q text) RETURNS jsonb LANGUAGE sql AS $$ SELECT '[]'::jsonb $$;
CREATE FUNCTION public.patreon_unlink() RETURNS void LANGUAGE plpgsql AS $$ BEGIN NULL; END $$;
CREATE FUNCTION public.patreon_begin(p_kind text,p_owner text) RETURNS text LANGUAGE sql AS $$ SELECT 'ok'::text $$;
CREATE FUNCTION public.patreon_disconnect(p_owner text) RETURNS void LANGUAGE plpgsql AS $$ BEGIN NULL; END $$;
CREATE FUNCTION public.admin_review_queue() RETURNS jsonb LANGUAGE sql AS $$ SELECT '[]'::jsonb $$;
CREATE FUNCTION public.admin_review_resolve(p_series uuid,p_author uuid,p_action text) RETURNS void LANGUAGE plpgsql AS $$ BEGIN NULL; END $$;

-- Identidades sintéticas A, B, C y organización, serie, capítulo.
INSERT INTO public.profiles(id,username,avatar_url,notify,ui_prefs,hidden_series,profile_visibility,public_activity)
VALUES
('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','qa_alfa','a.png','{"freq":"off"}','{"contrast":true}','{}','all',true),
('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb','qa_beta','b.png','{"freq":"diario"}','{"contrast":false}','{}','auth',true),
('cccccccc-cccc-4ccc-8ccc-cccccccccccc','qa_gamma','c.png','{}','{}','{}','none',true);
INSERT INTO public.teams(id,settings)
VALUES ('dddddddd-dddd-4ddd-8ddd-dddddddddddd','{"show_members":true}');
INSERT INTO public.team_members(team_id,user_id,role)
VALUES ('dddddddd-dddd-4ddd-8ddd-dddddddddddd','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','owner'),
       ('dddddddd-dddd-4ddd-8ddd-dddddddddddd','bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb','editor');
INSERT INTO public.series(id,team_id,slug,title,published)
VALUES ('eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee','dddddddd-dddd-4ddd-8ddd-dddddddddddd','obra-qa','Obra sintética',true);
INSERT INTO public.chapters(id,series_id,status)
VALUES ('ffffffff-ffff-4fff-8fff-ffffffffffff','eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee','published');
INSERT INTO public.comments(id,chapter_id,user_id,body)
VALUES (1,'ffffffff-ffff-4fff-8fff-ffffffffffff','cccccccc-cccc-4ccc-8ccc-cccccccccccc','Comentario ficticio');
INSERT INTO public.reports(id,chapter_id,user_id)
VALUES (1,'ffffffff-ffff-4fff-8fff-ffffffffffff','cccccccc-cccc-4ccc-8ccc-cccccccccccc');
