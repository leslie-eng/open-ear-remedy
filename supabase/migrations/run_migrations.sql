-- Run all ebook ecommerce store migrations in correct order
-- Execute this file to set up the complete database schema

-- Migration 1: Create core ebook catalog tables
\i 001_create_ebook_tables.sql

-- Migration 2: Create purchase and library tables
\i 002_create_purchase_library_tables.sql

-- Migration 3: Add sample data (optional - comment out for production)
\i 003_sample_data.sql

-- Migration 4: Run validation tests
\i 004_validation_tests.sql

-- Final success message
SELECT 'Ebook Ecommerce Store database setup completed successfully!' as status;