const request = require('supertest');
const fs = require('fs');
const path = require('path');
const PDFParser = require('pdf-parse');

// Test configuration
const SERVER_URL = 'http://localhost:3001';
const TEST_TIMEOUT = 45000;

describe('Advanced PDF Transformation Tests', () => {
  let testPDF;
  let multiPagePDF;

  beforeAll(() => {
    console.log('🚀 Setting up advanced transformation tests...');
    testPDF = createTestPDF();
    multiPagePDF = createMultiPagePDF();
  });

  describe('🗑️ Page Removal Transformations', () => {
    test('should remove specific pages from PDF', async () => {
      const { uploadId, transformedData } = await performTransformation([
        {
          type: 'remove_pages',
          pages: [2],
          target: 'pages'
        }
      ], multiPagePDF);

      expect(transformedData.length).toBeGreaterThan(0);
      
      // Verify page was removed
      const pdfData = await PDFParser(transformedData);
      expect(pdfData.numpages).toBe(2); // Should have 2 pages left (originally 3)
      
      console.log('✅ Page removal working');
    }, TEST_TIMEOUT);
  });

  describe('🔄 Page Rotation Transformations', () => {
    test('should rotate pages 90 degrees', async () => {
      const { uploadId, transformedData } = await performTransformation([
        {
          type: 'rotate_pages',
          angle: 90,
          pages: [1],
          target: 'pages'
        }
      ], multiPagePDF);

      expect(transformedData.length).toBeGreaterThan(0);
      
      // Verify PDF is still valid after rotation
      const pdfData = await PDFParser(transformedData);
      expect(pdfData.numpages).toBe(3);
      
      console.log('✅ Page rotation (90°) working');
    }, TEST_TIMEOUT);

    test('should rotate pages 180 degrees', async () => {
      const { uploadId, transformedData } = await performTransformation([
        {
          type: 'rotate_pages',
          angle: 180,
          target: 'all'
        }
      ], multiPagePDF);

      expect(transformedData.length).toBeGreaterThan(0);
      
      const pdfData = await PDFParser(transformedData);
      expect(pdfData.numpages).toBe(3);
      
      console.log('✅ Page rotation (180°) working');
    }, TEST_TIMEOUT);

    test('should rotate pages 270 degrees', async () => {
      const { uploadId, transformedData } = await performTransformation([
        {
          type: 'rotate_pages',
          angle: 270,
          target: 'all'
        }
      ], multiPagePDF);

      expect(transformedData.length).toBeGreaterThan(0);
      
      const pdfData = await PDFParser(transformedData);
      expect(pdfData.numpages).toBe(3);
      
      console.log('✅ Page rotation (270°) working');
    }, TEST_TIMEOUT);
  });

  describe('🔢 Page Number Addition', () => {
    test('should add page numbers at bottom center', async () => {
      const { uploadId, transformedData } = await performTransformation([
        {
          type: 'add_page_numbers',
          position: 'bottom-center',
          fontSize: 12,
          target: 'all'
        }
      ], multiPagePDF);

      expect(transformedData.length).toBeGreaterThan(0);
      
      // Page numbers add content, so PDF should be slightly larger
      expect(transformedData.length).toBeGreaterThanOrEqual(multiPagePDF.length);
      
      const pdfData = await PDFParser(transformedData);
      expect(pdfData.numpages).toBe(3);
      
      console.log('✅ Page numbers addition (bottom-center) working');
    }, TEST_TIMEOUT);

    test('should add page numbers at different positions', async () => {
      const positions = ['top-left', 'top-center', 'top-right', 'bottom-left', 'bottom-right'];
      
      for (const position of positions) {
        const { uploadId, transformedData } = await performTransformation([
          {
            type: 'add_page_numbers',
            position: position,
            fontSize: 10,
            target: 'all'
          }
        ], multiPagePDF);

        expect(transformedData.length).toBeGreaterThan(0);
        console.log(`✅ Page numbers at ${position} working`);
      }
    }, TEST_TIMEOUT * 2);
  });

  describe('📋 Page Rearrangement', () => {
    test('should rearrange pages in new order', async () => {
      const { uploadId, transformedData } = await performTransformation([
        {
          type: 'rearrange_pages',
          pageOrder: [3, 1, 2],
          target: 'all'
        }
      ], multiPagePDF);

      expect(transformedData.length).toBeGreaterThan(0);
      
      // Should still have same number of pages
      const pdfData = await PDFParser(transformedData);
      expect(pdfData.numpages).toBe(3);
      
      console.log('✅ Page rearrangement working');
    }, TEST_TIMEOUT);
  });

  describe('✂️ PDF Splitting', () => {
    test('should split PDF by page count', async () => {
      const { uploadId, transformedData } = await performTransformation([
        {
          type: 'split_pdf',
          splitBy: 'page_count',
          pagesPerSplit: 1,
          target: 'all'
        }
      ], multiPagePDF);

      expect(transformedData.length).toBeGreaterThan(0);
      
      // After splitting by single pages, we should get the first page
      const pdfData = await PDFParser(transformedData);
      expect(pdfData.numpages).toBeGreaterThanOrEqual(1);
      
      console.log('✅ PDF splitting by page count working');
    }, TEST_TIMEOUT);

    test('should split PDF by page ranges', async () => {
      const { uploadId, transformedData } = await performTransformation([
        {
          type: 'split_pdf',
          splitBy: 'page_ranges',
          splitRanges: [
            { start: 1, end: 2, name: 'first_part' }
          ],
          target: 'all'
        }
      ], multiPagePDF);

      expect(transformedData.length).toBeGreaterThan(0);
      
      const pdfData = await PDFParser(transformedData);
      expect(pdfData.numpages).toBe(2);
      
      console.log('✅ PDF splitting by ranges working');
    }, TEST_TIMEOUT);
  });

  describe('🖼️ Image Addition', () => {
    test('should add image to PDF', async () => {
      // Note: This test assumes a basic image file path or base64 data
      const { uploadId, transformedData } = await performTransformation([
        {
          type: 'add_image',
          imageFile: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
          position: 'center',
          imageWidth: 100,
          imageHeight: 100,
          opacity: 1,
          target: 'all'
        }
      ], testPDF);

      expect(transformedData.length).toBeGreaterThan(0);
      
      // Adding image should increase PDF size
      expect(transformedData.length).toBeGreaterThan(testPDF.length);
      
      console.log('✅ Image addition working');
    }, TEST_TIMEOUT);
  });

  describe('📄 Header/Footer Addition', () => {
    test('should add header text', async () => {
      const { uploadId, transformedData } = await performTransformation([
        {
          type: 'add_header_footer',
          headerText: 'Document Header',
          includePageNumber: true,
          includeDate: false,
          target: 'all'
        }
      ], multiPagePDF);

      expect(transformedData.length).toBeGreaterThan(0);
      
      // Header should add content
      expect(transformedData.length).toBeGreaterThanOrEqual(multiPagePDF.length);
      
      console.log('✅ Header addition working');
    }, TEST_TIMEOUT);

    test('should add footer text', async () => {
      const { uploadId, transformedData } = await performTransformation([
        {
          type: 'add_header_footer',
          footerText: 'Document Footer',
          includePageNumber: true,
          includeDate: true,
          target: 'all'
        }
      ], multiPagePDF);

      expect(transformedData.length).toBeGreaterThan(0);
      
      // Footer should add content
      expect(transformedData.length).toBeGreaterThanOrEqual(multiPagePDF.length);
      
      console.log('✅ Footer addition working');
    }, TEST_TIMEOUT);

    test('should add both header and footer', async () => {
      const { uploadId, transformedData } = await performTransformation([
        {
          type: 'add_header_footer',
          headerText: 'Top Header',
          footerText: 'Bottom Footer',
          includePageNumber: true,
          includeDate: true,
          differentFirstPage: true,
          target: 'all'
        }
      ], multiPagePDF);

      expect(transformedData.length).toBeGreaterThan(0);
      
      // Both header and footer should significantly increase size
      expect(transformedData.length).toBeGreaterThan(multiPagePDF.length);
      
      console.log('✅ Header + Footer addition working');
    }, TEST_TIMEOUT);
  });

  describe('📝 Blank Page Addition', () => {
    test('should add blank pages at beginning', async () => {
      const { uploadId, transformedData } = await performTransformation([
        {
          type: 'add_blank_pages',
          insertPosition: 'beginning',
          blankPageCount: 2,
          blankPageSize: 'a4',
          target: 'all'
        }
      ], multiPagePDF);

      expect(transformedData.length).toBeGreaterThan(0);
      
      // Should have 2 more pages
      const pdfData = await PDFParser(transformedData);
      expect(pdfData.numpages).toBe(5); // 3 original + 2 blank
      
      console.log('✅ Blank page addition (beginning) working');
    }, TEST_TIMEOUT);

    test('should add blank pages at end', async () => {
      const { uploadId, transformedData } = await performTransformation([
        {
          type: 'add_blank_pages',
          insertPosition: 'end',
          blankPageCount: 1,
          blankPageSize: 'letter',
          target: 'all'
        }
      ], multiPagePDF);

      expect(transformedData.length).toBeGreaterThan(0);
      
      // Should have 1 more page
      const pdfData = await PDFParser(transformedData);
      expect(pdfData.numpages).toBe(4); // 3 original + 1 blank
      
      console.log('✅ Blank page addition (end) working');
    }, TEST_TIMEOUT);

    test('should add blank pages after specific page', async () => {
      const { uploadId, transformedData } = await performTransformation([
        {
          type: 'add_blank_pages',
          insertPosition: 'after_page',
          targetPageNumber: 1,
          blankPageCount: 1,
          blankPageSize: 'same_as_original',
          target: 'all'
        }
      ], multiPagePDF);

      expect(transformedData.length).toBeGreaterThan(0);
      
      // Should have 1 more page
      const pdfData = await PDFParser(transformedData);
      expect(pdfData.numpages).toBe(4); // 3 original + 1 blank
      
      console.log('✅ Blank page addition (after page) working');
    }, TEST_TIMEOUT);
  });

  describe('✂️ Page Cropping', () => {
    test('should crop pages with specific dimensions', async () => {
      const { uploadId, transformedData } = await performTransformation([
        {
          type: 'crop_pages',
          cropBox: {
            x: 50,
            y: 50,
            width: 400,
            height: 600
          },
          target: 'all'
        }
      ], multiPagePDF);

      expect(transformedData.length).toBeGreaterThan(0);
      
      // Cropping might reduce file size
      const pdfData = await PDFParser(transformedData);
      expect(pdfData.numpages).toBe(3);
      
      console.log('✅ Page cropping with custom dimensions working');
    }, TEST_TIMEOUT);

    test('should crop pages with preset', async () => {
      const { uploadId, transformedData } = await performTransformation([
        {
          type: 'crop_pages',
          cropPreset: 'a4',
          target: 'all'
        }
      ], multiPagePDF);

      expect(transformedData.length).toBeGreaterThan(0);
      
      const pdfData = await PDFParser(transformedData);
      expect(pdfData.numpages).toBe(3);
      
      console.log('✅ Page cropping with A4 preset working');
    }, TEST_TIMEOUT);

    test('should crop pages with margins', async () => {
      const { uploadId, transformedData } = await performTransformation([
        {
          type: 'crop_pages',
          cropMargins: {
            top: 20,
            bottom: 20,
            left: 15,
            right: 15
          },
          target: 'all'
        }
      ], multiPagePDF);

      expect(transformedData.length).toBeGreaterThan(0);
      
      const pdfData = await PDFParser(transformedData);
      expect(pdfData.numpages).toBe(3);
      
      console.log('✅ Page cropping with margins working');
    }, TEST_TIMEOUT);
  });

  describe('🎨 Background Addition', () => {
    test('should add background color', async () => {
      const { uploadId, transformedData } = await performTransformation([
        {
          type: 'add_background',
          backgroundColor: '#f0f0f0',
          backgroundOpacity: 0.5,
          target: 'all'
        }
      ], multiPagePDF);

      expect(transformedData.length).toBeGreaterThan(0);
      
      // Background should add content
      expect(transformedData.length).toBeGreaterThanOrEqual(multiPagePDF.length);
      
      console.log('✅ Background color addition working');
    }, TEST_TIMEOUT);

    test('should add background image', async () => {
      const { uploadId, transformedData } = await performTransformation([
        {
          type: 'add_background',
          backgroundImage: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
          backgroundOpacity: 0.3,
          backgroundScale: 'fit',
          target: 'all'
        }
      ], multiPagePDF);

      expect(transformedData.length).toBeGreaterThan(0);
      
      // Background image should add content
      expect(transformedData.length).toBeGreaterThan(multiPagePDF.length);
      
      console.log('✅ Background image addition working');
    }, TEST_TIMEOUT);
  });

  describe('📝 Text Annotations', () => {
    test('should add text annotations', async () => {
      const { uploadId, transformedData } = await performTransformation([
        {
          type: 'text_annotation',
          annotations: [
            {
              id: 'note1',
              type: 'text',
              content: 'This is a text annotation',
              x: 100,
              y: 100,
              width: 200,
              height: 50,
              color: '#ff0000',
              fontSize: 12
            }
          ],
          target: 'all'
        }
      ], multiPagePDF);

      expect(transformedData.length).toBeGreaterThan(0);
      
      // Annotations should add content
      expect(transformedData.length).toBeGreaterThan(multiPagePDF.length);
      
      console.log('✅ Text annotations working');
    }, TEST_TIMEOUT);

    test('should add sticky note annotations', async () => {
      const { uploadId, transformedData } = await performTransformation([
        {
          type: 'text_annotation',
          annotations: [
            {
              id: 'sticky1',
              type: 'sticky_note',
              content: 'Important note here',
              x: 200,
              y: 200,
              color: '#ffff00'
            }
          ],
          target: 'all'
        }
      ], multiPagePDF);

      expect(transformedData.length).toBeGreaterThan(0);
      
      console.log('✅ Sticky note annotations working');
    }, TEST_TIMEOUT);

    test('should add highlight annotations', async () => {
      const { uploadId, transformedData } = await performTransformation([
        {
          type: 'text_annotation',
          annotations: [
            {
              id: 'highlight1',
              type: 'highlight',
              content: 'Highlighted text',
              x: 150,
              y: 150,
              width: 100,
              height: 20,
              color: '#00ff00'
            }
          ],
          target: 'all'
        }
      ], multiPagePDF);

      expect(transformedData.length).toBeGreaterThan(0);
      
      console.log('✅ Highlight annotations working');
    }, TEST_TIMEOUT);
  });

  describe('🔲 Border Addition', () => {
    test('should add solid border', async () => {
      const { uploadId, transformedData } = await performTransformation([
        {
          type: 'add_border',
          borderColor: '#000000',
          borderWidth: 2,
          borderStyle: 'solid',
          borderMargin: 10,
          target: 'all'
        }
      ], multiPagePDF);

      expect(transformedData.length).toBeGreaterThan(0);
      
      // Border should add content
      expect(transformedData.length).toBeGreaterThanOrEqual(multiPagePDF.length);
      
      console.log('✅ Solid border addition working');
    }, TEST_TIMEOUT);

    test('should add dashed border', async () => {
      const { uploadId, transformedData } = await performTransformation([
        {
          type: 'add_border',
          borderColor: '#ff0000',
          borderWidth: 3,
          borderStyle: 'dashed',
          borderRadius: 5,
          borderMargin: 15,
          target: 'all'
        }
      ], multiPagePDF);

      expect(transformedData.length).toBeGreaterThan(0);
      
      console.log('✅ Dashed border addition working');
    }, TEST_TIMEOUT);

    test('should add dotted border', async () => {
      const { uploadId, transformedData } = await performTransformation([
        {
          type: 'add_border',
          borderColor: '#0000ff',
          borderWidth: 1,
          borderStyle: 'dotted',
          borderRadius: 10,
          target: 'all'
        }
      ], multiPagePDF);

      expect(transformedData.length).toBeGreaterThan(0);
      
      console.log('✅ Dotted border addition working');
    }, TEST_TIMEOUT);
  });

  describe('📏 Page Resizing', () => {
    test('should resize pages by scale factor', async () => {
      const { uploadId, transformedData } = await performTransformation([
        {
          type: 'resize_pages',
          resizeMode: 'scale',
          scaleFactor: 1.5,
          target: 'all'
        }
      ], multiPagePDF);

      expect(transformedData.length).toBeGreaterThan(0);
      
      const pdfData = await PDFParser(transformedData);
      expect(pdfData.numpages).toBe(3);
      
      console.log('✅ Page resizing by scale factor working');
    }, TEST_TIMEOUT);

    test('should resize pages to fit target size', async () => {
      const { uploadId, transformedData } = await performTransformation([
        {
          type: 'resize_pages',
          resizeMode: 'fit_to_size',
          targetSize: 'a4',
          target: 'all'
        }
      ], multiPagePDF);

      expect(transformedData.length).toBeGreaterThan(0);
      
      const pdfData = await PDFParser(transformedData);
      expect(pdfData.numpages).toBe(3);
      
      console.log('✅ Page resizing to A4 working');
    }, TEST_TIMEOUT);

    test('should resize pages to custom dimensions', async () => {
      const { uploadId, transformedData } = await performTransformation([
        {
          type: 'resize_pages',
          resizeMode: 'custom_dimensions',
          newWidth: 500,
          newHeight: 700,
          target: 'all'
        }
      ], multiPagePDF);

      expect(transformedData.length).toBeGreaterThan(0);
      
      const pdfData = await PDFParser(transformedData);
      expect(pdfData.numpages).toBe(3);
      
      console.log('✅ Page resizing to custom dimensions working');
    }, TEST_TIMEOUT);
  });

  describe('🔒 Password Protection', () => {
    test('should add password protection', async () => {
      const { uploadId, transformedData } = await performTransformation([
        {
          type: 'password_protect',
          userPassword: 'user123',
          ownerPassword: 'owner456',
          permissions: {
            printing: false,
            copying: false,
            editing: false,
            annotations: true
          },
          target: 'all'
        }
      ], multiPagePDF);

      expect(transformedData.length).toBeGreaterThan(0);
      
      // Password protection should modify the PDF structure
      expect(transformedData.length).toBeGreaterThanOrEqual(multiPagePDF.length);
      
      console.log('✅ Password protection working');
    }, TEST_TIMEOUT);

    test('should remove password protection', async () => {
      // First, create a password-protected PDF
      const { uploadId: protectedUploadId, transformedData: protectedData } = await performTransformation([
        {
          type: 'password_protect',
          userPassword: 'test123',
          target: 'all'
        }
      ], testPDF);

      // Then upload the protected PDF and remove password
      const uploadResponse = await request(SERVER_URL)
        .post('/api/upload')
        .attach('pdf', protectedData, 'protected.pdf')
        .expect(200);

      const fileId = uploadResponse.body.data.fileId;

      const { uploadId, transformedData } = await performTransformationWithFileId([
        {
          type: 'remove_password',
          password: 'test123',
          target: 'all'
        }
      ], fileId);

      expect(transformedData.length).toBeGreaterThan(0);
      
      console.log('✅ Password removal working');
    }, TEST_TIMEOUT);
  });

  describe('🔄 Complex Multi-Step Transformations', () => {
    test('should apply comprehensive transformation chain', async () => {
      const { uploadId, transformedData } = await performTransformation([
        {
          type: 'add_page_numbers',
          position: 'bottom-center',
          fontSize: 10,
          target: 'all'
        },
        {
          type: 'add_watermark',
          text: 'CONFIDENTIAL',
          position: 'center',
          opacity: 0.3,
          target: 'all'
        },
        {
          type: 'add_border',
          borderColor: '#000000',
          borderWidth: 1,
          borderStyle: 'solid',
          target: 'all'
        },
        {
          type: 'compress',
          level: 'medium',
          target: 'all'
        }
      ], multiPagePDF);

      expect(transformedData.length).toBeGreaterThan(0);
      
      // Verify complex transformation chain worked
      const pdfData = await PDFParser(transformedData);
      expect(pdfData.numpages).toBe(3);
      
      console.log('✅ Complex transformation chain completed successfully');
    }, TEST_TIMEOUT);
  });
});

// Helper functions
async function uploadFile(pdfBuffer) {
  const response = await request(SERVER_URL)
    .post('/api/upload')
    .attach('pdf', pdfBuffer, 'test.pdf')
    .expect(200);
  
  return response;
}

async function performTransformation(transformations, pdfBuffer) {
  // Upload file
  const uploadResponse = await uploadFile(pdfBuffer);
  const fileId = uploadResponse.body.data.fileId;
  
  return await performTransformationWithFileId(transformations, fileId);
}

async function performTransformationWithFileId(transformations, fileId) {
  // Apply transformations
  const transformResponse = await request(SERVER_URL)
    .post('/api/transform')
    .send({
      fileId: fileId,
      transformations: transformations
    })
    .expect(200);
  
  // Download transformed PDF
  const downloadResponse = await request(SERVER_URL)
    .get(`/api/download/${transformResponse.body.downloadId}`)
    .expect(200);
  
  return {
    uploadId: fileId,
    downloadId: transformResponse.body.downloadId,
    transformedData: downloadResponse.body
  };
}

function createTestPDF() {
  return Buffer.from(`%PDF-1.4
1 0 obj
<<
/Type /Catalog
/Pages 2 0 R
>>
endobj
2 0 obj
<<
/Type /Pages
/Kids [3 0 R]
/Count 1
>>
endobj
3 0 obj
<<
/Type /Page
/Parent 2 0 R
/MediaBox [0 0 612 792]
/Resources <<
/Font <<
/F1 4 0 R
>>
>>
/Contents 5 0 R
>>
endobj
4 0 obj
<<
/Type /Font
/Subtype /Type1
/BaseFont /Helvetica
>>
endobj
5 0 obj
<<
/Length 44
>>
stream
BT
/F1 12 Tf
100 700 Td
(Test PDF) Tj
ET
endstream
endobj
xref
0 6
0000000000 65535 f 
0000000009 00000 n 
0000000058 00000 n 
0000000115 00000 n 
0000000281 00000 n 
0000000348 00000 n 
trailer
<<
/Size 6
/Root 1 0 R
>>
startxref
439
%%EOF`);
}

function createMultiPagePDF() {
  return Buffer.from(`%PDF-1.4
1 0 obj
<<
/Type /Catalog
/Pages 2 0 R
>>
endobj
2 0 obj
<<
/Type /Pages
/Kids [3 0 R 6 0 R 8 0 R]
/Count 3
>>
endobj
3 0 obj
<<
/Type /Page
/Parent 2 0 R
/MediaBox [0 0 612 792]
/Resources <<
/Font <<
/F1 4 0 R
>>
>>
/Contents 5 0 R
>>
endobj
4 0 obj
<<
/Type /Font
/Subtype /Type1
/BaseFont /Helvetica
>>
endobj
5 0 obj
<<
/Length 50
>>
stream
BT
/F1 12 Tf
100 700 Td
(Page 1 Content) Tj
ET
endstream
endobj
6 0 obj
<<
/Type /Page
/Parent 2 0 R
/MediaBox [0 0 612 792]
/Resources <<
/Font <<
/F1 4 0 R
>>
>>
/Contents 7 0 R
>>
endobj
7 0 obj
<<
/Length 50
>>
stream
BT
/F1 12 Tf
100 700 Td
(Page 2 Content) Tj
ET
endstream
endobj
8 0 obj
<<
/Type /Page
/Parent 2 0 R
/MediaBox [0 0 612 792]
/Resources <<
/Font <<
/F1 4 0 R
>>
>>
/Contents 9 0 R
>>
endobj
9 0 obj
<<
/Length 50
>>
stream
BT
/F1 12 Tf
100 700 Td
(Page 3 Content) Tj
ET
endstream
endobj
xref
0 10
0000000000 65535 f 
0000000009 00000 n 
0000000058 00000 n 
0000000125 00000 n 
0000000291 00000 n 
0000000358 00000 n 
0000000459 00000 n 
0000000625 00000 n 
0000000726 00000 n 
0000000892 00000 n 
trailer
<<
/Size 10
/Root 1 0 R
>>
startxref
993
%%EOF`);
}
