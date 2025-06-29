import express, { Router, Request, Response } from 'express';
import Joi from 'joi';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import fs from 'fs';
import { TransformRequest, TransformationResult, TransformationRule } from '../types';
import { PDFService } from '../services/pdfService';
import { uploadedFiles } from './upload';
import { storeTransformedPDF } from './preview';
import { transformedFiles } from './download';

const router = express.Router();

// Validation schema for transformation request
const transformSchema = Joi.object({
  fileId: Joi.string().required(),
  transformations: Joi.array().items(
    Joi.object({
      type: Joi.string().valid(
        'remove_pages', 'rotate_pages', 'add_watermark', 'merge_pdfs', 
        'compress', 'redact_text', 'add_page_numbers', 'rearrange_pages', 'extract_pages'
      ).required(),
      pages: Joi.array().items(Joi.number().integer().min(1)).optional(),
      angle: Joi.number().valid(90, 180, 270, -90, -180, -270).optional(),
      text: Joi.string().optional(),
      position: Joi.string().valid(
        'top-left', 'top-center', 'top-right', 'center-left', 'center', 
        'center-right', 'bottom-left', 'bottom-center', 'bottom-right'
      ).optional(),
      opacity: Joi.number().min(0).max(1).optional(),
      mergeFiles: Joi.array().items(Joi.string()).optional(),
      pageOrder: Joi.array().items(Joi.number().integer().min(1)).optional(),
      pageRange: Joi.object({
        start: Joi.number().integer().min(1).required(),
        end: Joi.number().integer().min(1).required()
      }).optional(),
      redactWords: Joi.array().items(Joi.string()).optional(),
      fontSize: Joi.number().min(8).max(72).optional(),
      fontColor: Joi.string().optional(),
      // Compression options
      compressionLevel: Joi.string().valid('low', 'medium', 'high', 'maximum', 'custom').optional(),
      targetFileSize: Joi.number().integer().min(10).max(50000).optional(), // KB
      imageQuality: Joi.number().integer().min(10).max(100).optional() // Percentage
    })
  ).min(1).required()
});

// In-memory storage for transformation results
const transformationResults = new Map<string, { filePath: string; originalName: string }>();

router.post('/', async (req: Request, res: Response) => {
  try {
    // Validate request body
    const { error, value } = transformSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        error: error.details[0].message
      });
    }

    const { fileId, transformations } = value;

    // Check if file exists in our storage
    const fileData = uploadedFiles.get(fileId);
    if (!fileData) {
      return res.status(404).json({
        success: false,
        error: 'File not found'
      });
    }

    try {
      // Apply transformations
      const transformedPDF = await PDFService.transformPDF(fileData.path, transformations);
      
      // Generate preview ID and store transformed PDF
      const previewId = uuidv4();
      storeTransformedPDF(previewId, transformedPDF);
      
      // Store transformed PDF for download using shared storage
      const downloadId = uuidv4();
      transformedFiles.set(downloadId, {
        buffer: transformedPDF,
        originalName: fileData.originalName,
        timestamp: Date.now()
      });

      // Auto-cleanup download after 1 hour
      setTimeout(() => {
        transformedFiles.delete(downloadId);
      }, 60 * 60 * 1000);

      res.json({
        success: true,
        message: 'PDF transformed successfully',
        downloadId,
        previewId,
        fileName: fileData.originalName
      });
      
    } catch (transformError) {
      console.error('Transformation error:', transformError);
      res.status(500).json({
        success: false,
        error: transformError instanceof Error ? transformError.message : 'Unknown transformation error'
      });
    }
  } catch (error) {
    console.error('Transform route error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// Get transformation status
router.get('/:resultId', (req, res) => {
  const { resultId } = req.params;
  const result = transformationResults.get(resultId);

  if (!result) {
    return res.status(404).json({
      success: false,
      error: 'Transformation result not found'
    });
  }

  res.json({
    success: true,
    data: {
      resultId,
      ready: fs.existsSync(result.filePath),
      originalName: result.originalName
    }
  });
});

export { transformationResults };
export default router; 