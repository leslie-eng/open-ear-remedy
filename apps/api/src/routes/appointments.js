import { Router } from 'express';
import { query } from '../db.js';
import { config } from '../config.js';
import { asyncHandler, requireAuth } from '../middleware.js';
import { sendRawEmail } from '../email.js';
import { escapeHtml, rateLimit } from '../util.js';

const router = Router();

router.post(
  '/',
  requireAuth,
  rateLimit({ windowMs: 60 * 60 * 1000, max: 10, key: (req) => req.user.id }),
  asyncHandler(async (req, res) => {
    const { appointmentDate, appointmentTime, notes, phoneNumber } = req.body;
    if (typeof appointmentDate !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(appointmentDate) || Number.isNaN(Date.parse(appointmentDate))) {
      return res.status(400).json({ error: 'A valid appointment date (YYYY-MM-DD) is required' });
    }
    if (new Date(`${appointmentDate}T23:59:59Z`) < new Date()) {
      return res.status(400).json({ error: 'Appointment date must be in the future' });
    }
    if (typeof appointmentTime !== 'string' || !appointmentTime.trim() || appointmentTime.length > 20) {
      return res.status(400).json({ error: 'A valid appointment time is required' });
    }
    if (notes != null && (typeof notes !== 'string' || notes.length > 2000)) {
      return res.status(400).json({ error: 'Notes must be under 2000 characters' });
    }
    if (phoneNumber && !/^\+?[0-9\s\-().]{7,20}$/.test(String(phoneNumber))) {
      return res.status(400).json({ error: 'Invalid phone number' });
    }

    const userName = req.user.full_name || req.user.email?.split('@')[0] || 'User';
    const userEmail = req.user.email;

    const { rows } = await query(
      `INSERT INTO appointments (user_id, user_name, user_email, user_phone, appointment_date, appointment_time, notes, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, 'pending') RETURNING *`,
      [
        req.user.id,
        userName,
        userEmail,
        phoneNumber || null,
        appointmentDate,
        appointmentTime.trim(),
        notes || '',
      ],
    );

    const appointment = rows[0];
    const safe = {
      name: escapeHtml(userName),
      email: escapeHtml(userEmail),
      phone: escapeHtml(phoneNumber || '—'),
      date: escapeHtml(appointmentDate),
      time: escapeHtml(appointmentTime),
      notes: escapeHtml(notes || '—'),
    };

    if (config.resendApiKey && config.adminEmail) {
      try {
        await sendRawEmail({
          to: config.adminEmail,
          subject: `New Appointment Request from ${userName.replace(/[\r\n]/g, ' ').slice(0, 80)}`,
          html: `<h2>New Appointment</h2>
            <p><strong>Client:</strong> ${safe.name}</p>
            <p><strong>Email:</strong> ${safe.email}</p>
            <p><strong>Phone:</strong> ${safe.phone}</p>
            <p><strong>Date:</strong> ${safe.date}</p>
            <p><strong>Time:</strong> ${safe.time}</p>
            <p><strong>Notes:</strong> ${safe.notes}</p>`,
        });
      } catch (e) {
        console.error('Admin email error:', e);
      }
    }

    if (config.resendApiKey && userEmail) {
      try {
        await sendRawEmail({
          to: userEmail,
          subject: 'Appointment Confirmation - Open Ear',
          html: `<h2>Your appointment request was received</h2>
            <p>Date: ${safe.date}</p><p>Time: ${safe.time}</p>`,
        });
      } catch (e) {
        console.error('User email error:', e);
      }
    }

    res.json({
      success: true,
      appointment,
      message: 'Appointment created successfully',
    });
  }),
);

export default router;
