ALTER TABLE public.author_nodes
  ADD COLUMN IF NOT EXISTS updated_at timestamp with time zone NOT NULL DEFAULT now();

UPDATE public.author_nodes
SET updated_at = COALESCE(activated_at, created_at, now())
WHERE updated_at IS NULL OR updated_at = created_at;

DROP TRIGGER IF EXISTS trg_author_nodes_updated_at ON public.author_nodes;
CREATE TRIGGER trg_author_nodes_updated_at
BEFORE UPDATE ON public.author_nodes
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();