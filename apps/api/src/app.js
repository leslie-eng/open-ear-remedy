import express from 'express';
import cors from 'cors';
import { config } from './config.js';
import { pool } from './db.js';
import { errorHandler } from './middleware.js';
import authRoutes from './routes/auth.js';
import userRoutes from './routes/user.js';
import callsRoutes from './routes/calls.js';
import chatRoutes from './routes/chat.js';
import knowledgeRoutes from './routes/knowledge.js';
import paymentsRoutes, { paystackWebhookHandler } from './routes/payments.js';
import appointmentsRoutes from './routes/appointments.js';
import adminRoutes from './routes/admin.js';
import notificationsRoutes from './routes/notifications.js';
import uploadsRoutes from './routes/uploads.js';
import ebooksRoutes from './routes/ebooks.js';
import publicRoutes from './routes/public.js';
import { storage } from './services/storage.js';
import { securityHeaders } from './util.js';

export const app = express();
app.disable('x-powered-by');
// Behind Render's load balancer: use the real client IP for rate limits.
app.set('trust proxy', config.trustProxy);
app.use(securityHeaders);

app.use(
  cors({
    origin(origin, cb) {
      if (!origin || config.corsOrigins.includes(origin)) {
        cb(null, true);
      } else {
        console.warn('CORS blocked origin:', origin, 'allowed:', config.corsOrigins);
        cb(null, false);
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  }),
);

app.post(
  '/api/payments/webhook',
  express.raw({ type: 'application/json' }),
  (req, _res, next) => {
    req.rawBody = req.body?.toString?.('utf8') || '';
    try {
      req.body = JSON.parse(req.rawBody);
    } catch {
      req.body = {};
    }
    next();
  },
  paystackWebhookHandler(),
);

app.use(express.json({ limit: '200kb' }));

app.get('/api/health', (_req, res) => {
  res.json({
    ok: true,
    database: Boolean(pool),
  });
});

// Covers: from local disk in development, or a redirect to a signed URL on a private S3 bucket.
if (storage.coverHandler) app.use('/uploads/covers', storage.coverHandler);
// Signed ebook downloads from local disk (development only; S3 signs its own URLs).
if (storage.servesLocalFiles) {
  app.get('/api/files/download', (req, res) => storage.serveSignedDownload(req, res));
}
app.use('/api/auth', authRoutes);
app.use('/api/user', userRoutes);
app.use('/api/calls', callsRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/payments', paymentsRoutes);
app.use('/api/appointments', appointmentsRoutes);
app.use('/api/admin/knowledge', knowledgeRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/notifications', notificationsRoutes);
app.use('/api/uploads', uploadsRoutes);
app.use('/api/ebooks', ebooksRoutes);
app.use('/api', publicRoutes);

app.use('/api', (_req, res) => res.status(404).json({ error: 'Not found' }));

app.use(errorHandler);
