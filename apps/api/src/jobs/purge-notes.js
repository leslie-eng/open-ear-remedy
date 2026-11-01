import { pool } from '../db.js';
import { purgeExpired } from '../services/notes.js';

/** Deletes Listener notes older than 12 months. Run daily (GitHub Actions in production). */
purgeExpired()
  .then((n) => console.log(`Purged ${n} expired note(s).`))
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => pool?.end());
