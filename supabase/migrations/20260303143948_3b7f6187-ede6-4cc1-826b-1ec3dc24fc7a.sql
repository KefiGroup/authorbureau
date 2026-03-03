
-- Create a SECURITY DEFINER function for the public leaderboard
-- This bypasses RLS so anyone can see aggregated leaderboard data
CREATE OR REPLACE FUNCTION public.get_reading_leaderboard(limit_count integer DEFAULT 10)
RETURNS TABLE(book_title text, author_name text, days_logged bigint)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    b.title AS book_title,
    b.author_name,
    COUNT(DISTINCT dl.log_date) AS days_logged
  FROM reading_challenge_entries e
  JOIN books b ON b.id = e.book_id
  JOIN reading_challenge_daily_logs dl ON dl.entry_id = e.id
  WHERE e.status = 'active'
  GROUP BY e.id, b.title, b.author_name
  HAVING COUNT(DISTINCT dl.log_date) > 0
  ORDER BY days_logged DESC
  LIMIT limit_count;
$$;
