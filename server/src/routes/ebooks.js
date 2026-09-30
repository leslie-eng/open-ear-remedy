import { Router } from 'express';
import fs from 'node:fs';
import path from 'node:path';
import { query } from '../db.js';
import { config } from '../config.js';
import { asyncHandler, requireAuth } from '../middleware.js';
import { withTransaction } from '../services/credits.js';
import { mapEbook, mapOrders, resolveEbookFile } from '../services/ebooks.js';
import { initializeTransaction, newReference, toMinor } from '../services/paystack.js';
import { rateLimit } from '../util.js';

const router = Router();

router.get(
  '/',
  asyncHandler(async (req, res) => {
    const params = [];
    const where = ['is_active = TRUE'];
    if (req.query.category && req.query.category !== 'all') {
      params.push(String(req.query.category));
      where.push(`category = $${params.length}`);
    }
    if (req.query.search) {
      params.push(`%${String(req.query.search).slice(0, 100)}%`);
      where.push(`(title ILIKE $${params.length} OR author ILIKE $${params.length} OR short_description ILIKE $${params.length})`);
    }
    const { rows } = await query(
      `SELECT * FROM products WHERE ${where.join(' AND ')} ORDER BY created_at DESC LIMIT 500`,
      params,
    );
    res.json({ ebooks: rows.map(mapEbook) });
  }),
);

router.post(
  '/checkout',
  requireAuth,
  rateLimit({ windowMs: 15 * 60 * 1000, max: 20, key: (req) => req.user.id }),
  asyncHandler(async (req, res) => {
    const ids = Array.isArray(req.body.ebookIds)
      ? [...new Set(req.body.ebookIds.filter((id) => typeof id === 'string'))]
      : [];
    if (ids.length === 0 || ids.length > 50) {
      return res.status(400).json({ error: 'Select between 1 and 50 ebooks.' });
    }

    const { rows: products } = await query(
      `SELECT * FROM products WHERE id = ANY($1) AND is_active = TRUE`,
      [ids],
    );
    if (products.length !== ids.length) {
      return res.status(400).json({ error: 'One or more ebooks are no longer available.' });
    }
    const { rows: owned } = await query(
      `SELECT product_id FROM user_library WHERE user_id = $1 AND product_id = ANY($2)`,
      [req.user.id, ids],
    );
    if (owned.length > 0) {
      return res.status(400).json({ error: 'You already own some of these ebooks. Remove them from your cart.' });
    }

    const total = products.reduce((sum, p) => sum + toMinor(p.price), 0);
    const reference = newReference('eb', req.user.id);
    const free = total === 0;

    await withTransaction(async (client) => {
      const { rows } = await client.query(
        `INSERT INTO ebook_orders (user_id, reference, status, total_amount, currency, completed_at)
         VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
        [req.user.id, reference, free ? 'completed' : 'pending', total, config.paystackCurrency, free ? new Date() : null],
      );
      const orderId = rows[0].id;
      for (const p of products) {
        await client.query(
          `INSERT INTO ebook_order_items (order_id, product_id, title, price_amount) VALUES ($1, $2, $3, $4)`,
          [orderId, p.id, p.title, toMinor(p.price)],
        );
      }
      if (free) {
        await client.query(
          `INSERT INTO user_library (user_id, product_id, order_id)
           SELECT $1, product_id, order_id FROM ebook_order_items WHERE order_id = $2
           ON CONFLICT (user_id, product_id) DO NOTHING`,
          [req.user.id, orderId],
        );
      }
    });

    if (free) return res.json({ url: null, reference, free: true });

    try {
      const result = await initializeTransaction({
        email: req.user.email,
        amountMinor: total,
        reference,
        callbackUrl: `${config.clientUrl}/checkout/success?reference=${encodeURIComponent(reference)}`,
        metadata: { kind: 'ebook_order', user_id: req.user.id, order_reference: reference },
      });
      res.json(result);
    } catch (err) {
      await query(`UPDATE ebook_orders SET status = 'failed' WHERE reference = $1`, [reference]);
      throw err;
    }
  }),
);

router.get(
  '/orders/:reference',
  requireAuth,
  asyncHandler(async (req, res) => {
    const { rows } = await query(
      `SELECT * FROM ebook_orders WHERE reference = $1 AND user_id = $2`,
      [req.params.reference, req.user.id],
    );
    if (!rows[0]) return res.status(404).json({ error: 'Order not found' });
    const [order] = await mapOrders(rows);
    res.json({ order });
  }),
);

router.get(
  '/:id/download',
  requireAuth,
  rateLimit({ windowMs: 60 * 60 * 1000, max: 60, key: (req) => req.user.id }),
  asyncHandler(async (req, res) => {
    const { rows } = await query(
      `SELECT p.title, p.file_url, p.file_format
       FROM user_library l JOIN products p ON p.id = l.product_id
       WHERE l.user_id = $1 AND l.product_id = $2`,
      [req.user.id, req.params.id],
    );
    if (!rows[0]) return res.status(403).json({ error: 'You do not own this ebook' });

    const filePath = resolveEbookFile(rows[0].file_url);
    if (!filePath || !fs.existsSync(filePath)) {
      console.error('Ebook file missing', { id: req.params.id, file_url: rows[0].file_url });
      return res.status(404).json({ error: 'File is not available yet. Please contact support.' });
    }
    const ext = path.extname(filePath) || `.${String(rows[0].file_format || 'pdf').toLowerCase()}`;
    const safeTitle = rows[0].title.replace(/[^\w\s.-]/g, '').trim().slice(0, 80) || 'ebook';
    res.download(filePath, `${safeTitle}${ext}`, { dotfiles: 'deny' });
  }),
);

router.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const { rows } = await query(
      `SELECT * FROM products WHERE (id = $1 OR slug = $1) AND is_active = TRUE`,
      [req.params.id],
    );
    if (!rows[0]) return res.status(404).json({ error: 'Ebook not found' });
    res.json({ ebook: mapEbook(rows[0]) });
  }),
);

export default router;
