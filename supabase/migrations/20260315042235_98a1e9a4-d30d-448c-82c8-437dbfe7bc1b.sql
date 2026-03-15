
UPDATE generated_assets 
SET content = (
  SELECT (ga_draft.content::jsonb -> 'stepData' -> 'setup' -> 'salesCopyData')::text
  FROM generated_assets ga_draft 
  WHERE ga_draft.asset_type = 'builder_draft_home-study-course' 
    AND ga_draft.book_id = generated_assets.book_id
    AND ga_draft.author_id = generated_assets.author_id
  LIMIT 1
),
updated_at = now()
WHERE asset_type = 'builder_sales_page_home-study-course'
AND id = '25e49bb2-71c9-4b47-bc0b-48f221b4e67e';

UPDATE home_study_courses 
SET description = (
  SELECT (ga_draft.content::jsonb -> 'stepData' -> 'setup' -> 'salesCopyData')::text
  FROM generated_assets ga_draft 
  WHERE ga_draft.asset_type = 'builder_draft_home-study-course' 
    AND ga_draft.book_id = home_study_courses.book_id
    AND ga_draft.author_id = home_study_courses.author_id
  LIMIT 1
)
WHERE id = 'a6b1ce8e-67ef-4762-a3df-6a239d7339fd';
