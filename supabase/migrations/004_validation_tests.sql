-- Migration: Database validation tests
-- This file contains SQL tests to validate the database schema constraints

-- Test 1: Verify all required tables exist
DO $$
BEGIN
    -- Check if all tables exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'ebook_categories') THEN
        RAISE EXCEPTION 'Table ebook_categories does not exist';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'ebooks') THEN
        RAISE EXCEPTION 'Table ebooks does not exist';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'ebook_purchases') THEN
        RAISE EXCEPTION 'Table ebook_purchases does not exist';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_ebook_library') THEN
        RAISE EXCEPTION 'Table user_ebook_library does not exist';
    END IF;
    
    RAISE NOTICE 'All required tables exist';
END $$;

-- Test 2: Verify predefined categories exist
DO $$
DECLARE
    category_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO category_count FROM ebook_categories;
    
    IF category_count < 6 THEN
        RAISE EXCEPTION 'Expected at least 6 predefined categories, found %', category_count;
    END IF;
    
    -- Check specific required categories
    IF NOT EXISTS (SELECT 1 FROM ebook_categories WHERE name = 'Mental Wellness') THEN
        RAISE EXCEPTION 'Mental Wellness category missing';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM ebook_categories WHERE name = 'Self-Help') THEN
        RAISE EXCEPTION 'Self-Help category missing';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM ebook_categories WHERE name = 'Anxiety Management') THEN
        RAISE EXCEPTION 'Anxiety Management category missing';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM ebook_categories WHERE name = 'Depression Support') THEN
        RAISE EXCEPTION 'Depression Support category missing';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM ebook_categories WHERE name = 'Mindfulness') THEN
        RAISE EXCEPTION 'Mindfulness category missing';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM ebook_categories WHERE name = 'Relationships') THEN
        RAISE EXCEPTION 'Relationships category missing';
    END IF;
    
    RAISE NOTICE 'All required categories exist';
END $$;

-- Test 3: Verify indexes exist
DO $$
BEGIN
    -- Check ebooks indexes
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE tablename = 'ebooks' AND indexname = 'idx_ebooks_category') THEN
        RAISE EXCEPTION 'Index idx_ebooks_category missing';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE tablename = 'ebooks' AND indexname = 'idx_ebooks_price') THEN
        RAISE EXCEPTION 'Index idx_ebooks_price missing';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE tablename = 'ebooks' AND indexname = 'idx_ebooks_active') THEN
        RAISE EXCEPTION 'Index idx_ebooks_active missing';
    END IF;
    
    -- Check purchases indexes
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE tablename = 'ebook_purchases' AND indexname = 'idx_purchases_user') THEN
        RAISE EXCEPTION 'Index idx_purchases_user missing';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE tablename = 'ebook_purchases' AND indexname = 'idx_purchases_status') THEN
        RAISE EXCEPTION 'Index idx_purchases_status missing';
    END IF;
    
    -- Check library indexes
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE tablename = 'user_ebook_library' AND indexname = 'idx_library_user') THEN
        RAISE EXCEPTION 'Index idx_library_user missing';
    END IF;
    
    RAISE NOTICE 'All required indexes exist';
END $$;

-- Test 4: Test constraint validations
DO $$
BEGIN
    -- Test file format constraint
    BEGIN
        INSERT INTO ebooks (title, author, price, category, file_url, file_format) 
        VALUES ('Test Book', 'Test Author', 10.00, 'Mental Wellness', 'http://test.com', 'INVALID');
        RAISE EXCEPTION 'File format constraint failed - should not allow INVALID format';
    EXCEPTION
        WHEN check_violation THEN
            RAISE NOTICE 'File format constraint working correctly';
    END;
    
    -- Test price constraint
    BEGIN
        INSERT INTO ebooks (title, author, price, category, file_url, file_format) 
        VALUES ('Test Book', 'Test Author', -5.00, 'Mental Wellness', 'http://test.com', 'PDF');
        RAISE EXCEPTION 'Price constraint failed - should not allow negative prices';
    EXCEPTION
        WHEN check_violation THEN
            RAISE NOTICE 'Price constraint working correctly';
    END;
    
    -- Test category foreign key constraint
    BEGIN
        INSERT INTO ebooks (title, author, price, category, file_url, file_format) 
        VALUES ('Test Book', 'Test Author', 10.00, 'Invalid Category', 'http://test.com', 'PDF');
        RAISE EXCEPTION 'Category constraint failed - should not allow invalid categories';
    EXCEPTION
        WHEN foreign_key_violation THEN
            RAISE NOTICE 'Category foreign key constraint working correctly';
    END;
    
END $$;

-- Test 5: Verify RLS is enabled
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_tables 
        WHERE tablename = 'ebooks' 
        AND rowsecurity = true
    ) THEN
        RAISE EXCEPTION 'RLS not enabled on ebooks table';
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM pg_tables 
        WHERE tablename = 'ebook_categories' 
        AND rowsecurity = true
    ) THEN
        RAISE EXCEPTION 'RLS not enabled on ebook_categories table';
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM pg_tables 
        WHERE tablename = 'ebook_purchases' 
        AND rowsecurity = true
    ) THEN
        RAISE EXCEPTION 'RLS not enabled on ebook_purchases table';
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM pg_tables 
        WHERE tablename = 'user_ebook_library' 
        AND rowsecurity = true
    ) THEN
        RAISE EXCEPTION 'RLS not enabled on user_ebook_library table';
    END IF;
    
    RAISE NOTICE 'RLS enabled on all tables';
END $$;

-- Success message
DO $$
BEGIN
    RAISE NOTICE '✅ All database validation tests passed successfully!';
    RAISE NOTICE 'Database schema is correctly implemented according to design specifications.';
END $$;