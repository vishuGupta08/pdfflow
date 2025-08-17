import express from 'express';
import { upload, uploadImage } from '../config/multer';
import { v4 as uuidv4 } from 'uuid';
import { UploadedFile } from '../types';
import fs from 'fs';

const router = express.Router();

// In-memory store for uploaded files (in production, use a database)
const uploadedFiles = new Map<string, UploadedFile>();

router.post('/', (req, res, next) => {
  upload.single('pdf')(req, res, (err) => {
    if (err) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({
          success: false,
          error: 'File too large. Maximum size is 50MB'
        });
      }
      if (err.message === 'Only PDF files are allowed') {
        return res.status(400).json({
          success: false,
          error: 'Only PDF files are allowed'
        });
      }
      return res.status(500).json({
        success: false,
        error: 'Upload failed'
      });
    }

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
  });
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

// Serve uploaded file for preview
router.get('/preview/:fileId', (req, res) => {
  try {
    const { fileId } = req.params;
    const file = uploadedFiles.get(fileId);

    if (!file) {
      return res.status(404).json({
        success: false,
        error: 'File not found'
      });
    }

    // Check if file exists on disk
    if (!fs.existsSync(file.path)) {
      return res.status(404).json({
        success: false,
        error: 'File not found on disk'
      });
    }

    // Set headers for PDF viewing
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'inline');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    // Stream the file
    const fileStream = fs.createReadStream(file.path);
    fileStream.pipe(res);
  } catch (error) {
    console.error('Preview error:', error);
    res.status(500).json({ error: 'Failed to serve preview' });
  }
});

// Image upload endpoint
router.post('/image', (req, res, next) => {
  uploadImage.single('image')(req, res, (err) => {
    if (err) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({
          success: false,
          error: 'Image too large. Maximum size is 10MB'
        });
      }
      if (err.message === 'Only image files (PNG, JPG, JPEG, WebP, SVG) are allowed') {
        return res.status(400).json({
          success: false,
          error: 'Only image files (PNG, JPG, JPEG, WebP, SVG) are allowed'
        });
      }
      return res.status(500).json({
        success: false,
        error: 'Image upload failed'
      });
    }

    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'No image uploaded'
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

    console.log(`📷 Image uploaded: ${req.file.originalname} (${req.file.size} bytes)`);

    res.json({
      success: true,
      message: 'Image uploaded successfully',
      data: {
        fileId,
        originalName: req.file.originalname,
        size: req.file.size,
        mimetype: req.file.mimetype
      }
    });
  });
});

export { uploadedFiles };
export default router;