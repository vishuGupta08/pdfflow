/**
 * Integration Test: Full PDF Transformation Workflow
 * 
 * This test covers the complete user journey:
 * 1. Upload a PDF file
 * 2. Apply transformation rules
 * 3. Download the transformed PDF
 * 4. Verify the output quality
 */

const request = require('supertest')
const fs = require('fs')
const path = require('path')

// Test configuration
const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:5173'
const SERVER_URL = process.env.SERVER_URL || 'http://localhost:3001'

// Create a simple test PDF
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
(Hello World) Tj
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

describe('PDF Transformation - Full Workflow Integration Test', () => {
  let server
  
  beforeAll(async () => {
    // Start the server programmatically
    try {
      server = require('../../server/src/index.ts')
    } catch (error) {
      console.log('Server is expected to be running separately')
    }
  })

  afterAll(async () => {
    if (server && server.close) {
      server.close()
    }
  })

  test('Complete PDF transformation workflow', async () => {
    const testPDF = createTestPDF()
    
    console.log('🔄 Starting full workflow test...')
    
    // Step 1: Upload PDF
    console.log('📤 Step 1: Uploading PDF...')
    const uploadResponse = await request(SERVER_URL)
      .post('/api/upload')
      .attach('pdf', testPDF, 'test-workflow.pdf')
      .expect(200)
    
    expect(uploadResponse.body.success).toBe(true)
    expect(uploadResponse.body.data.fileId).toBeDefined()
    
    const fileId = uploadResponse.body.data.fileId
    console.log(`✅ Upload successful. File ID: ${fileId}`)
    
    // Step 2: Apply transformations
    console.log('⚙️ Step 2: Applying transformations...')
    const transformationRules = [
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
    ]
    
    const transformResponse = await request(SERVER_URL)
      .post('/api/transform')
      .send({
        fileId: fileId,
        transformations: transformationRules
      })
      .expect(200)
    
    expect(transformResponse.body.success).toBe(true)
    expect(transformResponse.body.downloadId).toBeDefined()
    expect(transformResponse.body.previewId).toBeDefined()
    
    const downloadId = transformResponse.body.downloadId
    const previewId = transformResponse.body.previewId
    console.log(`✅ Transformation successful. Download ID: ${downloadId}`)
    
    // Step 3: Preview the transformed PDF
    console.log('👁️ Step 3: Testing preview...')
    const previewResponse = await request(SERVER_URL)
      .get(`/api/preview/${previewId}`)
      .expect(200)
    
    expect(previewResponse.headers['content-type']).toContain('application/pdf')
    console.log('✅ Preview accessible')
    
    // Step 4: Download the transformed PDF
    console.log('⬇️ Step 4: Downloading transformed PDF...')
    const downloadResponse = await request(SERVER_URL)
      .get(`/api/download/${downloadId}`)
      .expect(200)
    
    expect(downloadResponse.headers['content-type']).toContain('application/pdf')
    expect(downloadResponse.body.length).toBeGreaterThan(0)
    console.log('✅ Download successful')
    
    // Step 5: Validate the PDF quality
    console.log('🔍 Step 5: Validating PDF quality...')
    const outputPDF = downloadResponse.body
    
    // Basic PDF validation - check PDF header
    const pdfHeader = outputPDF.toString('ascii', 0, 8)
    expect(pdfHeader).toBe('%PDF-1.4')
    
    // Check PDF footer
    const pdfContent = outputPDF.toString('ascii')
    expect(pdfContent).toContain('%%EOF')
    
    // Verify the PDF has been processed (compression + watermark may increase size)
    // Since we're adding a watermark, the file might be larger than the original
    expect(outputPDF.length).toBeGreaterThan(0) // Just ensure we have valid output
    expect(outputPDF.length).toBeLessThanOrEqual(testPDF.length * 10) // Allow larger increase for watermark processing
    
    console.log(`✅ Original size: ${testPDF.length} bytes`)
    console.log(`✅ Transformed size: ${outputPDF.length} bytes`)
    console.log('✅ PDF quality validation passed')
    
    // Optional: Save the output for manual inspection
    if (process.env.SAVE_TEST_OUTPUT) {
      const outputPath = path.join(__dirname, 'test-output.pdf')
      fs.writeFileSync(outputPath, outputPDF)
      console.log(`💾 Test output saved to: ${outputPath}`)
    }
    
    console.log('🎉 Full workflow test completed successfully!')
  }, 30000) // 30 second timeout
  
  test('Error handling - Invalid file upload', async () => {
    console.log('🧪 Testing error handling...')
    
    // Test non-PDF file upload
    const textFile = Buffer.from('This is not a PDF file')
    
    const response = await request(SERVER_URL)
      .post('/api/upload')
      .attach('pdf', textFile, 'test.txt')
      .expect(400)
    
    expect(response.body.success).toBe(false)
    expect(response.body.error).toContain('Only PDF files are allowed')
    console.log('✅ Error handling working correctly')
  })
  
  test('Stress test - Multiple concurrent uploads', async () => {
    console.log('🏋️ Running stress test with multiple uploads...')
    
    const testPDF = createTestPDF()
    const promises = []
    
    // Create 5 concurrent upload requests
    for (let i = 0; i < 5; i++) {
      const promise = request(SERVER_URL)
        .post('/api/upload')
        .attach('pdf', testPDF, `stress-test-${i}.pdf`)
      promises.push(promise)
    }
    
    const responses = await Promise.all(promises)
    
    // All uploads should succeed
    responses.forEach((response, index) => {
      expect(response.status).toBe(200)
      expect(response.body.success).toBe(true)
      expect(response.body.data.fileId).toBeDefined()
      console.log(`✅ Concurrent upload ${index + 1} successful`)
    })
    
    console.log('🎉 Stress test completed successfully!')
  }, 60000) // 60 second timeout for stress test
})

// Export helper functions for other tests
module.exports = {
  createTestPDF,
  SERVER_URL,
  CLIENT_URL
} 