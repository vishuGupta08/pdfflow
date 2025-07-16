import express, { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { PDFService } from '../services/pdfService';
import { uploadedFiles } from './upload';
import { storeTransformedPDF } from './preview';
import { transformedFiles } from './download';

const router = express.Router();

// Apply edits to PDF and return downloadable file
router.post('/', async (req: Request, res: Response) => {
  try {
    const { fileId, edits } = req.body;

    if (!fileId) {
      return res.status(400).json({
        success: false,
        error: 'File ID is required'
      });
    }

    if (!edits || !Array.isArray(edits) || edits.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'At least one edit is required'
      });
    }

    // Get the uploaded file
    const uploadedFile = uploadedFiles.get(fileId);
    if (!uploadedFile) {
      return res.status(404).json({
        success: false,
        error: 'File not found'
      });
    }

    console.log(`🎨 Processing ${edits.length} edits for file: ${uploadedFile.originalName}`);

    // Create a transformation rule for editing
    const editRule = {
      type: 'edit_pdf' as const,
      edits
    };

    // Apply the edits using PDFService
    const editedPdfBuffer = await PDFService.transformPDF(uploadedFile.path, [editRule]);

    // Generate unique IDs for preview and download
    const previewId = uuidv4();
    const downloadId = uuidv4();

    // Store the edited PDF for preview and download
    storeTransformedPDF(previewId, editedPdfBuffer);
    transformedFiles.set(downloadId, {
      buffer: editedPdfBuffer,
      originalName: uploadedFile.originalName,
      timestamp: Date.now()
    });

    // Generate filename for edited PDF
    const nameWithoutExt = uploadedFile.originalName.replace(/\.pdf$/i, '');
    const editedFileName = `${nameWithoutExt}_edited.pdf`;

    res.json({
      success: true,
      message: 'PDF edited successfully',
      previewId,
      downloadId,
      fileName: editedFileName
    });

  } catch (error) {
    console.error('Edit PDF error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to apply edits to PDF'
    });
  }
});

export default router;
