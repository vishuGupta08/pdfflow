import { PDFDocument, rgb, StandardFonts, degrees } from 'pdf-lib';
import fs from 'fs';
import path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';
import { TransformationRule } from '../types';

const execAsync = promisify(exec);

export class PDFService {
  static async transformPDF(filePath: string, transformations: TransformationRule[]): Promise<Buffer> {
    const pdfBytes = fs.readFileSync(filePath);
    const pdfDoc = await PDFDocument.load(pdfBytes, { ignoreEncryption: true });
    
    // Check if compression is requested
    const compressionRule = transformations.find(t => t.type === 'compress');
    
    // Apply non-compression transformations first
    for (const transformation of transformations) {
      if (transformation.type !== 'compress') {
        await this.applyTransformation(pdfDoc, transformation);
      }
    }
    
    // Save the PDF with standard options
    const transformedPdfBuffer = Buffer.from(await pdfDoc.save());
    
    // If compression is requested, apply it using Ghostscript
    if (compressionRule) {
      console.log(`🗜️ Applying ${compressionRule.compressionLevel || 'medium'} compression with Ghostscript`);
      return await this.compressWithGhostscript(
        transformedPdfBuffer, 
        compressionRule.compressionLevel || 'medium',
        compressionRule.targetFileSize,
        compressionRule.imageQuality || 85
      );
    }
    
    return transformedPdfBuffer;
  }
  
  private static async applyTransformation(pdfDoc: PDFDocument, rule: TransformationRule): Promise<void> {
    switch (rule.type) {
      case 'remove_pages':
        await this.removePages(pdfDoc, rule.pages || []);
        break;
      case 'rotate_pages':
        await this.rotatePages(pdfDoc, rule.pages || [], rule.angle || 90);
        break;
      case 'add_watermark':
        await this.addWatermark(pdfDoc, rule.text || 'WATERMARK', rule.position || 'center', rule.opacity || 0.3);
        break;
      case 'redact_text':
        await this.redactText(pdfDoc, rule.redactWords || []);
        break;
      case 'add_page_numbers':
        await this.addPageNumbers(pdfDoc, rule.position || 'bottom-center', rule.fontSize || 12);
        break;
      case 'rearrange_pages':
        await this.rearrangePages(pdfDoc, rule.pageOrder || []);
        break;
      case 'extract_pages':
        await this.extractPages(pdfDoc, rule.pageRange || { start: 1, end: 1 });
        break;
      default:
        throw new Error(`Unsupported transformation type: ${rule.type}`);
    }
  }
  
  private static async removePages(pdfDoc: PDFDocument, pages: number[]): Promise<void> {
    // Sort pages in descending order to remove from the end first
    const sortedPages = pages.sort((a, b) => b - a);
    
    for (const pageIndex of sortedPages) {
      // Convert 1-based to 0-based index
      const zeroBasedIndex = pageIndex - 1;
      if (zeroBasedIndex >= 0 && zeroBasedIndex < pdfDoc.getPageCount()) {
        pdfDoc.removePage(zeroBasedIndex);
      }
    }
  }
  
  private static async rotatePages(pdfDoc: PDFDocument, pages: number[], angle: number): Promise<void> {
    const pageCount = pdfDoc.getPageCount();
    
    // Validate rotation angle - pdf-lib only supports 90-degree increments
    const validAngles = [90, 180, 270, -90];
    if (!validAngles.includes(angle)) {
      throw new Error(`Invalid rotation angle: ${angle}. Only 90, 180, 270, and -90 degrees are supported.`);
    }
    
    for (const pageIndex of pages) {
      const zeroBasedIndex = pageIndex - 1;
      if (zeroBasedIndex >= 0 && zeroBasedIndex < pageCount) {
        const page = pdfDoc.getPage(zeroBasedIndex);
        page.setRotation(degrees(angle));
      }
    }
  }
  
  private static async addWatermark(pdfDoc: PDFDocument, text: string, position: string, opacity: number): Promise<void> {
    const helveticaFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const pages = pdfDoc.getPages();
    
    for (const page of pages) {
      const { width, height } = page.getSize();
      const fontSize = Math.min(width, height) * 0.1;
      
      let x = width / 2;
      let y = height / 2;
      
      // Position calculation
      switch (position) {
        case 'top-left':
          x = fontSize;
          y = height - fontSize;
          break;
        case 'top-center':
          x = width / 2;
          y = height - fontSize;
          break;
        case 'top-right':
          x = width - fontSize;
          y = height - fontSize;
          break;
        case 'center-left':
          x = fontSize;
          y = height / 2;
          break;
        case 'center-right':
          x = width - fontSize;
          y = height / 2;
          break;
        case 'bottom-left':
          x = fontSize;
          y = fontSize;
          break;
        case 'bottom-center':
          x = width / 2;
          y = fontSize;
          break;
        case 'bottom-right':
          x = width - fontSize;
          y = fontSize;
          break;
        default: // center
          x = width / 2;
          y = height / 2;
      }
      
      page.drawText(text, {
        x,
        y,
        size: fontSize,
        font: helveticaFont,
        color: rgb(0.5, 0.5, 0.5),
        opacity,
        rotate: degrees(45)
      });
    }
  }
  
  private static async redactText(pdfDoc: PDFDocument, words: string[]): Promise<void> {
    // Note: This is a simplified redaction - in production, you'd need more sophisticated text detection
    const pages = pdfDoc.getPages();
    
    for (const page of pages) {
      const { width, height } = page.getSize();
      
      // Draw black rectangles to simulate redaction
      // In a real implementation, you'd need to parse text and find exact positions
      for (let i = 0; i < words.length; i++) {
        page.drawRectangle({
          x: 50 + (i * 100),
          y: height - 100,
          width: 80,
          height: 20,
          color: rgb(0, 0, 0)
        });
      }
    }
  }
  
  private static async addPageNumbers(pdfDoc: PDFDocument, position: string, fontSize: number): Promise<void> {
    const helveticaFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const pages = pdfDoc.getPages();
    
    pages.forEach((page, index) => {
      const { width, height } = page.getSize();
      const pageNumber = `${index + 1}`;
      
      let x = width / 2;
      let y = 20;
      
      // Position calculation
      switch (position) {
        case 'top-center':
          x = width / 2;
          y = height - 20;
          break;
        case 'top-left':
          x = 20;
          y = height - 20;
          break;
        case 'top-right':
          x = width - 20;
          y = height - 20;
          break;
        case 'bottom-left':
          x = 20;
          y = 20;
          break;
        case 'bottom-right':
          x = width - 20;
          y = 20;
          break;
        default: // bottom-center
          x = width / 2;
          y = 20;
      }
      
      page.drawText(pageNumber, {
        x,
        y,
        size: fontSize,
        font: helveticaFont,
        color: rgb(0, 0, 0)
      });
    });
  }
  
  private static async rearrangePages(pdfDoc: PDFDocument, pageOrder: number[]): Promise<void> {
    if (pageOrder.length === 0) return;
    
    const originalPages = pdfDoc.getPages();
    const pageCount = originalPages.length;
    
    // Create new document with rearranged pages
    const newDoc = await PDFDocument.create();
    
    for (const pageIndex of pageOrder) {
      const zeroBasedIndex = pageIndex - 1;
      if (zeroBasedIndex >= 0 && zeroBasedIndex < pageCount) {
        const [copiedPage] = await newDoc.copyPages(pdfDoc, [zeroBasedIndex]);
        newDoc.addPage(copiedPage);
      }
    }
    
    // Replace original pages with rearranged ones
    // Remove all pages from original document
    while (pdfDoc.getPageCount() > 0) {
      pdfDoc.removePage(0);
    }
    
    // Copy rearranged pages back
    const rearrangedPages = await pdfDoc.copyPages(newDoc, newDoc.getPageIndices());
    rearrangedPages.forEach((page) => pdfDoc.addPage(page));
  }
  
  private static async extractPages(pdfDoc: PDFDocument, pageRange: { start: number; end: number }): Promise<void> {
    const pageCount = pdfDoc.getPageCount();
    const startIndex = Math.max(0, pageRange.start - 1);
    const endIndex = Math.min(pageCount - 1, pageRange.end - 1);
    
    // Create new document with only the specified pages
    const newPdfDoc = await PDFDocument.create();
    
    // Copy the specified range of pages
    const pageIndices = [];
    for (let i = startIndex; i <= endIndex; i++) {
      pageIndices.push(i);
    }
    
    const copiedPages = await newPdfDoc.copyPages(pdfDoc, pageIndices);
    copiedPages.forEach(page => newPdfDoc.addPage(page));
    
    // Replace pages in original document
    while (pdfDoc.getPageCount() > 0) {
      pdfDoc.removePage(0);
    }
    
    // Copy back all pages from new document
    const finalPages = await pdfDoc.copyPages(newPdfDoc, newPdfDoc.getPageIndices());
    finalPages.forEach(page => pdfDoc.addPage(page));
  }

  private static async compressWithGhostscript(
    pdfBuffer: Buffer,
    compressionLevel: 'low' | 'medium' | 'high' | 'maximum' | 'custom',
    targetFileSize?: number,
    imageQuality: number = 85
  ): Promise<Buffer> {
    const tempDir = path.join(__dirname, '../../temp');
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }

    const inputFile = path.join(tempDir, `input_${Date.now()}.pdf`);
    const outputFile = path.join(tempDir, `output_${Date.now()}.pdf`);

    try {
      // Write input buffer to temporary file
      fs.writeFileSync(inputFile, pdfBuffer);

      // Get original file size for logging
      const originalSize = pdfBuffer.length;
      console.log(`📊 Original PDF size: ${(originalSize / 1024).toFixed(2)} KB`);

      // Define compression settings based on level
      let gsSettings = '';
      let dpi = '150'; // Default DPI

      switch (compressionLevel) {
        case 'low':
          gsSettings = '/printer'; // Good quality, less compression
          dpi = '300';
          break;
        case 'medium':
          gsSettings = '/ebook'; // Medium quality, medium compression
          dpi = '150';
          break;
        case 'high':
          gsSettings = '/screen'; // Lower quality, more compression
          dpi = '100';
          break;
        case 'maximum':
          gsSettings = '/screen'; // Lowest quality, maximum compression
          dpi = '72';
          break;
        case 'custom':
          gsSettings = '/ebook'; // Default to medium for custom
          dpi = targetFileSize && targetFileSize < 500 ? '72' : '150';
          break;
      }

      // Build Ghostscript command
      const gsCommand = [
        'gs',
        '-sDEVICE=pdfwrite',
        '-dCompatibilityLevel=1.4',
        '-dPDFSETTINGS=' + gsSettings,
        '-dNOPAUSE',
        '-dQUIET',
        '-dBATCH',
        `-dDownsampleColorImages=true`,
        `-dColorImageResolution=${dpi}`,
        `-dDownsampleGrayImages=true`,
        `-dGrayImageResolution=${dpi}`,
        `-dDownsampleMonoImages=true`,
        `-dMonoImageResolution=${parseInt(dpi) * 2}`, // Higher resolution for mono images
        `-dColorImageDownsampleThreshold=1.0`,
        `-dGrayImageDownsampleThreshold=1.0`,
        `-dMonoImageDownsampleThreshold=1.0`,
        `-dCompressPages=true`,
        `-dUseFlateCompression=true`,
        `-dOptimize=true`,
        `-sOutputFile=${outputFile}`,
        inputFile
      ].join(' ');

      console.log(`🔧 Running Ghostscript compression: ${compressionLevel} (DPI: ${dpi})`);
      
      // Execute Ghostscript command
      const { stdout, stderr } = await execAsync(gsCommand);
      
      if (stderr && !stderr.includes('GPL Ghostscript')) {
        console.warn(`⚠️ Ghostscript warning: ${stderr}`);
      }

      // Check if output file was created
      if (!fs.existsSync(outputFile)) {
        throw new Error('Ghostscript compression failed - output file not created');
      }

      // Read compressed file
      const compressedBuffer = fs.readFileSync(outputFile);
      const compressedSize = compressedBuffer.length;
      const reduction = ((originalSize - compressedSize) / originalSize) * 100;

      console.log(`📊 Compressed PDF size: ${(compressedSize / 1024).toFixed(2)} KB`);
      console.log(`📉 Size reduction: ${reduction.toFixed(1)}%`);

      // If custom target size is specified and we didn't meet it, try again with higher compression
      if (compressionLevel === 'custom' && targetFileSize) {
        const targetBytes = targetFileSize * 1024;
        if (compressedSize > targetBytes && reduction < 70) {
          console.log(`🎯 Target not met, applying maximum compression...`);
          // Cleanup current output
          fs.unlinkSync(outputFile);
          
          // Try again with maximum compression
          const maxCompressionCommand = gsCommand
            .replace('-dPDFSETTINGS=/ebook', '-dPDFSETTINGS=/screen')
            .replace(`-dColorImageResolution=${dpi}`, '-dColorImageResolution=72')
            .replace(`-dGrayImageResolution=${dpi}`, '-dGrayImageResolution=72');
          
          await execAsync(maxCompressionCommand);
          
          if (fs.existsSync(outputFile)) {
            const finalBuffer = fs.readFileSync(outputFile);
            const finalSize = finalBuffer.length;
            const finalReduction = ((originalSize - finalSize) / originalSize) * 100;
            console.log(`📊 Final compressed size: ${(finalSize / 1024).toFixed(2)} KB (${finalReduction.toFixed(1)}% reduction)`);
            return finalBuffer;
          }
        }
      }

      return compressedBuffer;

    } catch (error) {
      console.error('🚫 Ghostscript compression failed:', error);
      // Return original buffer if compression fails
      return pdfBuffer;
    } finally {
      // Cleanup temporary files
      try {
        if (fs.existsSync(inputFile)) fs.unlinkSync(inputFile);
        if (fs.existsSync(outputFile)) fs.unlinkSync(outputFile);
      } catch (cleanupError) {
        console.warn('⚠️ Failed to cleanup temporary files:', cleanupError);
      }
    }
  }
} 