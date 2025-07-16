import fs from 'fs'
import path from 'path'

// Create test uploads directory
const testUploadsDir = path.join(__dirname, '../../test-uploads')
if (!fs.existsSync(testUploadsDir)) {
  fs.mkdirSync(testUploadsDir, { recursive: true })
}

// Clean up test uploads before each test
// NOTE: Completely disabled to prevent conflicts with transform tests
// The afterAll cleanup will handle cleanup after all tests complete
beforeEach(() => {
  // File cleanup disabled - handled by afterAll instead
});

// Clean up after all tests
afterAll(() => {
  // Remove test uploads directory
  if (fs.existsSync(testUploadsDir)) {
    fs.rmSync(testUploadsDir, { recursive: true, force: true })
  }
})

// Create test PDF file helper
export const createTestPDF = (): Buffer => {
  // Simple PDF content (minimal valid PDF)
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
%%EOF`)
}

// Mock environment variables
process.env.NODE_ENV = 'test'
process.env.PORT = '3002' 