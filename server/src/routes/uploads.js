import { Router } from 'express';
import fs from 'node:fs';
import path from 'node:path';
import multer from 'multer';
import { config } from '../config.js';
import { asyncHandler, requireAdmin } from '../middleware.js';

const router = Router();

for (const sub of ['ebooks', 'covers']) {
  const dir = path.join(config.uploadDir, sub);
  fs.mkdirSync(dir, { recursive: true });
}

const storage = multer.diskStorage({
  destination(req, _file, cb) {
    const kind = req.params.kind === 'cover' ? 'covers' : 'ebooks';
    cb(null, path.join(config.uploadDir, kind));
  },
  filename(_req, file, cb) {
    cb(null, `${Date.now()}-${file.originalname.replace(/\s+/g, '-')}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 },
});

router.post(
  '/:kind',
  requireAdmin,
  upload.single('file'),
  asyncHandler(async (req, res) => {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }
    const kind = req.params.kind === 'cover' ? 'covers' : 'ebooks';
    const publicPath = `/uploads/${kind}/${req.file.filename}`;
    const base = config.clientUrl.replace(/\/$/, '');
    res.json({
      path: publicPath,
      publicUrl: `${base}${publicPath}`,
    });
  }),
);

export default router;
