import { Router, Request, Response } from 'express';
import path from 'path';
import fs from 'fs';
import { uploadedFiles } from './upload'; // Import the uploaded files store

const router = Router();

// In-memory storage for transformed PDFs (in production, use Redis or database)
const transformedFiles = new Map<string, Buffer>();

// Store transformed PDF for preview
export const storeTransformedPDF = (fileId: string, pdfBuffer: Buffer): void => {
  console.log('📦 Storing transformed PDF with ID:', fileId, 'Buffer size:', pdfBuffer.length);
  transformedFiles.set(fileId, pdfBuffer);
  console.log('✅ Successfully stored. Total transformed files:', transformedFiles.size);
  
  // Auto-cleanup after 1 hour
  setTimeout(() => {
    console.log('🗑️ Auto-cleanup removing transformed file:', fileId);
    transformedFiles.delete(fileId);
  }, 60 * 60 * 1000);
};

// Get uploaded PDF for preview
router.get('/upload/:fileId', (req: Request, res: Response) => {
  try {
    const { fileId } = req.params;
    console.log('🔍 Preview request for fileId:', fileId);
    console.log('🔍 Available files in uploadedFiles:', Array.from(uploadedFiles.keys()));
    
    const uploadedFile = uploadedFiles.get(fileId);
    if (!uploadedFile) {
      console.log('❌ File not found in uploadedFiles map');
      return res.status(404).json({ error: 'File not found' });
    }

    console.log('✅ Found file:', uploadedFile.path);

    // Check if file exists on disk
    if (!fs.existsSync(uploadedFile.path)) {
      console.log('❌ File not found on disk:', uploadedFile.path);
      return res.status(404).json({ error: 'File not found on disk' });
    }

    console.log('✅ File exists on disk, serving...');

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
    console.log('🔍 Transformed preview request for fileId:', fileId);
    console.log('🔍 Available transformed files:', Array.from(transformedFiles.keys()));
    
    const pdfBuffer = transformedFiles.get(fileId);
    if (!pdfBuffer) {
      console.log('❌ Transformed PDF not found for fileId:', fileId);
      return res.status(404).json({ error: 'Preview not found or expired' });
    }
    
    console.log('✅ Found transformed PDF, sending buffer of size:', pdfBuffer.length);

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