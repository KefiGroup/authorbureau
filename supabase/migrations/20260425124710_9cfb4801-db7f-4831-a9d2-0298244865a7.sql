ALTER TABLE public.crm_contacts
  ADD COLUMN IF NOT EXISTS last_node_id text,
  ADD COLUMN IF NOT EXISTS archetype public.node_archetype;

CREATE INDEX IF NOT EXISTS idx_crm_contacts_archetype ON public.crm_contacts(author_id, archetype);
CREATE INDEX IF NOT EXISTS idx_crm_contacts_last_node ON public.crm_contacts(author_id, last_node_id);

-- Backfill archetype from last_node_id when present
UPDATE public.crm_contacts
SET archetype = CASE
  WHEN last_node_id IN ('BP-06','BP-07','BP-08','BP-09','BA-10','BA-11','BA-12','BA-17') THEN 'A'::public.node_archetype
  WHEN last_node_id IN ('BP-01','BP-02','BP-03','BP-04','BP-05','BA-14') THEN 'B'::public.node_archetype
  WHEN last_node_id IN ('BA-13','YR-19','YR-20','YR-21','YR-22','YR-23','YR-25') THEN 'C'::public.node_archetype
  WHEN last_node_id IN ('BA-15','BA-16','BA-18','YR-24','YR-26','YR-27','YR-28') THEN 'D'::public.node_archetype
  ELSE archetype
END
WHERE last_node_id IS NOT NULL AND archetype IS NULL;