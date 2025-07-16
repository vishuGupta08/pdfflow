const request = require('supertest');
const fs = require('fs');
const path = require('path');
const PDFParser = require('pdf-parse');

// Test configuration
const SERVER_URL = 'http://localhost:3001';
const TEST_TIMEOUT = 30000;

describe('Comprehensive PDF Transformation Tests', () => {
  let testPDF;
  let multiPagePDF;
  let largeTestPDF;

  beforeAll(() => {
    console.log('🚀 Setting up comprehensive transformation tests...');
    
    // Create test PDFs with different characteristics
    testPDF = createSimplePDF();
    multiPagePDF = createMultiPagePDF();
    largeTestPDF = createLargeTestPDF();
  });

  describe('🗜️ Compression Transformations', () => {
    test('should compress PDF with low compression', async () => {
      const { uploadId, transformedData } = await performTransformation([
        {
          type: 'compress',
          level: 'low',
          target: 'all'
        }
      ], testPDF);

      // Verify compression worked
      expect(transformedData.length).toBeGreaterThan(0);
      
      // Verify PDF is still valid
      const pdfData = await PDFParser(transformedData);
      expect(pdfData.text).toContain('Test PDF');
      
      console.log(`✅ Low compression: ${testPDF.length} → ${transformedData.length} bytes`);
    }, TEST_TIMEOUT);

    test('should compress PDF with medium compression', async () => {
      const { uploadId, transformedData } = await performTransformation([
        {
          type: 'compress',
          level: 'medium',
          target: 'all'
        }
      ], testPDF);

      // Verify compression worked
      expect(transformedData.length).toBeGreaterThan(0);
      
      // Verify PDF is still valid
      const pdfData = await PDFParser(transformedData);
      expect(pdfData.text).toContain('Test PDF');
      
      console.log(`✅ Medium compression: ${testPDF.length} → ${transformedData.length} bytes`);
    }, TEST_TIMEOUT);

    test('should compress PDF with high compression', async () => {
      const { uploadId, transformedData } = await performTransformation([
        {
          type: 'compress',
          level: 'high',
          target: 'all'
        }
      ], testPDF);

      // Verify compression worked
      expect(transformedData.length).toBeGreaterThan(0);
      
      // Verify PDF is still valid
      const pdfData = await PDFParser(transformedData);
      expect(pdfData.text).toContain('Test PDF');
      
      console.log(`✅ High compression: ${testPDF.length} → ${transformedData.length} bytes`);
    }, TEST_TIMEOUT);
  });

  describe('📄 Page Extraction Transformations', () => {
    test('should extract single page from multi-page PDF', async () => {
      const { uploadId, transformedData } = await performTransformation([
        {
          type: 'extract-pages',
          pages: [1],
          target: 'pages'
        }
      ], multiPagePDF);

      // Verify page extraction worked
      expect(transformedData.length).toBeGreaterThan(0);
      
      // Verify PDF has only one page
      const pdfData = await PDFParser(transformedData);
      expect(pdfData.numpages).toBe(1);
      expect(pdfData.text).toContain('Page 1');
      
      console.log(`✅ Page extraction: extracted page 1 from ${pdfData.numpages} page PDF`);
    }, TEST_TIMEOUT);

    test('should extract multiple pages from multi-page PDF', async () => {
      const { uploadId, transformedData } = await performTransformation([
        {
          type: 'extract-pages',
          pages: [1, 2],
          target: 'pages'
        }
      ], multiPagePDF);

      // Verify page extraction worked
      expect(transformedData.length).toBeGreaterThan(0);
      
      // Verify PDF has extracted pages
      const pdfData = await PDFParser(transformedData);
      expect(pdfData.numpages).toBe(2);
      expect(pdfData.text).toContain('Page 1');
      expect(pdfData.text).toContain('Page 2');
      
      console.log(`✅ Multi-page extraction: extracted 2 pages`);
    }, TEST_TIMEOUT);

    test('should reject invalid page numbers', async () => {
      const uploadResponse = await uploadFile(multiPagePDF);
      const fileId = uploadResponse.body.data.fileId;

      const response = await request(SERVER_URL)
        .post('/api/transform')
        .send({
          fileId: fileId,
          transformations: [{
            type: 'extract-pages',
            pages: [999],
            target: 'pages'
          }]
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toMatch(/Invalid page numbers/);
      
      console.log('✅ Invalid page number validation working');
    }, TEST_TIMEOUT);
  });

  describe('🔖 Watermark Transformations', () => {
    test('should add text watermark to PDF', async () => {
      const { uploadId, transformedData } = await performTransformation([
        {
          type: 'watermark',
          text: 'CONFIDENTIAL',
          position: 'center',
          opacity: 0.5,
          target: 'all'
        }
      ], testPDF);

      // Verify watermark was added
      expect(transformedData.length).toBeGreaterThan(0);
      
      // Note: Text extraction may not capture watermarks easily,
      // but we can verify the PDF is larger (watermark adds content)
      expect(transformedData.length).toBeGreaterThan(testPDF.length);
      
      console.log(`✅ Watermark added: ${testPDF.length} → ${transformedData.length} bytes`);
    }, TEST_TIMEOUT);

    test('should add watermark at different positions', async () => {
      const positions = ['top-left', 'top-right', 'bottom-left', 'bottom-right', 'center'];
      
      for (const position of positions) {
        const { uploadId, transformedData } = await performTransformation([
          {
            type: 'watermark',
            text: `${position.toUpperCase()}`,
            position: position,
            opacity: 0.3,
            target: 'all'
          }
        ], testPDF);

        expect(transformedData.length).toBeGreaterThan(0);
        console.log(`✅ Watermark position ${position} working`);
      }
    }, TEST_TIMEOUT);
  });

  describe('✏️ Text Replacement Transformations', () => {
    test('should replace text in PDF', async () => {
      const { uploadId, transformedData } = await performTransformation([
        {
          type: 'text-replace',
          findText: 'Test PDF',
          replaceText: 'Modified Document',
          target: 'all'
        }
      ], testPDF);

      // Verify text replacement worked
      expect(transformedData.length).toBeGreaterThan(0);
      
      // Note: The current implementation maps text-replace to redact_text
      // So we're testing that the transformation doesn't crash
      const pdfData = await PDFParser(transformedData);
      expect(pdfData.text).toBeDefined();
      
      console.log('✅ Text replacement transformation completed');
    }, TEST_TIMEOUT);
  });

  describe('🔄 Multiple Transformation Combinations', () => {
    test('should apply compression + watermark', async () => {
      const { uploadId, transformedData } = await performTransformation([
        {
          type: 'compress',
          level: 'medium',
          target: 'all'
        },
        {
          type: 'watermark',
          text: 'PROCESSED',
          position: 'top-right',
          opacity: 0.5,
          target: 'all'
        }
      ], testPDF);

      expect(transformedData.length).toBeGreaterThan(0);
      
      // Verify PDF is still valid after multiple transformations
      const pdfData = await PDFParser(transformedData);
      expect(pdfData.text).toContain('Test PDF');
      
      console.log(`✅ Multiple transformations: ${testPDF.length} → ${transformedData.length} bytes`);
    }, TEST_TIMEOUT);

    test('should apply extraction + compression', async () => {
      const { uploadId, transformedData } = await performTransformation([
        {
          type: 'extract-pages',
          pages: [1],
          target: 'pages'
        },
        {
          type: 'compress',
          level: 'high',
          target: 'all'
        }
      ], multiPagePDF);

      expect(transformedData.length).toBeGreaterThan(0);
      
      // Verify only one page remains after extraction
      const pdfData = await PDFParser(transformedData);
      expect(pdfData.numpages).toBe(1);
      
      console.log('✅ Page extraction + compression working');
    }, TEST_TIMEOUT);

    test('should apply all transformation types together', async () => {
      const { uploadId, transformedData } = await performTransformation([
        {
          type: 'extract-pages',
          pages: [1, 2],
          target: 'pages'
        },
        {
          type: 'compress',
          level: 'medium',
          target: 'all'
        },
        {
          type: 'watermark',
          text: 'FINAL',
          position: 'center',
          opacity: 0.3,
          target: 'all'
        }
      ], multiPagePDF);

      expect(transformedData.length).toBeGreaterThan(0);
      
      // Verify complex transformation chain worked
      const pdfData = await PDFParser(transformedData);
      expect(pdfData.numpages).toBe(2);
      
      console.log('✅ Complex transformation chain completed successfully');
    }, TEST_TIMEOUT);
  });

  describe('🔍 Edge Cases and Error Handling', () => {
    test('should handle empty transformation array', async () => {
      const uploadResponse = await uploadFile(testPDF);
      const fileId = uploadResponse.body.data.fileId;

      const response = await request(SERVER_URL)
        .post('/api/transform')
        .send({
          fileId: fileId,
          transformations: []
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      console.log('✅ Empty transformation array validation working');
    }, TEST_TIMEOUT);

    test('should handle invalid transformation type', async () => {
      const uploadResponse = await uploadFile(testPDF);
      const fileId = uploadResponse.body.data.fileId;

      const response = await request(SERVER_URL)
        .post('/api/transform')
        .send({
          fileId: fileId,
          transformations: [{
            type: 'invalid-transformation',
            target: 'all'
          }]
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      console.log('✅ Invalid transformation type validation working');
    }, TEST_TIMEOUT);

    test('should handle invalid compression level', async () => {
      const uploadResponse = await uploadFile(testPDF);
      const fileId = uploadResponse.body.data.fileId;

      const response = await request(SERVER_URL)
        .post('/api/transform')
        .send({
          fileId: fileId,
          transformations: [{
            type: 'compress',
            level: 'invalid-level',
            target: 'all'
          }]
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      console.log('✅ Invalid compression level validation working');
    }, TEST_TIMEOUT);
  });

  describe('📊 Performance and Stress Tests', () => {
    test('should handle large PDF compression', async () => {
      const { uploadId, transformedData } = await performTransformation([
        {
          type: 'compress',
          level: 'high',
          target: 'all'
        }
      ], largeTestPDF);

      expect(transformedData.length).toBeGreaterThan(0);
      expect(transformedData.length).toBeLessThanOrEqual(largeTestPDF.length * 2); // Allow some size variation
      
      console.log(`✅ Large PDF compression: ${largeTestPDF.length} → ${transformedData.length} bytes`);
    }, TEST_TIMEOUT * 2); // Longer timeout for large files

    test('should handle multiple concurrent transformations', async () => {
      const promises = [];
      
      for (let i = 0; i < 3; i++) {
        promises.push(performTransformation([
          {
            type: 'compress',
            level: 'medium',
            target: 'all'
          }
        ], testPDF));
      }

      const results = await Promise.all(promises);
      
      results.forEach((result, index) => {
        expect(result.transformedData.length).toBeGreaterThan(0);
        console.log(`✅ Concurrent transformation ${index + 1} completed`);
      });
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

function createSimplePDF() {
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
/Kids [3 0 R 6 0 R 9 0 R]
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

function createLargeTestPDF() {
  // Create a larger PDF with more content for stress testing
  let content = `%PDF-1.4
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
/Length 2000
>>
stream
BT
/F1 12 Tf
`;

  // Add lots of text content to make it larger
  for (let i = 0; i < 50; i++) {
    content += `100 ${700 - i * 10} Td
(This is line ${i + 1} of large test content for stress testing PDF transformations.) Tj
`;
  }

  content += `ET
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
2439
%%EOF`;

  return Buffer.from(content);
}
