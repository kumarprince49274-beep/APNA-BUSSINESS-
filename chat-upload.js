import { Router } from 'express';
import multer from 'multer';
import fs from 'fs';
import path from 'path';
import { randomUUID } from 'crypto';

const router = Router();
const uploadDir = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname || '').toLowerCase();
    cb(null, `${Date.now()}-${randomUUID()}${ext}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const image = file.mimetype.startsWith('image/');
    const document = ['application/pdf','application/msword','application/vnd.openxmlformats-officedocument.wordprocessingml.document','application/vnd.ms-excel','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet','text/csv','text/plain'].includes(file.mimetype);
    if (image || document) return cb(null, true);
    cb(new Error('Sirf photo ya document allowed hai'));
  }
});

router.post('/companies/:companyId/chat/upload', upload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'File nahi mili' });
  const type = req.body.type === 'DOCUMENT' ? 'DOCUMENT' : 'IMAGE';
  res.json({ ok:true, type, url:`/uploads/${req.file.filename}`, original_name:req.file.originalname });
});

export default router;
