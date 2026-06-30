-- Rollback script for ebook ecommerce store migrations
-- WARNING: This will delete all ebook-related data!

-- Drop tables in reverse dependency order
DROP TABLE IF EXISTS user_ebook_library CASCADE;
DROP TABLE IF EXISTS ebook_purchases CASCADE;
DROP TABLE IF EXISTS ebooks CASCADE;
DROP TABLE IF EXISTS ebook_categories CASCADE;

-- Drop the update function
DROP FUNCTION IF EXISTS update_updated_at_column() CASCADE;

-- Success message
SELECT 'Ebook Ecommerce Store database rollback completed!' as status;