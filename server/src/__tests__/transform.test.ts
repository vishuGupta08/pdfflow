import request from 'supertest'
import express from 'express'
import fs from 'fs'
import path from 'path'
import PDFParser from 'pdf-parse'
import uploadRoutes from '../routes/upload'
import transformRoutes from '../routes/transform'
import { createTestPDF } from '../test/setup'

const app = express()
app.use(express.json())
app.use('/api/upload', uploadRoutes)
app.use('/api/transform', transformRoutes)

describe('PDF Transformation API', () => {
  let uploadedFileId: string

  beforeEach(async () => {
    // Upload a test PDF before each test
    const testPDF = createTestPDF()
    
    const uploadResponse = await request(app)
      .post('/api/upload')
      .attach('pdf', testPDF, 'test.pdf')
      .expect(200)

    uploadedFileId = uploadResponse.body.data.fileId
  })

  describe('POST /api/transform', () => {
    it('should transform PDF with compression rules', async () => {
      const transformationRules = [
        {
          type: 'compress',
          level: 'medium',
          target: 'all'
        }
      ]

      const response = await request(app)
        .post('/api/transform')
        .send({
          fileId: uploadedFileId,
          transformations: transformationRules
        })
        .expect(200)

      expect(response.body.success).toBe(true)
      expect(response.body.downloadId).toBeDefined()
      expect(response.body.previewId).toBeDefined()
      expect(response.body.fileName).toContain('compressed')
    })

    it('should transform PDF with text replacement rules', async () => {
      const transformationRules = [
        {
          type: 'text-replace',
          find: 'Test PDF',
          replace: 'Modified PDF',
          target: 'all'
        }
      ]

      const response = await request(app)
        .post('/api/transform')
        .send({
          fileId: uploadedFileId,
          transformations: transformationRules
        })
        .expect(200)

      expect(response.body.success).toBe(true)
      expect(response.body.downloadId).toBeDefined()
      expect(response.body.previewId).toBeDefined()
    })

    it('should transform PDF with page extraction rules', async () => {
      const transformationRules = [
        {
          type: 'extract-pages',
          pages: [1],
          target: 'pages'
        }
      ]

      const response = await request(app)
        .post('/api/transform')
        .send({
          fileId: uploadedFileId,
          transformations: transformationRules
        })
        .expect(200)

      expect(response.body.success).toBe(true)
      expect(response.body.downloadId).toBeDefined()
      expect(response.body.previewId).toBeDefined()
    })

    it('should transform PDF with watermark rules', async () => {
      const transformationRules = [
        {
          type: 'watermark',
          text: 'CONFIDENTIAL',
          position: 'center',
          opacity: 0.5,
          target: 'all'
        }
      ]

      const response = await request(app)
        .post('/api/transform')
        .send({
          fileId: uploadedFileId,
          transformations: transformationRules
        })
        .expect(200)

      expect(response.body.success).toBe(true)
      expect(response.body.downloadId).toBeDefined()
      expect(response.body.previewId).toBeDefined()
    })

    it('should apply multiple transformation rules', async () => {
      const transformationRules = [
        {
          type: 'compress',
          level: 'low',
          target: 'all'
        },
        {
          type: 'watermark',
          text: 'SAMPLE',
          position: 'top-right',
          opacity: 0.3,
          target: 'all'
        }
      ]

      const response = await request(app)
        .post('/api/transform')
        .send({
          fileId: uploadedFileId,
          transformations: transformationRules
        })
        .expect(200)

      expect(response.body.success).toBe(true)
      expect(response.body.downloadId).toBeDefined()
      expect(response.body.previewId).toBeDefined()
    })

    it('should reject transformation with invalid file ID', async () => {
      const transformationRules = [
        {
          type: 'compress',
          level: 'medium',
          target: 'all'
        }
      ]

      const response = await request(app)
        .post('/api/transform')
        .send({
          fileId: 'invalid-file-id',
          transformations: transformationRules
        })
        .expect(404)

      expect(response.body.success).toBe(false)
      expect(response.body.error).toContain('File not found')
    })

    it('should reject transformation with empty rules', async () => {
      const response = await request(app)
        .post('/api/transform')
        .send({
          fileId: uploadedFileId,
          transformations: []
        })
        .expect(400)

      expect(response.body.success).toBe(false)
      expect(response.body.error).toContain('At least one transformation rule is required')
    })

    it('should reject transformation with invalid rule type', async () => {
      const transformationRules = [
        {
          type: 'invalid-type',
          target: 'all'
        }
      ]

      const response = await request(app)
        .post('/api/transform')
        .send({
          fileId: uploadedFileId,
          transformations: transformationRules
        })
        .expect(400)

      expect(response.body.success).toBe(false)
      expect(response.body.error).toContain('Invalid transformation type')
    })

    it('should validate compression level values', async () => {
      const transformationRules = [
        {
          type: 'compress',
          level: 'invalid-level',
          target: 'all'
        }
      ]

      const response = await request(app)
        .post('/api/transform')
        .send({
          fileId: uploadedFileId,
          transformations: transformationRules
        })
        .expect(400)

      expect(response.body.success).toBe(false)
      expect(response.body.error).toContain('Invalid compression level')
    })

    it('should validate page numbers for extraction', async () => {
      const transformationRules = [
        {
          type: 'extract-pages',
          pages: [999], // Page that doesn't exist
          target: 'pages'
        }
      ]

      const response = await request(app)
        .post('/api/transform')
        .send({
          fileId: uploadedFileId,
          transformations: transformationRules
        })
        .expect(400)

      expect(response.body.success).toBe(false)
      expect(response.body.error).toContain('Invalid page numbers')
    })
  })

  describe('PDF Quality Validation', () => {
    it('should produce valid PDF after compression', async () => {
      const transformationRules = [
        {
          type: 'compress',
          level: 'high',
          target: 'all'
        }
      ]

      const response = await request(app)
        .post('/api/transform')
        .send({
          fileId: uploadedFileId,
          transformations: transformationRules
        })
        .expect(200)

      // Download the transformed PDF
      const downloadResponse = await request(app)
        .get(`/api/download/${response.body.downloadId}`)
        .expect(200)

      // Validate it's a valid PDF
      const pdfBuffer = downloadResponse.body
      const pdfData = await PDFParser(pdfBuffer)
      
      expect(pdfData.numpages).toBeGreaterThan(0)
      expect(pdfData.text).toBeDefined()
    })

    it('should maintain text content after transformation', async () => {
      const transformationRules = [
        {
          type: 'watermark',
          text: 'WATERMARK',
          position: 'bottom-left',
          opacity: 0.2,
          target: 'all'
        }
      ]

      const response = await request(app)
        .post('/api/transform')
        .send({
          fileId: uploadedFileId,
          transformations: transformationRules
        })
        .expect(200)

      // Download the transformed PDF
      const downloadResponse = await request(app)
        .get(`/api/download/${response.body.downloadId}`)
        .expect(200)

      const pdfBuffer = downloadResponse.body
      const pdfData = await PDFParser(pdfBuffer)
      
      // Original content should still be present
      expect(pdfData.text).toContain('Test PDF')
    })

    it('should apply text replacement correctly', async () => {
      const transformationRules = [
        {
          type: 'text-replace',
          find: 'Test PDF',
          replace: 'Transformed Document',
          target: 'all'
        }
      ]

      const response = await request(app)
        .post('/api/transform')
        .send({
          fileId: uploadedFileId,
          transformations: transformationRules
        })
        .expect(200)

      // Download the transformed PDF
      const downloadResponse = await request(app)
        .get(`/api/download/${response.body.downloadId}`)
        .expect(200)

      const pdfBuffer = downloadResponse.body
      const pdfData = await PDFParser(pdfBuffer)
      
      // Text should be replaced
      expect(pdfData.text).toContain('Transformed Document')
      expect(pdfData.text).not.toContain('Test PDF')
    })
  })
}) 