import { bearerToken, userFromToken } from './auth.js';
import { query } from './db.js';
import { config } from './config.js';

export function asyncHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

export async function requireAuth(req, res, next) {
  try {
    const token = bearerToken(req);
    if (!token) return res.status(401).json({ error: 'Unauthorized' });
    const user = await userFromToken(token);
    if (!user) return res.status(401).json({ error: 'Unauthorized' });
    if (!user.email_verified_at) {
      return res.status(403).json({ error: 'Email not verified' });
    }
    req.user = user;
    req.token = token;
    next();
  } catch (err) {
    next(err);
  }
}

export async function requireAdmin(req, res, next) {
  try {
    const token = bearerToken(req);
    if (!token) return res.status(401).json({ error: 'Unauthorized' });
    const user = await userFromToken(token);
    if (!user || !user.email_verified_at) return res.status(401).json({ error: 'Unauthorized' });
    const { rows } = await query(`SELECT role FROM admin_users WHERE user_id = $1`, [user.id]);
    if (!rows[0] || rows[0].role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }
    req.user = user;
    req.token = token;
    next();
  } catch (err) {
    next(err);
  }
}

export function errorHandler(err, _req, res, _next) {
  if (err?.type === 'entity.too.large') {
    return res.status(413).json({ error: 'Request too large' });
  }
  if (err?.type === 'entity.parse.failed') {
    return res.status(400).json({ error: 'Invalid JSON body' });
  }
  if (err?.code === 'LIMIT_FILE_SIZE') {
    return res.status(413).json({ error: 'File too large' });
  }
  const status = Number.isInteger(err?.status) ? err.status : 500;
  if (status >= 500) console.error(err);
  // Only messages we raised on purpose reach the client; internals (SQL, stack, third-party) stay in logs.
  const expose = err?.expose || (status < 500) || config.nodeEnv !== 'production';
  res.status(status).json({ error: expose ? err.message : 'Internal server error' });
}
