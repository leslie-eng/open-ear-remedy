import { config } from './config.js';

async function sendViaResend({ to, subject, html }) {
  if (!config.resendApiKey) {
    console.log('[email:dev]', { to, subject });
    return { ok: true, dev: true };
  }

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${config.resendApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: config.emailFrom,
      to: Array.isArray(to) ? to : [to],
      subject,
      html,
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    console.error('Resend error:', text);
    throw new Error('Failed to send email');
  }
  return { ok: true };
}

export async function sendVerificationEmail(email, code) {
  return sendViaResend({
    to: email,
    subject: 'Your Open Ear verification code',
    html: `
      <h2>Verify your email</h2>
      <p>Your verification code is:</p>
      <p style="font-size:28px;font-weight:bold;letter-spacing:4px">${code}</p>
      <p>This code expires in 15 minutes.</p>
    `,
  });
}

export async function sendPasswordResetEmail(email, resetUrl) {
  return sendViaResend({
    to: email,
    subject: 'Reset your Open Ear password',
    html: `
      <h2>Password reset</h2>
      <p><a href="${resetUrl}">Click here to reset your password</a></p>
      <p>Or copy this link: ${resetUrl}</p>
      <p>This link expires in 1 hour.</p>
    `,
  });
}

export async function sendRawEmail({ to, subject, html }) {
  return sendViaResend({ to, subject, html });
}
