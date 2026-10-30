-- Base de QA efímera PostgreSQL 17; identidades ficticias, sin red ni Supabase real.
CREATE SCHEMA auth;
CREATE SCHEMA private;
CREATE ROLE anon NOLOGIN;
CREATE ROLE authenticated NOLOGIN;
GRANT USAGE ON SCHEMA public,auth,private TO authenticated;
CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$
 SELECT nullif(current_setting('request.jwt.claim.sub',true),'')::uuid
$$;
CREATE TABLE public.series(id uuid PRIMARY KEY,team_id uuid NOT NULL);
CREATE TABLE public.chapters(id uuid PRIMARY KEY,series_id uuid NOT NULL REFERENCES public.series(id),
 title text NOT NULL, body jsonb NOT NULL,version int NOT NULL DEFAULT 1,deleted_at timestamptz);
CREATE FUNCTION private.chapter_team(p_id uuid) RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
 SELECT s.team_id FROM public.chapters c JOIN public.series s ON c.series_id=s.id WHERE c.id=p_id
$$;
CREATE FUNCTION private.in_team(p_team uuid) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
 SELECT p_team='00000000-0000-4000-8000-000000000010'::uuid AND auth.uid() IN
 ( '00000000-0000-4000-8000-000000000011'::uuid,
   '00000000-0000-4000-8000-000000000012'::uuid,
   '00000000-0000-4000-8000-000000000013'::uuid )
$$;
CREATE FUNCTION private.team_can(p_team uuid,p_action text) RETURNS boolean
 LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
 SELECT private.in_team(p_team) AND p_action='review' AND auth.uid() IN
 ('00000000-0000-4000-8000-000000000011'::uuid,
  '00000000-0000-4000-8000-000000000012'::uuid)
$$;
INSERT INTO public.series VALUES('00000000-0000-4000-8000-000000000020','00000000-0000-4000-8000-000000000010');
INSERT INTO public.chapters VALUES('00000000-0000-4000-8000-000000000030','00000000-0000-4000-8000-000000000020',
'Capítulo intacto','[{"type":"paragraph","text":"texto original"}]'::jsonb,3,NULL);
