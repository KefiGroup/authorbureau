
-- Purge all books for the active user
DELETE FROM books WHERE author_id = '50a60e39-3090-487e-aea4-75b86a1cf76a';

-- Purge the author profile for the active user
DELETE FROM author_profiles WHERE user_id = '50a60e39-3090-487e-aea4-75b86a1cf76a';
