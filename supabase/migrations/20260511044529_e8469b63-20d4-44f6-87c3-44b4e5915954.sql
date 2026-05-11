
-- Deduplicate first, then add the constraint
DELETE FROM public.crm_contact_tags a
USING public.crm_contact_tags b
WHERE a.id < b.id
  AND a.contact_id = b.contact_id
  AND a.tag = b.tag;

ALTER TABLE public.crm_contact_tags
  ADD CONSTRAINT crm_contact_tags_contact_id_tag_key UNIQUE (contact_id, tag);
