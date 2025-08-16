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

    // Check file type by looking at the magic numbers
    const isZipFile = result.buffer.length >= 4 && 
                     result.buffer[0] === 0x50 && 
                     result.buffer[1] === 0x4B && 
                     (result.buffer[2] === 0x03 || result.buffer[2] === 0x05 || result.buffer[2] === 0x07) &&
                     (result.buffer[3] === 0x04 || result.buffer[3] === 0x06 || result.buffer[3] === 0x08);

    // Check for Word document (DOCX is actually a ZIP file with specific structure)
    // We'll detect Word docs by checking for the DOCX signature patterns
    const isWordDoc = result.buffer.length >= 8 && 
                     result.buffer[0] === 0x50 && 
                     result.buffer[1] === 0x4B && 
                     result.buffer[2] === 0x03 && 
                     result.buffer[3] === 0x04 &&
                     // Additional check: look for [Content_Types].xml which is specific to Office documents
                     result.buffer.includes(Buffer.from('[Content_Types].xml'));

    if (isWordDoc) {
      // Set headers for Word document download
      const fileName = `converted-${result.originalName.replace('.pdf', '.docx')}`;
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
      res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
      res.setHeader('Content-Length', result.buffer.length.toString());
      console.log(`📝 Serving Word document: ${fileName} (${result.buffer.length} bytes)`);
    } else if (isZipFile) {
      // Set headers for ZIP download
      const fileName = `split-pdfs-${result.originalName.replace('.pdf', '')}.zip`;
      res.setHeader('Content-Type', 'application/zip');
      res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
      res.setHeader('Content-Length', result.buffer.length.toString());
      console.log(`📦 Serving ZIP file: ${fileName} (${result.buffer.length} bytes)`);
    } else {
      // Set headers for PDF download
      const fileName = `transformed-${result.originalName}`;
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
      res.setHeader('Content-Length', result.buffer.length.toString());
      console.log(`📄 Serving PDF file: ${fileName} (${result.buffer.length} bytes)`);
    }

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