import { Router } from 'express';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import multer from 'multer';
import { config } from '../config.js';
import { asyncHandler, requireAdmin } from '../middleware.js';
import { httpError } from '../util.js';

const router = Router();

// Covers are public (served at /uploads/covers); ebooks are private and only reachable
// through the authenticated /api/ebooks/:id/download route.
const KINDS = {
  cover: {
    dir: 'covers',
    maxBytes: 5 * 1024 * 1024,
    types: { '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.webp': 'image/webp', '.gif': 'image/gif' },
  },
  ebook: {
    dir: 'ebooks',
    maxBytes: 50 * 1024 * 1024,
    types: { '.pdf': 'application/pdf', '.epub': 'application/epub+zip' },
  },
};

for (const { dir } of Object.values(KINDS)) {
  fs.mkdirSync(path.join(config.uploadDir, dir), { recursive: true });
}

function kindOf(req) {
  const kind = KINDS[req.params.kind];
  if (!kind) throw httpError(400, 'Unknown upload type');
  return kind;
}

const storage = multer.diskStorage({
  destination(req, _file, cb) {
    cb(null, path.join(config.uploadDir, kindOf(req).dir));
  },
  filename(_req, file, cb) {
    // Never trust the client's filename: keep only a validated extension.
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `${Date.now()}-${crypto.randomBytes(8).toString('hex')}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: KINDS.ebook.maxBytes, files: 1 },
  fileFilter(req, file, cb) {
    try {
      const kind = kindOf(req);
      const ext = path.extname(file.originalname).toLowerCase();
      if (!kind.types[ext]) {
        return cb(httpError(400, `File type not allowed. Allowed: ${Object.keys(kind.types).join(', ')}`));
      }
      cb(null, true);
    } catch (err) {
      cb(err);
    }
  },
});

router.post(
  '/:kind',
  requireAdmin,
  (req, res, next) => {
    try {
      kindOf(req);
      next();
    } catch (err) {
      next(err);
    }
  },
  upload.single('file'),
  asyncHandler(async (req, res) => {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }
    const kind = kindOf(req);
    if (req.file.size > kind.maxBytes) {
      fs.unlink(req.file.path, () => {});
      return res.status(413).json({ error: 'File too large' });
    }

    if (kind === KINDS.ebook) {
      const ext = path.extname(req.file.filename).toLowerCase();
      return res.json({
        path: `ebooks/${req.file.filename}`,
        fileName: req.file.originalname,
        size: req.file.size,
        format: ext === '.epub' ? 'EPUB' : 'PDF',
      });
    }

    const publicPath = `/uploads/covers/${req.file.filename}`;
    res.json({
      path: publicPath,
      publicUrl: `${config.publicApiUrl}${publicPath}`,
    });
  }),
);

export default router;
