import express from 'express';
import { upload } from '../config/multer';
import { v4 as uuidv4 } from 'uuid';
import { UploadedFile } from '../types';

const router = express.Router();

// In-memory store for uploaded files (in production, use a database)
const uploadedFiles = new Map<string, UploadedFile>();

router.post('/', upload.single('pdf'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'No file uploaded'
      });
    }

    const fileId = uuidv4();
    const uploadedFile: UploadedFile = {
      id: fileId,
      originalName: req.file.originalname,
      filename: req.file.filename,
      path: req.file.path,
      size: req.file.size,
      mimetype: req.file.mimetype,
      uploadedAt: new Date()
    };

    uploadedFiles.set(fileId, uploadedFile);

    res.json({
      success: true,
      data: {
        fileId,
        originalName: uploadedFile.originalName,
        size: uploadedFile.size,
        uploadedAt: uploadedFile.uploadedAt
      }
    });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({
      success: false,
      error: 'Upload failed'
    });
  }
});

// Get file info
router.get('/:fileId', (req, res) => {
  const { fileId } = req.params;
  const file = uploadedFiles.get(fileId);

  if (!file) {
    return res.status(404).json({
      success: false,
      error: 'File not found'
    });
  }

  res.json({
    success: true,
    data: {
      fileId: file.id,
      originalName: file.originalName,
      size: file.size,
      uploadedAt: file.uploadedAt
    }
  });
});

export { uploadedFiles };
export default router; 