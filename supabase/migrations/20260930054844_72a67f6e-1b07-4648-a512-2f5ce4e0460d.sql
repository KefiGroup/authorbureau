GRANT SELECT, INSERT, UPDATE, DELETE ON public.crm_contacts TO authenticated;
GRANT ALL ON public.crm_contacts TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.email_lists TO authenticated;
GRANT ALL ON public.email_lists TO service_role;
DROP POLICY IF EXISTS "Authors can manage their own contacts" ON public.crm_contacts;
CREATE POLICY "Authors can manage their own contacts" ON public.crm_contacts FOR ALL TO authenticated
USING (author_id = auth.uid() OR author_id IN (SELECT id FROM public.author_profiles WHERE user_id = auth.uid()))
WITH CHECK (author_id = auth.uid() OR author_id IN (SELECT id FROM public.author_profiles WHERE user_id = auth.uid()));