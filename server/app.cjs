/**
 * cPanel / LiteSpeed (lsnode.js) starts apps with require(), not ESM.
 * Point "Application startup file" to app.cjs — it loads the real API in src/index.js.
 */
import('./src/index.js').catch((err) => {
  console.error('Failed to start Open Ear API:', err);
  process.exit(1);
});
