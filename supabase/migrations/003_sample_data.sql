-- Migration: Add sample ebook data for testing
-- This is optional sample data for development and testing

-- Sample ebooks for each category
INSERT INTO ebooks (
  title, 
  author, 
  description, 
  short_description, 
  price, 
  category, 
  file_format, 
  file_size, 
  publication_date,
  isbn,
  cover_image_url,
  sample_pages_url
) VALUES
-- Mental Wellness
(
  'The Balanced Mind: A Complete Guide to Mental Wellness',
  'Dr. Sarah Johnson',
  'A comprehensive exploration of mental wellness practices, combining scientific research with practical techniques for maintaining psychological health. This book covers stress management, emotional regulation, and building resilience in daily life.',
  'Learn evidence-based techniques for maintaining optimal mental health and emotional balance.',
  24.99,
  'Mental Wellness',
  'PDF',
  3145728,
  '2024-01-15',
  '978-1234567890',
  'https://example.com/covers/balanced-mind.jpg',
  'https://example.com/samples/balanced-mind-sample.pdf'
),

-- Self-Help
(
  'Transform Your Life: 30 Days to Personal Growth',
  'Michael Chen',
  'A practical 30-day program for personal transformation, featuring daily exercises, reflection prompts, and actionable strategies for creating positive change in your life. Based on cognitive behavioral therapy principles.',
  'A structured 30-day program for personal development and positive life changes.',
  19.99,
  'Self-Help',
  'EPUB',
  2097152,
  '2024-02-01',
  '978-1234567891',
  'https://example.com/covers/transform-life.jpg',
  'https://example.com/samples/transform-life-sample.pdf'
),

-- Anxiety Management
(
  'Calm in the Storm: Mastering Anxiety with Mindful Techniques',
  'Dr. Emily Rodriguez',
  'Learn to manage anxiety through proven mindfulness and cognitive techniques. This book provides practical tools for understanding anxiety triggers, developing coping strategies, and building long-term resilience.',
  'Practical mindfulness techniques for managing anxiety and building emotional resilience.',
  22.50,
  'Anxiety Management',
  'PDF',
  2621440,
  '2024-01-30',
  '978-1234567892',
  'https://example.com/covers/calm-storm.jpg',
  'https://example.com/samples/calm-storm-sample.pdf'
),

-- Depression Support
(
  'Rising Above: A Journey Through Depression Recovery',
  'Dr. James Wilson',
  'A compassionate guide for those experiencing depression, offering hope, practical strategies, and evidence-based approaches to recovery. Includes personal stories and professional insights.',
  'A supportive guide for understanding and overcoming depression with practical strategies.',
  26.99,
  'Depression Support',
  'EPUB',
  2359296,
  '2024-02-15',
  '978-1234567893',
  'https://example.com/covers/rising-above.jpg',
  'https://example.com/samples/rising-above-sample.pdf'
),

-- Mindfulness
(
  'Present Moment Awareness: Daily Mindfulness Practices',
  'Lisa Thompson',
  'Discover the power of present-moment awareness through simple, accessible mindfulness practices. Perfect for beginners and experienced practitioners alike, with guided meditations and daily exercises.',
  'Simple daily mindfulness practices for cultivating present-moment awareness.',
  18.99,
  'Mindfulness',
  'PDF',
  1572864,
  '2024-01-20',
  '978-1234567894',
  'https://example.com/covers/present-moment.jpg',
  'https://example.com/samples/present-moment-sample.pdf'
),

-- Relationships
(
  'Connected Hearts: Building Meaningful Relationships',
  'Dr. Maria Garcia',
  'Learn the essential skills for building and maintaining healthy, meaningful relationships. Covers communication, conflict resolution, emotional intimacy, and creating lasting connections.',
  'Essential skills for building healthy, meaningful relationships and improving communication.',
  21.99,
  'Relationships',
  'EPUB',
  1835008,
  '2024-02-10',
  '978-1234567895',
  'https://example.com/covers/connected-hearts.jpg',
  'https://example.com/samples/connected-hearts-sample.pdf'
),

-- Additional samples for testing variety
(
  'Mindful Parenting: Raising Children with Awareness',
  'Dr. Robert Kim',
  'A guide for parents who want to bring mindfulness into their parenting approach, creating more peaceful family dynamics and helping children develop emotional intelligence.',
  'Mindful parenting techniques for creating peaceful family relationships.',
  23.99,
  'Mindfulness',
  'PDF',
  2883584,
  '2024-01-25',
  '978-1234567896',
  'https://example.com/covers/mindful-parenting.jpg',
  'https://example.com/samples/mindful-parenting-sample.pdf'
),

(
  'The Confidence Code: Overcoming Self-Doubt',
  'Amanda Foster',
  'Practical strategies for building genuine self-confidence and overcoming imposter syndrome. Includes exercises for challenging negative self-talk and developing a growth mindset.',
  'Build genuine self-confidence and overcome self-doubt with practical strategies.',
  20.99,
  'Self-Help',
  'EPUB',
  1966080,
  '2024-02-05',
  '978-1234567897',
  'https://example.com/covers/confidence-code.jpg',
  'https://example.com/samples/confidence-code-sample.pdf'
);

-- Update file_url with placeholder URLs (in production, these would be secure storage URLs)
UPDATE ebooks SET file_url = 'https://secure-storage.example.com/ebooks/' || id || '.' || LOWER(file_format)
WHERE file_url IS NULL;