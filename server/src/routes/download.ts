import express from 'express';
import fs from 'fs';
import path from 'path';

const router = express.Router();

// Import the in-memory storage from transform route
// In-memory storage for transformed PDFs ready for download
const transformedFiles = new Map<string, { buffer: Buffer; originalName: string; timestamp: number }>();

// Export the storage so transform route can use it
export { transformedFiles };

router.get('/:resultId', (req, res) => {
  try {
    const { resultId } = req.params;
    const result = transformedFiles.get(resultId);

    if (!result) {
      return res.status(404).json({
        success: false,
        error: 'File not found'
      });
    }

    // Set appropriate headers for PDF download
    const fileName = `transformed-${result.originalName}`;
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    res.setHeader('Content-Length', result.buffer.length.toString());

    // Send the buffer directly
    res.send(result.buffer);

  } catch (error) {
    console.error('Download error:', error);
    res.status(500).json({
      success: false,
      error: 'Download failed'
    });
  }
});

export default router; 