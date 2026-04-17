INSERT INTO author_context (author_id, book_title, core_thesis, target_audience_persona)
SELECT ap.id, b.title, COALESCE(b.description, b.title), '{"description":"general readers"}'::jsonb
FROM author_profiles ap
JOIN books b ON b.author_id = ap.user_id
WHERE NOT EXISTS (SELECT 1 FROM author_context ac WHERE ac.author_id = ap.id);