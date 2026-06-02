# Ebook Ecommerce Store Database Migrations

This directory contains SQL migration files for the ebook ecommerce store feature.

## Migration Files

1. **001_create_ebook_tables.sql** - Creates the core ebook catalog tables:
   - `ebook_categories` - Predefined categories for mental wellness ebooks
   - `ebooks` - Main ebook catalog with metadata, pricing, and file information
   - Includes indexes for efficient querying and full-text search
   - Sets up Row Level Security (RLS) policies

2. **002_create_purchase_library_tables.sql** - Creates purchase and library tracking tables:
   - `ebook_purchases` - Transaction records with Stripe integration
   - `user_ebook_library` - User's owned ebooks with download tracking
   - Includes foreign key relationships and RLS policies

## How to Apply Migrations

### Using Supabase CLI
```bash
# Apply all migrations
supabase db reset

# Or apply specific migration
supabase db push
```

### Manual Application
Execute the SQL files in order against your Supabase database:
1. Run `001_create_ebook_tables.sql`
2. Run `002_create_purchase_library_tables.sql`

## Database Schema Overview

### Tables Created

- **ebook_categories**: Categories for organizing ebooks
- **ebooks**: Main ebook catalog with full metadata
- **ebook_purchases**: Purchase transaction records
- **user_ebook_library**: User's owned ebook collection

### Key Features

- **Full-text search** on ebook titles, authors, and descriptions
- **Row Level Security** for data protection
- **Foreign key constraints** for data integrity
- **Indexes** for efficient querying by category, price, and status
- **Automatic timestamps** with triggers
- **Check constraints** for data validation

### Predefined Categories

The system includes 6 predefined categories focused on mental wellness:
1. Mental Wellness
2. Self-Help  
3. Anxiety Management
4. Depression Support
5. Mindfulness
6. Relationships

## Sample Data

To add sample ebooks for testing, you can use the following SQL:

```sql
-- Sample ebook data (run after migrations)
INSERT INTO ebooks (title, author, description, short_description, price, category, file_format, file_size, publication_date) VALUES
('Mindful Moments', 'Dr. Sarah Johnson', 'A comprehensive guide to mindfulness practices for daily life', 'Learn practical mindfulness techniques', 19.99, 'Mindfulness', 'PDF', 2048000, '2024-01-15'),
('Overcoming Anxiety', 'Michael Chen', 'Evidence-based strategies for managing anxiety disorders', 'Practical tools for anxiety management', 24.99, 'Anxiety Management', 'EPUB', 1536000, '2024-02-01'),
('Building Better Relationships', 'Dr. Emily Rodriguez', 'Communication skills for healthier relationships', 'Improve your relationship skills', 22.50, 'Relationships', 'PDF', 1792000, '2024-01-30');
```

## Security Notes

- All tables have Row Level Security enabled
- Users can only access their own purchases and library
- Public read access to active ebooks and categories
- Admin access controlled by email pattern (temporary - should be replaced with proper role system)
- Service role has full access for backend operations