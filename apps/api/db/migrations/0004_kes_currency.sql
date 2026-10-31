-- 0004: Open Ear sells in Kenyan shillings (see @openear/shared/pricing CURRENCY).
ALTER TABLE products ALTER COLUMN currency SET DEFAULT 'KES';
ALTER TABLE ebook_orders ALTER COLUMN currency SET DEFAULT 'KES';
UPDATE products SET currency = 'KES' WHERE currency <> 'KES';
