import { PDFDocument, rgb, StandardFonts, degrees } from 'pdf-lib';
import fs from 'fs';
import path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';
import { TransformationRule } from '../types';

const execAsync = promisify(exec);

export class PDFService {
  static async transformPDF(filePath: string, transformations: TransformationRule[]): Promise<Buffer> {
    let workingFilePath = filePath;
    
    // Check if password removal is requested - handle it first before pdf-lib processing
    const passwordRemovalRule = transformations.find(t => t.type === 'remove_password');
    if (passwordRemovalRule) {
      console.log('🔒 Password removal detected - processing before other transformations');
      workingFilePath = await this.handlePasswordRemoval(filePath, passwordRemovalRule);
    }
    
    const pdfBytes = fs.readFileSync(workingFilePath);
    const pdfDoc = await PDFDocument.load(pdfBytes, { ignoreEncryption: true });
    
    // Check if compression is requested
    const compressionRule = transformations.find(t => t.type === 'compress');
    
    // Apply non-compression and non-password-removal transformations
    for (const transformation of transformations) {
      if (transformation.type !== 'compress' && transformation.type !== 'remove_password') {
        await this.applyTransformation(pdfDoc, transformation);
      }
    }
    
    // Save the PDF with standard options
    const transformedPdfBuffer = Buffer.from(await pdfDoc.save());
    
    // Cleanup temporary decrypted file if we created one
    if (workingFilePath !== filePath) {
      try {
        fs.unlinkSync(workingFilePath);
      } catch (cleanupError) {
        console.warn('⚠️ Failed to cleanup temporary decrypted file:', cleanupError);
      }
    }
    
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
      case 'merge_pdfs':
        await this.mergePDFs(pdfDoc, rule.mergeFiles || []);
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
      case 'split_pdf':
        await this.splitPDF(pdfDoc, rule.splitBy || 'page_count', rule.pagesPerSplit, rule.splitRanges);
        break;
      case 'add_image':
        await this.addImage(pdfDoc, rule.imageFile || '', rule.position || 'center', rule.imageWidth, rule.imageHeight, rule.opacity || 1, rule.maintainAspectRatio !== false);
        break;
      case 'add_header_footer':
        await this.addHeaderFooter(pdfDoc, rule.headerText, rule.footerText, rule.includePageNumber, rule.includeDate, rule.differentFirstPage, rule.headerImage, rule.footerImage, rule.fontSize || 12, rule.fontColor || '#000000');
        break;
      case 'add_blank_pages':
        await this.addBlankPages(pdfDoc, rule.insertPosition || 'end', rule.targetPageNumber, rule.blankPageCount || 1, rule.blankPageSize || 'same_as_original', rule.customWidth, rule.customHeight);
        break;
      case 'crop_pages':
        await this.cropPages(pdfDoc, rule.pages || [], rule.cropBox, rule.cropPreset, rule.cropMargins);
        break;
      case 'add_background':
        await this.addBackground(pdfDoc, rule.backgroundColor, rule.backgroundImage, rule.backgroundOpacity || 1, rule.backgroundScale || 'fit');
        break;
      case 'add_text_annotation':
        await this.addTextAnnotations(pdfDoc, rule.annotations || []);
        break;
      case 'add_border':
        await this.addBorder(pdfDoc, rule.pages || [], rule.borderColor || '#000000', rule.borderWidth || 2, rule.borderStyle || 'solid', rule.borderRadius || 0, rule.borderMargin || 10);
        break;
      case 'resize_pages':
        await this.resizePages(pdfDoc, rule.pages || [], rule.resizeMode || 'scale', rule.scaleFactor, rule.targetSize, rule.newWidth, rule.newHeight, rule.maintainContentAspectRatio !== false);
        break;
      case 'password_protect':
        await this.passwordProtect(pdfDoc, rule.userPassword, rule.ownerPassword, rule.permissions);
        break;
      case 'remove_password':
        await this.removePassword(pdfDoc, rule.currentPassword, rule.removeUserPassword, rule.removeOwnerPassword);
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

  // New transformation methods

  private static async mergePDFs(targetDoc: PDFDocument, mergeFileIds: string[]): Promise<void> {
    // Note: This implementation would need access to the file storage system
    // For now, this is a placeholder that shows the concept
    console.log(`🔗 Merge operation requested for ${mergeFileIds.length} files`);
    // In a real implementation, you would:
    // 1. Load each PDF from the file IDs
    // 2. Copy pages from each source PDF to the target document
    // 3. Handle page ordering and metadata
  }

  private static async splitPDF(pdfDoc: PDFDocument, splitBy: string, pagesPerSplit?: number, splitRanges?: Array<{ start: number; end: number; name?: string }>): Promise<void> {
    console.log(`✂️ Split operation: ${splitBy}`);
    
    const totalPages = pdfDoc.getPageCount();
    
    switch (splitBy) {
      case 'page_count':
        if (!pagesPerSplit || pagesPerSplit <= 0) {
          throw new Error('Pages per split must be specified and greater than 0');
        }
        // Create multiple documents based on page count
        const numSplits = Math.ceil(totalPages / pagesPerSplit);
        console.log(`📄 Splitting into ${numSplits} documents of ${pagesPerSplit} pages each`);
        break;
        
      case 'page_ranges':
        if (!splitRanges || splitRanges.length === 0) {
          throw new Error('Split ranges must be specified');
        }
        console.log(`📄 Splitting into ${splitRanges.length} custom ranges`);
        break;
        
      case 'individual_pages':
        console.log(`📄 Splitting into ${totalPages} individual pages`);
        break;
    }
    
    // Note: For now, this logs the operation. Full implementation would create separate PDF files
    // and return multiple buffers or file IDs
  }

  private static async addImage(pdfDoc: PDFDocument, imageFile: string, position: string, width?: number, height?: number, opacity: number = 1, maintainAspectRatio: boolean = true): Promise<void> {
    if (!imageFile) {
      throw new Error('Image file is required');
    }

    console.log(`🖼️ Adding image at position: ${position}`);
    
    // In a real implementation, you would:
    // 1. Load the image from file or base64
    // 2. Embed it in the PDF document
    // 3. Calculate proper positioning and sizing
    // 4. Add to specified pages
    
    const pages = pdfDoc.getPages();
    
    for (const page of pages) {
      const { width: pageWidth, height: pageHeight } = page.getSize();
      
      // Calculate position
      let x = pageWidth / 2;
      let y = pageHeight / 2;
      
      switch (position) {
        case 'top-left':
          x = 50;
          y = pageHeight - 50;
          break;
        case 'top-center':
          x = pageWidth / 2;
          y = pageHeight - 50;
          break;
        case 'top-right':
          x = pageWidth - 50;
          y = pageHeight - 50;
          break;
        case 'center-left':
          x = 50;
          y = pageHeight / 2;
          break;
        case 'center-right':
          x = pageWidth - 50;
          y = pageHeight / 2;
          break;
        case 'bottom-left':
          x = 50;
          y = 50;
          break;
        case 'bottom-center':
          x = pageWidth / 2;
          y = 50;
          break;
        case 'bottom-right':
          x = pageWidth - 50;
          y = 50;
          break;
        default: // center
          x = pageWidth / 2;
          y = pageHeight / 2;
      }
      
      // Placeholder: In real implementation, you would draw the actual image
      console.log(`📍 Image would be placed at (${x}, ${y}) with size ${width}x${height}`);
    }
  }

  private static async addHeaderFooter(pdfDoc: PDFDocument, headerText?: string, footerText?: string, includePageNumber?: boolean, includeDate?: boolean, differentFirstPage?: boolean, headerImage?: string, footerImage?: string, fontSize: number = 12, fontColor: string = '#000000'): Promise<void> {
    const helveticaFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const pages = pdfDoc.getPages();
    const totalPages = pages.length;
    
    console.log(`📋 Adding headers/footers to ${totalPages} pages`);
    
    pages.forEach((page, index) => {
      const { width, height } = page.getSize();
      const pageNumber = index + 1;
      const isFirstPage = index === 0;
      
      // Skip first page if differentFirstPage is true
      if (differentFirstPage && isFirstPage) {
        return;
      }
      
      // Add header
      if (headerText) {
        let headerContent = headerText;
        
        if (includePageNumber) {
          headerContent += ` - Page ${pageNumber}`;
        }
        
        if (includeDate) {
          headerContent += ` - ${new Date().toLocaleDateString()}`;
        }
        
        page.drawText(headerContent, {
          x: 50,
          y: height - 30,
          size: fontSize,
          font: helveticaFont,
          color: rgb(0, 0, 0)
        });
      }
      
      // Add footer
      if (footerText) {
        let footerContent = footerText;
        
        if (includePageNumber && !headerText) {
          footerContent += ` - Page ${pageNumber} of ${totalPages}`;
        }
        
        page.drawText(footerContent, {
          x: 50,
          y: 30,
          size: fontSize,
          font: helveticaFont,
          color: rgb(0, 0, 0)
        });
      }
    });
  }

  private static async addBlankPages(pdfDoc: PDFDocument, insertPosition: string, targetPageNumber?: number, blankPageCount: number = 1, blankPageSize: string = 'same_as_original', customWidth?: number, customHeight?: number): Promise<void> {
    console.log(`📄 Adding ${blankPageCount} blank page(s) at position: ${insertPosition}`);
    
    // Get dimensions for new pages
    let pageWidth = 612; // Default to Letter size width
    let pageHeight = 792; // Default to Letter size height
    
    if (blankPageSize === 'same_as_original' && pdfDoc.getPageCount() > 0) {
      const firstPage = pdfDoc.getPage(0);
      const { width, height } = firstPage.getSize();
      pageWidth = width;
      pageHeight = height;
    } else if (blankPageSize === 'custom' && customWidth && customHeight) {
      pageWidth = customWidth;
      pageHeight = customHeight;
    } else {
      // Standard sizes
      switch (blankPageSize) {
        case 'a4':
          pageWidth = 595;
          pageHeight = 842;
          break;
        case 'letter':
          pageWidth = 612;
          pageHeight = 792;
          break;
        case 'legal':
          pageWidth = 612;
          pageHeight = 1008;
          break;
      }
    }
    
    // Create blank pages
    for (let i = 0; i < blankPageCount; i++) {
      const blankPage = pdfDoc.addPage([pageWidth, pageHeight]);
      
      // Position the page based on insertPosition
      switch (insertPosition) {
        case 'beginning':
          // Move to beginning (would need to rearrange pages)
          break;
        case 'after_page':
        case 'before_page':
          // Insert at specific position (would need page manipulation)
          break;
        case 'end':
        default:
          // Page is already added at the end
          break;
      }
    }
  }

  private static async cropPages(pdfDoc: PDFDocument, pages: number[], cropBox?: { x: number; y: number; width: number; height: number }, cropPreset?: string, cropMargins?: { top: number; bottom: number; left: number; right: number }): Promise<void> {
    console.log(`✂️ Cropping ${pages.length} pages`);
    
    const pageCount = pdfDoc.getPageCount();
    const targetPages = pages.length > 0 ? pages : Array.from({ length: pageCount }, (_, i) => i + 1);
    
    for (const pageIndex of targetPages) {
      const zeroBasedIndex = pageIndex - 1;
      if (zeroBasedIndex >= 0 && zeroBasedIndex < pageCount) {
        const page = pdfDoc.getPage(zeroBasedIndex);
        const { width, height } = page.getSize();
        
        let cropX = 0, cropY = 0, cropWidth = width, cropHeight = height;
        
        if (cropBox) {
          cropX = cropBox.x;
          cropY = cropBox.y;
          cropWidth = cropBox.width;
          cropHeight = cropBox.height;
        } else if (cropMargins) {
          cropX = cropMargins.left;
          cropY = cropMargins.bottom;
          cropWidth = width - cropMargins.left - cropMargins.right;
          cropHeight = height - cropMargins.top - cropMargins.bottom;
        } else if (cropPreset) {
          // Apply preset crop dimensions
          switch (cropPreset) {
            case 'a4':
              cropWidth = Math.min(595, width);
              cropHeight = Math.min(842, height);
              break;
            case 'letter':
              cropWidth = Math.min(612, width);
              cropHeight = Math.min(792, height);
              break;
            case 'square':
              const minDimension = Math.min(width, height);
              cropWidth = minDimension;
              cropHeight = minDimension;
              cropX = (width - minDimension) / 2;
              cropY = (height - minDimension) / 2;
              break;
          }
        }
        
        // Apply crop box
        page.setCropBox(cropX, cropY, cropWidth, cropHeight);
      }
    }
  }

  private static async addBackground(pdfDoc: PDFDocument, backgroundColor?: string, backgroundImage?: string, backgroundOpacity: number = 1, backgroundScale: string = 'fit'): Promise<void> {
    const pages = pdfDoc.getPages();
    
    console.log(`🎨 Adding background to ${pages.length} pages`);
    
    for (const page of pages) {
      const { width, height } = page.getSize();
      
      if (backgroundColor) {
        // Parse color from hex string
        const color = this.parseColor(backgroundColor);
        
        page.drawRectangle({
          x: 0,
          y: 0,
          width,
          height,
          color,
          opacity: backgroundOpacity
        });
      }
      
      if (backgroundImage) {
        // In a real implementation, you would:
        // 1. Load and embed the background image
        // 2. Scale it according to backgroundScale
        // 3. Draw it on the page
        console.log(`🖼️ Background image would be applied with scale: ${backgroundScale}`);
      }
    }
  }

  private static async addTextAnnotations(pdfDoc: PDFDocument, annotations: Array<{ id: string; type: string; content: string; x: number; y: number; width?: number; height?: number; color?: string; fontSize?: number }>): Promise<void> {
    const helveticaFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const pages = pdfDoc.getPages();
    
    console.log(`📝 Adding ${annotations.length} text annotations`);
    
    // For simplicity, add annotations to all pages
    // In a real implementation, you'd specify which page each annotation belongs to
    for (const page of pages) {
      for (const annotation of annotations) {
        const color = this.parseColor(annotation.color || '#000000');
        const fontSize = annotation.fontSize || 12;
        
        switch (annotation.type) {
          case 'text':
            page.drawText(annotation.content, {
              x: annotation.x,
              y: annotation.y,
              size: fontSize,
              font: helveticaFont,
              color
            });
            break;
            
          case 'sticky_note':
            // Draw a small rectangle for the sticky note
            page.drawRectangle({
              x: annotation.x,
              y: annotation.y,
              width: annotation.width || 20,
              height: annotation.height || 20,
              color: rgb(1, 1, 0), // Yellow
              opacity: 0.7
            });
            break;
            
          case 'highlight':
            // Draw a semi-transparent rectangle
            page.drawRectangle({
              x: annotation.x,
              y: annotation.y,
              width: annotation.width || 100,
              height: annotation.height || 20,
              color: rgb(1, 1, 0), // Yellow highlight
              opacity: 0.3
            });
            break;
        }
      }
    }
  }

  private static async addBorder(pdfDoc: PDFDocument, pages: number[], borderColor: string, borderWidth: number, borderStyle: string, borderRadius: number, borderMargin: number): Promise<void> {
    console.log(`🖼️ Adding borders to ${pages.length} pages`);
    
    const pageCount = pdfDoc.getPageCount();
    const targetPages = pages.length > 0 ? pages : Array.from({ length: pageCount }, (_, i) => i + 1);
    const color = this.parseColor(borderColor);
    
    for (const pageIndex of targetPages) {
      const zeroBasedIndex = pageIndex - 1;
      if (zeroBasedIndex >= 0 && zeroBasedIndex < pageCount) {
        const page = pdfDoc.getPage(zeroBasedIndex);
        const { width, height } = page.getSize();
        
        // Draw border rectangle
        page.drawRectangle({
          x: borderMargin,
          y: borderMargin,
          width: width - (borderMargin * 2),
          height: height - (borderMargin * 2),
          borderColor: color,
          borderWidth,
          color: undefined // No fill, just border
        });
      }
    }
  }

  private static async resizePages(pdfDoc: PDFDocument, pages: number[], resizeMode: string, scaleFactor?: number, targetSize?: string, newWidth?: number, newHeight?: number, maintainContentAspectRatio: boolean = true): Promise<void> {
    console.log(`📏 Resizing ${pages.length} pages using mode: ${resizeMode}`);
    
    const pageCount = pdfDoc.getPageCount();
    const targetPages = pages.length > 0 ? pages : Array.from({ length: pageCount }, (_, i) => i + 1);
    
    for (const pageIndex of targetPages) {
      const zeroBasedIndex = pageIndex - 1;
      if (zeroBasedIndex >= 0 && zeroBasedIndex < pageCount) {
        const page = pdfDoc.getPage(zeroBasedIndex);
        const { width, height } = page.getSize();
        
        let newPageWidth = width;
        let newPageHeight = height;
        
        switch (resizeMode) {
          case 'scale':
            if (scaleFactor) {
              newPageWidth = width * scaleFactor;
              newPageHeight = height * scaleFactor;
            }
            break;
            
          case 'fit_to_size':
            if (targetSize) {
              switch (targetSize) {
                case 'a4':
                  newPageWidth = 595;
                  newPageHeight = 842;
                  break;
                case 'letter':
                  newPageWidth = 612;
                  newPageHeight = 792;
                  break;
                case 'legal':
                  newPageWidth = 612;
                  newPageHeight = 1008;
                  break;
              }
            }
            break;
            
          case 'custom_dimensions':
            if (newWidth && newHeight) {
              newPageWidth = newWidth;
              newPageHeight = newHeight;
            }
            break;
        }
        
        // Apply new dimensions
        page.setSize(newPageWidth, newPageHeight);
      }
    }
  }

  private static async passwordProtect(pdfDoc: PDFDocument, userPassword?: string, ownerPassword?: string, permissions?: any): Promise<void> {
    console.log(`🔒 Adding password protection`);
    
    // Note: pdf-lib has limited encryption support
    // In a production environment, you might need to use external libraries
    // or post-process with tools like qpdf for full encryption support
    
    if (userPassword || ownerPassword) {
      console.log(`🔐 Passwords would be applied: user=${!!userPassword}, owner=${!!ownerPassword}`);
    }
    
    if (permissions) {
      console.log(`🛡️ Permissions would be applied:`, permissions);
    }
    
    // Placeholder implementation - actual encryption would require external tools
  }

  private static async handlePasswordRemoval(filePath: string, rule: TransformationRule): Promise<string> {
    if (!rule.currentPassword || (!rule.removeUserPassword && !rule.removeOwnerPassword)) {
      throw new Error('Current password and at least one removal option (user or owner password) must be specified');
    }
    
    const tempDir = path.join(__dirname, '../../temp');
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }

    const outputFile = path.join(tempDir, `decrypted_${Date.now()}.pdf`);

    try {
      console.log(`🔐 Using qpdf to remove password protection from original file`);
      
      // Build qpdf command to decrypt the original PDF
      const qpdfCommand = [
        'qpdf',
        `--password=${rule.currentPassword}`,
        '--decrypt',
        filePath,
        outputFile
      ].join(' ');

      // Execute qpdf command
      const { stdout, stderr } = await execAsync(qpdfCommand);
      
      if (stderr && !stderr.includes('processing')) {
        console.warn(`⚠️ qpdf warning: ${stderr}`);
      }

      // Check if output file was created
      if (!fs.existsSync(outputFile)) {
        throw new Error('Password removal failed - output file not created. Please check if the password is correct.');
      }

      console.log(`✅ Password protection removed successfully`);
      
      if (rule.removeUserPassword && rule.removeOwnerPassword) {
        console.log(`🔐 Both user and owner passwords removed`);
      } else if (rule.removeUserPassword) {
        console.log(`🔐 User password removed`);
      } else if (rule.removeOwnerPassword) {
        console.log(`🔐 Owner password removed`);
      }

      return outputFile; // Return path to decrypted file

    } catch (error) {
      console.error('🚫 Password removal failed:', error);
      
      // Cleanup on error
      try {
        if (fs.existsSync(outputFile)) fs.unlinkSync(outputFile);
      } catch (cleanupError) {
        console.warn('⚠️ Failed to cleanup temporary file on error:', cleanupError);
      }
      
      if (error instanceof Error) {
        if (error.message.includes('invalid password')) {
          throw new Error('Invalid password provided. Please check the current password and try again.');
        } else if (error.message.includes('not encrypted') || error.message.includes('no password')) {
          throw new Error('The PDF does not appear to be password protected.');
        } else {
          throw new Error(`Password removal failed: ${error.message}`);
        }
      } else {
        throw new Error('Unknown error occurred during password removal');
      }
    }
  }

  private static async removePassword(pdfDoc: PDFDocument, currentPassword?: string, removeUserPassword?: boolean, removeOwnerPassword?: boolean): Promise<void> {
    // This method is now handled by handlePasswordRemoval before pdf-lib processing
    // We keep this method for API compatibility but it doesn't need to do anything
    console.log(`🔒 Password removal already handled before pdf-lib processing`);
  }

  // Helper method to parse color strings
  private static parseColor(colorString: string): ReturnType<typeof rgb> {
    // Remove # if present
    const hex = colorString.replace('#', '');
    
    // Convert hex to RGB values (0-1 range)
    const r = parseInt(hex.substr(0, 2), 16) / 255;
    const g = parseInt(hex.substr(2, 2), 16) / 255;
    const b = parseInt(hex.substr(4, 2), 16) / 255;
    
    return rgb(r, g, b);
  }
} 