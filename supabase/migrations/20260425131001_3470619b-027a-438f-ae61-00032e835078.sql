
-- Auto-tag crm_contacts.archetype from last_node_id
CREATE OR REPLACE FUNCTION public.crm_contacts_autofill_archetype()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.last_node_id IS NOT NULL AND (NEW.archetype IS NULL OR (TG_OP='UPDATE' AND NEW.last_node_id IS DISTINCT FROM OLD.last_node_id)) THEN
    NEW.archetype := CASE
      WHEN NEW.last_node_id IN ('BP-06','BP-07','BP-08','BP-09','BA-10','BA-11','BA-12','BA-17') THEN 'A'::public.node_archetype
      WHEN NEW.last_node_id IN ('BP-01','BP-02','BP-03','BP-04','BP-05','BA-14') THEN 'B'::public.node_archetype
      WHEN NEW.last_node_id IN ('BA-13','YR-19','YR-20','YR-21','YR-22','YR-23','YR-25') THEN 'C'::public.node_archetype
      WHEN NEW.last_node_id IN ('BA-15','BA-16','BA-18','YR-24','YR-26','YR-27','YR-28') THEN 'D'::public.node_archetype
      ELSE NEW.archetype
    END;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_crm_contacts_autofill_archetype ON public.crm_contacts;
CREATE TRIGGER trg_crm_contacts_autofill_archetype
BEFORE INSERT OR UPDATE OF last_node_id ON public.crm_contacts
FOR EACH ROW EXECUTE FUNCTION public.crm_contacts_autofill_archetype();

-- Backfill existing rows
UPDATE public.crm_contacts
SET archetype = CASE
  WHEN last_node_id IN ('BP-06','BP-07','BP-08','BP-09','BA-10','BA-11','BA-12','BA-17') THEN 'A'::public.node_archetype
  WHEN last_node_id IN ('BP-01','BP-02','BP-03','BP-04','BP-05','BA-14') THEN 'B'::public.node_archetype
  WHEN last_node_id IN ('BA-13','YR-19','YR-20','YR-21','YR-22','YR-23','YR-25') THEN 'C'::public.node_archetype
  WHEN last_node_id IN ('BA-15','BA-16','BA-18','YR-24','YR-26','YR-27','YR-28') THEN 'D'::public.node_archetype
END
WHERE last_node_id IS NOT NULL AND archetype IS NULL;
