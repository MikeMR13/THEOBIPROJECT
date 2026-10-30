-- Base mínima, SOLO para PostgreSQL temporal de GitHub Actions.
CREATE SCHEMA private;
CREATE SCHEMA auth;
CREATE ROLE anon NOLOGIN;
CREATE ROLE authenticated NOLOGIN;
CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$ SELECT NULL::uuid $$;

CREATE TABLE public.chapters (
  id uuid PRIMARY KEY, title text NOT NULL,
  body jsonb NOT NULL DEFAULT '[]'::jsonb,
  version integer NOT NULL DEFAULT 1,
  lint_count integer NOT NULL DEFAULT 0
);
CREATE TABLE public.chapter_revisions (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  chapter_id uuid NOT NULL REFERENCES public.chapters(id) ON DELETE CASCADE,
  created_by uuid, title text, body jsonb NOT NULL, note text,
  created_at timestamptz NOT NULL DEFAULT now(), kind text NOT NULL DEFAULT 'manual',
  version integer, lint_count integer,
  CONSTRAINT chapter_revisions_kind_check
    CHECK (kind IN ('manual','auto','restore','publish'))
);
INSERT INTO public.chapters (id,title,body) VALUES
 ('00000000-0000-0000-0000-000000000001','Capítulo sin historial','[{"type":"paragraph","text":"Antes"}]'::jsonb),
 ('00000000-0000-0000-0000-000000000002','Capítulo con historial','[{"type":"heading","text":"T"}]'::jsonb);
INSERT INTO public.chapter_revisions (chapter_id,title,body,version,kind)
SELECT id,title,body,version,'manual'
FROM public.chapters WHERE id='00000000-0000-0000-0000-000000000002';
