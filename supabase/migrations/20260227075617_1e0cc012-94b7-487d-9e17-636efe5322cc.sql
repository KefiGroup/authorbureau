
-- Step 1: Reassign all books from old orphan user_id to the real user
UPDATE books 
SET author_id = '50a60e39-3090-487e-aea4-75b86a1cf76a' 
WHERE author_id = '5fd84779-8ac5-49f6-9524-0d7f1dcd4f33';

-- Step 2: Delete the orphaned author_profiles record
DELETE FROM author_profiles 
WHERE user_id = '5fd84779-8ac5-49f6-9524-0d7f1dcd4f33';
