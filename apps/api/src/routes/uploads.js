import { Router } from 'express';
import path from 'node:path';
import multer from 'multer';
import { asyncHandler, requireAdmin } from '../middleware.js';
import { storage } from '../services/storage.js';
import { httpError } from '../util.js';

const router = Router();

// Covers are public; ebooks are private and only reachable through signed download URLs
// handed out by /api/ebooks/:id/download to owners.
const KINDS = {
  cover: {
    maxBytes: 5 * 1024 * 1024,
    types: { '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.webp': 'image/webp', '.gif': 'image/gif' },
  },
  ebook: {
    maxBytes: 50 * 1024 * 1024,
    types: { '.pdf': 'application/pdf', '.epub': 'application/epub+zip' },
  },
};

function kindOf(req) {
  const kind = KINDS[req.params.kind];
  if (!kind) throw httpError(400, 'Unknown upload type');
  return kind;
}

const upload = multer({
  storage: multer.memoryStorage(),
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
      return res.status(413).json({ error: 'File too large' });
    }

    // Never trust the client's filename: keep only the validated extension.
    const ext = path.extname(req.file.originalname).toLowerCase();
    const { key } = await storage.saveFile(req.params.kind, req.file.buffer, {
      ext,
      contentType: kind.types[ext],
    });

    if (req.params.kind === 'ebook') {
      return res.json({
        path: key,
        fileName: req.file.originalname,
        size: req.file.size,
        format: ext === '.epub' ? 'EPUB' : 'PDF',
      });
    }

    const publicUrl = storage.publicUrl(key);
    res.json({ path: publicUrl, publicUrl });
  }),
);

export default router;
