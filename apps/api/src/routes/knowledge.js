import { Router } from 'express';
import path from 'node:path';
import multer from 'multer';
import { query } from '../db.js';
import * as knowledge from '../knowledge/index.js';
import { asyncHandler, requireAdmin } from '../middleware.js';
import { ebookKeyFrom, storage } from '../services/storage.js';
import { httpError } from '../util.js';

/** Admin: the AI Companion's knowledge sources. Mounted at /api/admin/knowledge. */
const router = Router();
router.use(requireAdmin);
router.param('id', (_req, _res, next, id) => {
  next(/^[0-9a-f-]{36}$/i.test(id) ? undefined : httpError(404, 'Source not found'));
});

const MAX_FILE_BYTES = 50 * 1024 * 1024;

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_FILE_BYTES, files: 1 },
  fileFilter(_req, file, cb) {
    const ext = path.extname(file.originalname).toLowerCase();
    if (!knowledge.SUPPORTED_EXTENSIONS.includes(ext)) {
      return cb(httpError(400, `File type not allowed. Allowed: ${knowledge.SUPPORTED_EXTENSIONS.join(', ')}`));
    }
    cb(null, true);
  },
});

function text(value, field, { max = 200, required = true } = {}) {
  const v = typeof value === 'string' ? value.trim() : '';
  if (!v && required) throw httpError(400, `${field} is required`);
  if (v.length > max) throw httpError(400, `${field} is too long (max ${max} characters)`);
  return v || null;
}

router.get(
  '/',
  asyncHandler(async (_req, res) => {
    res.json({ sources: await knowledge.listSources() });
  }),
);

// Upload a file (multipart: file, title, author?, licence).
router.post(
  '/',
  upload.single('file'),
  asyncHandler(async (req, res) => {
    if (!req.file) throw httpError(400, 'No file uploaded');
    const source = await knowledge.addSource({
      title: text(req.body.title, 'Title'),
      author: text(req.body.author, 'Author', { required: false }),
      licence: text(req.body.licence, 'Licence', { max: 500 }),
      buffer: req.file.buffer,
      ext: path.extname(req.file.originalname).toLowerCase(),
      fileName: req.file.originalname,
      addedBy: req.user.id,
    });
    res.status(201).json({ source });
  }),
);

// Add one of our own library ebooks: { productId, licence }.
router.post(
  '/from-ebook',
  asyncHandler(async (req, res) => {
    const { rows } = await query('SELECT id, title, author, file_url FROM products WHERE id = $1', [String(req.body.productId ?? '')]);
    const product = rows[0];
    const key = ebookKeyFrom(product?.file_url);
    if (!product || !key) throw httpError(404, 'That ebook has no file to read');
    const buffer = await storage.readFile(key);
    if (!buffer) throw httpError(404, 'The ebook file is missing from storage');

    const source = await knowledge.addSource({
      title: product.title,
      author: product.author,
      licence: text(req.body.licence, 'Licence', { max: 500 }),
      buffer,
      ext: path.extname(key).toLowerCase(),
      fileName: path.basename(key),
      productId: product.id,
      addedBy: req.user.id,
    });
    res.status(201).json({ source });
  }),
);

// Record the qualified professional who signed the source off: { approvedBy }.
router.post(
  '/:id/approve',
  asyncHandler(async (req, res) => {
    res.json({ source: await knowledge.approveSource(req.params.id, text(req.body.approvedBy, 'Approved by')) });
  }),
);

// Switch a source on or off: { enabled }.
router.patch(
  '/:id',
  asyncHandler(async (req, res) => {
    if (typeof req.body.enabled !== 'boolean') throw httpError(400, 'enabled must be true or false');
    res.json({ source: await knowledge.setSourceEnabled(req.params.id, req.body.enabled) });
  }),
);

router.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    await knowledge.deleteSource(req.params.id);
    res.status(204).end();
  }),
);

export default router;
