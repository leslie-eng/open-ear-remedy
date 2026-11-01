import http from 'node:http';
import { app } from './app.js';
import { attachCallSocket } from './calls/service.js';
import { config } from './config.js';
import { pool } from './db.js';
import { sendRawEmail } from './email.js';
import * as bookings from './services/bookings.js';

// One HTTP server for the REST API and the call WebSocket (/ws).
const server = http.createServer(app);
attachCallSocket(server);

const host = process.env.HOST || '0.0.0.0';
server.listen(config.port, host, () => {
  console.log(`Open Ear API listening on http://${host}:${config.port} (calls on /ws)`);
  if (!pool) {
    console.warn('WARNING: DATABASE_URL not set — API will fail on data routes');
  }
});

// Booking reminders and no-shows, every minute. The scheduled keep-awake ping keeps this running on Render.
const BOOKING_SWEEP_MS = 60_000;
const notify = { email: (to, subject, html) => sendRawEmail({ to, subject, html }) };
if (pool) {
  setInterval(() => {
    bookings.sweep({ notify }).catch((err) => console.error('Booking sweep failed', err));
  }, BOOKING_SWEEP_MS).unref();
}
