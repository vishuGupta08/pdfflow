import { Router, Request, Response } from 'express';
import path from 'path';
import fs from 'fs';
import { uploadedFiles } from './upload'; // Import the uploaded files store

const router = Router();

// In-memory storage for transformed PDFs (in production, use Redis or database)
const transformedFiles = new Map<string, Buffer>();

// Store transformed PDF for preview
export const storeTransformedPDF = (fileId: string, pdfBuffer: Buffer): void => {
  transformedFiles.set(fileId, pdfBuffer);
  
  // Auto-cleanup after 1 hour
  setTimeout(() => {
    transformedFiles.delete(fileId);
  }, 60 * 60 * 1000);
};

// Get uploaded PDF for preview
router.get('/upload/:fileId', (req: Request, res: Response) => {
  try {
    const { fileId } = req.params;
    
    const uploadedFile = uploadedFiles.get(fileId);
    if (!uploadedFile) {
      return res.status(404).json({ error: 'File not found' });
    }

    // Check if file exists on disk
    if (!fs.existsSync(uploadedFile.path)) {
      return res.status(404).json({ error: 'File not found on disk' });
    }

    // Set headers for PDF viewing
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'inline');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    
    // Stream the file
    const fileStream = fs.createReadStream(uploadedFile.path);
    fileStream.pipe(res);
  } catch (error) {
    console.error('Upload preview error:', error);
    res.status(500).json({ error: 'Failed to serve upload preview' });
  }
});

// Get transformed PDF for preview
router.get('/:fileId', (req: Request, res: Response) => {
  try {
    const { fileId } = req.params;
    
    const pdfBuffer = transformedFiles.get(fileId);
    if (!pdfBuffer) {
      return res.status(404).json({ error: 'Preview not found or expired' });
    }

    // Set headers for PDF viewing
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'inline');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    
    res.send(pdfBuffer);
  } catch (error) {
    console.error('Preview error:', error);
    res.status(500).json({ error: 'Failed to serve preview' });
  }
});

export default router;