import { Router } from 'express';
import { query } from '../db.js';
import { config } from '../config.js';
import { asyncHandler, requireAdmin } from '../middleware.js';
import { sendRawEmail } from '../email.js';
import {
  getMonthlyRevenueInRange,
  getOverviewAnalytics,
  getRevenueBreakdown,
  getRevenueSeries,
  getUsersList,
} from '../services/analytics.js';

const router = Router();

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
    const { rows } = await query(
      `UPDATE appointments SET status = $1, updated_at = NOW() WHERE id = $2 RETURNING *`,
      [status, appointmentId],
    );
    const appointment = rows[0];
    if (!appointment) {
      return res.status(404).json({ error: 'Appointment not found' });
    }

    if (config.resendApiKey && appointment.user_email) {
      const templates = {
        confirmed: {
          subject: 'Appointment Confirmed - Open Ear',
          html: `<h2>Confirmed</h2><p>Hi ${appointment.user_name}, your appointment on ${appointment.appointment_date} at ${appointment.appointment_time} is confirmed.</p>`,
        },
        cancelled: {
          subject: 'Appointment Cancelled - Open Ear',
          html: `<h2>Cancelled</h2><p>Hi ${appointment.user_name}, your appointment was cancelled.</p>`,
        },
        completed: {
          subject: 'Thank You - Open Ear',
          html: `<h2>Thank you</h2><p>Hi ${appointment.user_name}, thank you for your appointment.</p>`,
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
    const limit = Math.min(parseInt(req.query.limit || '100', 10), 500);
    const users = await getUsersList(limit);
    res.json({ users });
  }),
);

router.get(
  '/call-history',
  requireAdmin,
  asyncHandler(async (req, res) => {
    const limit = Math.min(parseInt(req.query.limit || '100', 10), 500);
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
    const limit = Math.min(parseInt(req.query.limit || '200', 10), 500);
    const { rows } = await query(
      `SELECT * FROM credit_transactions ORDER BY created_at DESC LIMIT $1`,
      [limit],
    );
    res.json({ data: rows });
  }),
);

export default router;
