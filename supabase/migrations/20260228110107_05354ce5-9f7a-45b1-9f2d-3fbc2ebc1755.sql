
-- Drop the overly permissive public SELECT policy
DROP POLICY IF EXISTS "Public profiles are viewable" ON public.author_profiles;

-- Create a restricted public SELECT policy that only exposes listed/featured profiles
CREATE POLICY "Public profiles are viewable"
  ON public.author_profiles
  FOR SELECT
  USING (directory_status IN ('listed', 'featured'));
