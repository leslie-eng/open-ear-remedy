import { app } from './app.js';
import { config } from './config.js';
import { pool } from './db.js';

const host = process.env.HOST || '0.0.0.0';
app.listen(config.port, host, () => {
  console.log(`Open Ear API listening on http://${host}:${config.port}`);
  if (!pool) {
    console.warn('WARNING: DATABASE_URL not set — API will fail on data routes');
  }
});
