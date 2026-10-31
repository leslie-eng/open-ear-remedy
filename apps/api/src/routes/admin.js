import { Router } from 'express';
import { query } from '../db.js';
import { config } from '../config.js';
import { asyncHandler, requireAdmin } from '../middleware.js';
import { sendRawEmail } from '../email.js';
import { mapAdminEbook } from '../services/ebooks.js';
import { escapeHtml } from '../util.js';
import {
  getMonthlyRevenueInRange,
  getOverviewAnalytics,
  getRevenueBreakdown,
  getRevenueSeries,
  getUsersList,
} from '../services/analytics.js';

const router = Router();

function clampLimit(raw, fallback, max = 500) {
  const n = parseInt(raw ?? fallback, 10);
  return Number.isFinite(n) && n > 0 ? Math.min(n, max) : fallback;
}

const APPOINTMENT_STATUSES = ['pending', 'confirmed', 'cancelled', 'completed'];

router.get(
  '/check',
  requireAdmin,
  asyncHandler(async (req, res) => {
    res.json({ role: 'admin', user_id: req.user.id });
  }),
);

router.get(
  '/appointments',
  requireAdmin,
  asyncHandler(async (_req, res) => {
    const { rows } = await query(
      `SELECT * FROM appointments ORDER BY appointment_date ASC, appointment_time ASC`,
    );
    res.json({ appointments: rows });
  }),
);

router.post(
  '/appointments/status',
  requireAdmin,
  asyncHandler(async (req, res) => {
    const { appointmentId, status } = req.body;
    if (!APPOINTMENT_STATUSES.includes(status)) {
      return res.status(400).json({ error: `Status must be one of: ${APPOINTMENT_STATUSES.join(', ')}` });
    }
    const { rows } = await query(
      `UPDATE appointments SET status = $1, updated_at = NOW() WHERE id = $2 RETURNING *`,
      [status, appointmentId],
    );
    const appointment = rows[0];
    if (!appointment) {
      return res.status(404).json({ error: 'Appointment not found' });
    }

    if (config.resendApiKey && appointment.user_email) {
      const name = escapeHtml(appointment.user_name);
      const date = escapeHtml(
        appointment.appointment_date instanceof Date
          ? appointment.appointment_date.toISOString().slice(0, 10)
          : appointment.appointment_date,
      );
      const time = escapeHtml(appointment.appointment_time);
      const templates = {
        confirmed: {
          subject: 'Appointment Confirmed - Open Ear',
          html: `<h2>Confirmed</h2><p>Hi ${name}, your appointment on ${date} at ${time} is confirmed.</p>`,
        },
        cancelled: {
          subject: 'Appointment Cancelled - Open Ear',
          html: `<h2>Cancelled</h2><p>Hi ${name}, your appointment was cancelled.</p>`,
        },
        completed: {
          subject: 'Thank You - Open Ear',
          html: `<h2>Thank you</h2><p>Hi ${name}, thank you for your appointment.</p>`,
        },
      };
      const tpl = templates[status];
      if (tpl) {
        try {
          await sendRawEmail({ to: appointment.user_email, ...tpl });
        } catch (e) {
          console.error('Status email error:', e);
        }
      }
    }

    res.json({ success: true, appointment });
  }),
);

router.get(
  '/analytics/overview',
  requireAdmin,
  asyncHandler(async (req, res) => {
    const range = req.query.range || '30d';
    const overview = await getOverviewAnalytics(range);
    res.json({ overview });
  }),
);

router.get(
  '/analytics/revenue',
  requireAdmin,
  asyncHandler(async (req, res) => {
    const groupBy = req.query.groupBy || 'month';
    const range = req.query.range || '30d';
    const { series } = await getRevenueSeries(groupBy, range);
    const breakdown = await getRevenueBreakdown(range);
    const periodRevenue = await getMonthlyRevenueInRange(range);
    const overview = await getOverviewAnalytics(range);
    const completedSessions = overview.completedSessions || 0;
    const avgPerSession =
      completedSessions > 0 ? Math.round(overview.totalRevenue / completedSessions) : 0;

    res.json({
      series,
      breakdown,
      periodRevenue,
      totalRevenue: overview.totalRevenue,
      revenueGrowth: overview.revenueGrowth,
      avgPerSession,
    });
  }),
);

router.get(
  '/users',
  requireAdmin,
  asyncHandler(async (req, res) => {
    const limit = clampLimit(req.query.limit, 100);
    const users = await getUsersList(limit);
    res.json({ users });
  }),
);

router.get(
  '/call-history',
  requireAdmin,
  asyncHandler(async (req, res) => {
    const limit = clampLimit(req.query.limit, 100);
    const { rows } = await query(
      `SELECT ch.*, u.email AS user_email, u.full_name AS user_name
       FROM call_history ch
       JOIN users u ON u.id = ch.user_id
       ORDER BY ch.created_at DESC LIMIT $1`,
      [limit],
    );
    res.json({ data: rows });
  }),
);

router.get(
  '/transactions',
  requireAdmin,
  asyncHandler(async (req, res) => {
    const limit = clampLimit(req.query.limit, 200);
    const { rows } = await query(
      `SELECT * FROM credit_transactions ORDER BY created_at DESC LIMIT $1`,
      [limit],
    );
    res.json({ data: rows });
  }),
);

// ---------------------------------------------------------------------------
// Ebooks
// ---------------------------------------------------------------------------
const EBOOK_FIELDS = [
  'title', 'slug', 'author', 'description', 'short_description', 'category', 'price', 'currency',
  'cover_image_url', 'file_url', 'file_format', 'file_size', 'publication_date', 'is_active',
];

function ebookInput(body, { partial }) {
  const out = {};
  for (const f of EBOOK_FIELDS) if (body[f] !== undefined) out[f] = body[f];
  const errors = [];
  if (!partial) {
    for (const f of ['title', 'category']) if (!out[f] || !String(out[f]).trim()) errors.push(`${f} is required`);
    if (out.price === undefined) errors.push('price is required');
  }
  if (out.price !== undefined) {
    const n = Number(out.price);
    if (!Number.isFinite(n) || n < 0 || n > 100000) errors.push('price must be a non-negative number');
    else out.price = Math.round(n * 100) / 100;
  }
  if (out.file_format != null && out.file_format !== '' && !['PDF', 'EPUB'].includes(out.file_format)) {
    errors.push('file_format must be PDF or EPUB');
  }
  if (out.file_format === '') out.file_format = null;
  if (out.file_size !== undefined) out.file_size = Math.max(0, parseInt(out.file_size, 10) || 0);
  if (out.publication_date === '') out.publication_date = null;
  if (out.slug === '') out.slug = null;
  if (out.is_active !== undefined) out.is_active = Boolean(out.is_active);
  if (out.cover_image_url && !/^(https?:\/\/|\/uploads\/)/.test(out.cover_image_url)) {
    errors.push('cover_image_url must be an http(s) URL');
  }
  if (!partial) {
    out.description ??= '';
    out.short_description ??= String(out.description).slice(0, 200);
  }
  if (errors.length) {
    const err = new Error(errors.join('; '));
    err.status = 400;
    throw err;
  }
  return out;
}

const ADMIN_EBOOK_SELECT = `SELECT p.*, (SELECT COUNT(*) FROM user_library l WHERE l.product_id = p.id) AS purchase_count
  FROM products p`;

router.get(
  '/ebooks',
  requireAdmin,
  asyncHandler(async (_req, res) => {
    const { rows } = await query(`${ADMIN_EBOOK_SELECT} ORDER BY p.created_at DESC`);
    res.json({ ebooks: rows.map(mapAdminEbook) });
  }),
);

router.post(
  '/ebooks',
  requireAdmin,
  asyncHandler(async (req, res) => {
    const data = ebookInput(req.body, { partial: false });
    const cols = Object.keys(data);
    const { rows } = await query(
      `INSERT INTO products (${cols.join(', ')}) VALUES (${cols.map((_, i) => `$${i + 1}`).join(', ')}) RETURNING id`,
      cols.map((c) => data[c]),
    );
    const { rows: out } = await query(`${ADMIN_EBOOK_SELECT} WHERE p.id = $1`, [rows[0].id]);
    res.status(201).json({ ebook: mapAdminEbook(out[0]) });
  }),
);

router.put(
  '/ebooks/:id',
  requireAdmin,
  asyncHandler(async (req, res) => {
    const data = ebookInput(req.body, { partial: true });
    const cols = Object.keys(data);
    if (cols.length > 0) {
      const { rowCount } = await query(
        `UPDATE products SET ${cols.map((c, i) => `${c} = $${i + 1}`).join(', ')}, updated_at = NOW()
         WHERE id = $${cols.length + 1}`,
        [...cols.map((c) => data[c]), req.params.id],
      );
      if (!rowCount) return res.status(404).json({ error: 'Ebook not found' });
    }
    const { rows } = await query(`${ADMIN_EBOOK_SELECT} WHERE p.id = $1`, [req.params.id]);
    if (!rows[0]) return res.status(404).json({ error: 'Ebook not found' });
    res.json({ ebook: mapAdminEbook(rows[0]) });
  }),
);

router.delete(
  '/ebooks/:id',
  requireAdmin,
  asyncHandler(async (req, res) => {
    const { rows } = await query(
      `SELECT (SELECT COUNT(*) FROM ebook_order_items WHERE product_id = $1) AS n`,
      [req.params.id],
    );
    if (Number(rows[0].n) > 0) {
      // Buyers keep access, so it is hidden from the store instead of deleted.
      await query(`UPDATE products SET is_active = FALSE, updated_at = NOW() WHERE id = $1`, [req.params.id]);
      return res.json({ success: true, deactivated: true });
    }
    const { rowCount } = await query(`DELETE FROM products WHERE id = $1`, [req.params.id]);
    if (!rowCount) return res.status(404).json({ error: 'Ebook not found' });
    res.json({ success: true });
  }),
);

export default router;
