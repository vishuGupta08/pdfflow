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
        'compress', 'redact_text', 'add_page_numbers', 'rearrange_pages', 'extract_pages',
        'split_pdf', 'add_image', 'add_header_footer', 'add_blank_pages', 'crop_pages', 
        'add_background', 'add_text_annotation', 'add_border', 'resize_pages', 'password_protect', 'remove_password'
      ).required(),
      
      // Existing parameters
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
      fontColor: Joi.string().pattern(/^#[0-9A-Fa-f]{6}$/).optional(),
      
      // Compression options
      compressionLevel: Joi.string().valid('low', 'medium', 'high', 'maximum', 'custom').optional(),
      targetFileSize: Joi.number().integer().min(10).max(50000).optional(),
      imageQuality: Joi.number().integer().min(10).max(100).optional(),
      
      // Split PDF options
      splitBy: Joi.string().valid('page_count', 'page_ranges', 'individual_pages').optional(),
      pagesPerSplit: Joi.number().integer().min(1).optional(),
      splitRanges: Joi.array().items(
        Joi.object({
          start: Joi.number().integer().min(1).required(),
          end: Joi.number().integer().min(1).required(),
          name: Joi.string().optional()
        })
      ).optional(),
      
      // Image options
      imageFile: Joi.string().optional(),
      imageWidth: Joi.number().min(1).optional(),
      imageHeight: Joi.number().min(1).optional(),
      maintainAspectRatio: Joi.boolean().optional(),
      
      // Header/Footer options
      headerText: Joi.string().optional(),
      footerText: Joi.string().optional(),
      includePageNumber: Joi.boolean().optional(),
      includeDate: Joi.boolean().optional(),
      differentFirstPage: Joi.boolean().optional(),
      headerImage: Joi.string().optional(),
      footerImage: Joi.string().optional(),
      
      // Blank pages options
      insertPosition: Joi.string().valid('beginning', 'end', 'after_page', 'before_page').optional(),
      targetPageNumber: Joi.number().integer().min(1).optional(),
      blankPageCount: Joi.number().integer().min(1).max(50).optional(),
      blankPageSize: Joi.string().valid('same_as_original', 'a4', 'letter', 'legal', 'custom').optional(),
      customWidth: Joi.number().min(1).optional(),
      customHeight: Joi.number().min(1).optional(),
      
      // Crop options
      cropBox: Joi.object({
        x: Joi.number().min(0).required(),
        y: Joi.number().min(0).required(),
        width: Joi.number().min(1).required(),
        height: Joi.number().min(1).required()
      }).optional(),
      cropPreset: Joi.string().valid('a4', 'letter', 'legal', 'square', 'custom').optional(),
      cropMargins: Joi.object({
        top: Joi.number().min(0).required(),
        bottom: Joi.number().min(0).required(),
        left: Joi.number().min(0).required(),
        right: Joi.number().min(0).required()
      }).optional(),
      
      // Background options
      backgroundColor: Joi.string().pattern(/^#[0-9A-Fa-f]{6}$/).optional(),
      backgroundImage: Joi.string().optional(),
      backgroundOpacity: Joi.number().min(0).max(1).optional(),
      backgroundScale: Joi.string().valid('fit', 'fill', 'stretch', 'tile').optional(),
      
      // Text annotation options
      annotations: Joi.array().items(
        Joi.object({
          id: Joi.string().required(),
          type: Joi.string().valid('text', 'sticky_note', 'highlight', 'underline', 'strikethrough').required(),
          content: Joi.string().required(),
          x: Joi.number().required(),
          y: Joi.number().required(),
          width: Joi.number().min(1).optional(),
          height: Joi.number().min(1).optional(),
          color: Joi.string().pattern(/^#[0-9A-Fa-f]{6}$/).optional(),
          fontSize: Joi.number().min(6).max(72).optional()
        })
      ).optional(),
      
      // Border options
      borderColor: Joi.string().pattern(/^#[0-9A-Fa-f]{6}$/).optional(),
      borderWidth: Joi.number().min(1).max(20).optional(),
      borderStyle: Joi.string().valid('solid', 'dashed', 'dotted').optional(),
      borderRadius: Joi.number().min(0).optional(),
      borderMargin: Joi.number().min(0).optional(),
      
      // Resize options
      resizeMode: Joi.string().valid('scale', 'fit_to_size', 'custom_dimensions').optional(),
      scaleFactor: Joi.number().min(0.1).max(10).optional(),
      targetSize: Joi.string().valid('a4', 'letter', 'legal', 'custom').optional(),
      newWidth: Joi.number().min(1).optional(),
      newHeight: Joi.number().min(1).optional(),
      maintainContentAspectRatio: Joi.boolean().optional(),
      
      // Password protection options
      userPassword: Joi.string().min(1).max(128).optional(),
      ownerPassword: Joi.string().min(1).max(128).optional(),
      permissions: Joi.object({
        printing: Joi.boolean().optional(),
        modifying: Joi.boolean().optional(),
        copying: Joi.boolean().optional(),
        annotating: Joi.boolean().optional(),
        filling: Joi.boolean().optional(),
        accessibility: Joi.boolean().optional(),
        assembling: Joi.boolean().optional(),
        qualityPrinting: Joi.boolean().optional()
      }).optional(),
      
      // Password removal options
      currentPassword: Joi.string().min(1).max(128).optional(),
      removeUserPassword: Joi.boolean().optional(),
      removeOwnerPassword: Joi.boolean().optional()
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