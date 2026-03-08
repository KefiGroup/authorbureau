-- Purge all generated assets (business plan, source material) for Be SUCKcessful
DELETE FROM generated_assets WHERE book_id = 'b2d2d34a-4612-4f82-a179-c29b3beb0f8f';

-- Purge consultation sessions (Abby chat history) for Be SUCKcessful
DELETE FROM consultation_sessions WHERE book_id = 'b2d2d34a-4612-4f82-a179-c29b3beb0f8f';