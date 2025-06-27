import { PDFDocument, rgb, StandardFonts, degrees } from 'pdf-lib';
import fs from 'fs';
import path from 'path';
import { TransformationRule } from '../types';

export class PDFService {
  static async transformPDF(filePath: string, transformations: TransformationRule[]): Promise<Buffer> {
    const pdfBytes = fs.readFileSync(filePath);
    const pdfDoc = await PDFDocument.load(pdfBytes, { ignoreEncryption: true });
    
    // Apply transformations in sequence
    for (const transformation of transformations) {
      await this.applyTransformation(pdfDoc, transformation);
    }
    
    // Return the transformed PDF as buffer
    return Buffer.from(await pdfDoc.save());
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
      case 'compress':
        // PDF compression is handled automatically by pdf-lib
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
    const { start, end } = pageRange;
    const pageCount = pdfDoc.getPageCount();
    
    // Create new document with extracted pages
    const newDoc = await PDFDocument.create();
    
    for (let i = start - 1; i < Math.min(end, pageCount); i++) {
      if (i >= 0) {
        const [copiedPage] = await newDoc.copyPages(pdfDoc, [i]);
        newDoc.addPage(copiedPage);
      }
    }
    
    // Replace original pages with extracted ones
    while (pdfDoc.getPageCount() > 0) {
      pdfDoc.removePage(0);
    }
    
    const extractedPages = await pdfDoc.copyPages(newDoc, newDoc.getPageIndices());
    extractedPages.forEach((page) => pdfDoc.addPage(page));
  }
} 