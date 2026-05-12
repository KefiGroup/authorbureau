-- Sprint: BP-03 spec reconciliation. Collapse duplicate social_connections
-- per (user_id, platform) keeping the newest active row, then enforce uniqueness.

WITH ranked AS (
  SELECT
    id,
    user_id,
    platform,
    status,
    created_at,
    ROW_NUMBER() OVER (
      PARTITION BY user_id, platform
      ORDER BY
        CASE WHEN status IN ('connected', 'active') THEN 0 ELSE 1 END,
        created_at DESC
    ) AS rn
  FROM public.social_connections
)
DELETE FROM public.social_connections sc
USING ranked r
WHERE sc.id = r.id AND r.rn > 1;

CREATE UNIQUE INDEX IF NOT EXISTS social_connections_user_platform_uniq
  ON public.social_connections (user_id, platform);
