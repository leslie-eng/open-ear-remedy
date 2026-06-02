import { Router } from 'express';
import { query } from '../db.js';
import { config } from '../config.js';
import { asyncHandler, requireAuth } from '../middleware.js';
import { sendRawEmail } from '../email.js';

const router = Router();

router.post(
  '/',
  requireAuth,
  asyncHandler(async (req, res) => {
    const { appointmentDate, appointmentTime, notes, phoneNumber } = req.body;
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
        appointmentTime,
        notes || '',
      ],
    );

    const appointment = rows[0];

    if (config.resendApiKey && config.adminEmail) {
      try {
        await sendRawEmail({
          to: config.adminEmail,
          subject: `New Appointment Request from ${userName}`,
          html: `<h2>New Appointment</h2>
            <p><strong>Client:</strong> ${userName}</p>
            <p><strong>Email:</strong> ${userEmail}</p>
            <p><strong>Date:</strong> ${appointmentDate}</p>
            <p><strong>Time:</strong> ${appointmentTime}</p>`,
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
            <p>Date: ${appointmentDate}</p><p>Time: ${appointmentTime}</p>`,
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
