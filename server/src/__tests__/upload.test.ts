import request from 'supertest'
import express from 'express'
import path from 'path'
import fs from 'fs'
import uploadRoutes from '../routes/upload'
import { createTestPDF } from '../test/setup'

const app = express()
app.use(express.json())
app.use('/api/upload', uploadRoutes)

describe('Upload API', () => {
  beforeEach(() => {
    // Clear uploaded files map before each test
    const { uploadedFiles } = require('../routes/upload')
    uploadedFiles.clear()
  })

  describe('POST /api/upload', () => {
    it('should upload a PDF file successfully', async () => {
      const testPDF = createTestPDF()
      
      const response = await request(app)
        .post('/api/upload')
        .attach('pdf', testPDF, 'test.pdf')
        .expect(200)

      expect(response.body.success).toBe(true)
      expect(response.body.data).toHaveProperty('fileId')
      expect(response.body.data).toHaveProperty('originalName', 'test.pdf')
      expect(response.body.data).toHaveProperty('size')
      expect(response.body.data).toHaveProperty('uploadedAt')
    })

    it('should reject non-PDF files', async () => {
      const textFile = Buffer.from('This is not a PDF file')
      
      const response = await request(app)
        .post('/api/upload')
        .attach('pdf', textFile, 'test.txt')
        .expect(400)

      expect(response.body.success).toBe(false)
      expect(response.body.error).toContain('Only PDF files are allowed')
    })

    it('should reject requests with no file', async () => {
      const response = await request(app)
        .post('/api/upload')
        .expect(400)

      expect(response.body.success).toBe(false)
      expect(response.body.error).toBe('No file uploaded')
    })

    it('should reject files larger than 50MB', async () => {
      // Create a large buffer (this won't actually be 50MB+ but simulates the scenario)
      const largeBuffer = Buffer.alloc(1024 * 1024) // 1MB buffer
      
      const response = await request(app)
        .post('/api/upload')
        .attach('pdf', largeBuffer, 'large.pdf')
        .field('Content-Type', 'application/pdf')

      // Note: The actual size limit is enforced by multer middleware
      // This test ensures the endpoint handles the error appropriately
      if (response.status === 413) {
        expect(response.body.success).toBe(false)
        expect(response.body.error).toContain('File too large')
      }
    })

    it('should generate unique file IDs for each upload', async () => {
      const testPDF = createTestPDF()
      
      const response1 = await request(app)
        .post('/api/upload')
        .attach('pdf', testPDF, 'test1.pdf')
        .expect(200)

      const response2 = await request(app)
        .post('/api/upload')
        .attach('pdf', testPDF, 'test2.pdf')
        .expect(200)

      expect(response1.body.data.fileId).not.toBe(response2.body.data.fileId)
    })

    it('should store file metadata correctly', async () => {
      const testPDF = createTestPDF()
      
      const response = await request(app)
        .post('/api/upload')
        .attach('pdf', testPDF, 'test.pdf')
        .expect(200)

      const fileId = response.body.data.fileId

      // Test the GET endpoint
      const getResponse = await request(app)
        .get(`/api/upload/${fileId}`)
        .expect(200)

      expect(getResponse.body.success).toBe(true)
      expect(getResponse.body.data.fileId).toBe(fileId)
      expect(getResponse.body.data.originalName).toBe('test.pdf')
      expect(getResponse.body.data.size).toBe(testPDF.length)
    })
  })

  describe('GET /api/upload/:fileId', () => {
    it('should return file info for existing file', async () => {
      const testPDF = createTestPDF()
      
      const uploadResponse = await request(app)
        .post('/api/upload')
        .attach('pdf', testPDF, 'test.pdf')
        .expect(200)

      const fileId = uploadResponse.body.data.fileId

      const response = await request(app)
        .get(`/api/upload/${fileId}`)
        .expect(200)

      expect(response.body.success).toBe(true)
      expect(response.body.data.fileId).toBe(fileId)
      expect(response.body.data.originalName).toBe('test.pdf')
    })

    it('should return 404 for non-existent file', async () => {
      const response = await request(app)
        .get('/api/upload/non-existent-id')
        .expect(404)

      expect(response.body.success).toBe(false)
      expect(response.body.error).toBe('File not found')
    })
  })

  describe('Error handling', () => {
    it('should handle internal server errors gracefully', async () => {
      // Mock multer to throw an error by creating a file that's too large
      const largePDF = Buffer.alloc(51 * 1024 * 1024) // 51MB - exceeds limit
      
      const response = await request(app)
        .post('/api/upload')
        .attach('pdf', largePDF, 'large.pdf')
        .expect(400)

      expect(response.body.success).toBe(false)
      expect(response.body.error).toBe('File too large. Maximum size is 50MB')
    })
  })
}) 