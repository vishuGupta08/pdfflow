import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import path from 'path';
import fs from 'fs';

import uploadRoutes from './routes/upload';
import transformRoutes from './routes/transform';
import downloadRoutes from './routes/download';
import previewRoutes from './routes/preview';
import { errorHandler } from './middleware/errorHandler';

const app = express();
const PORT = process.env.PORT || 3001;

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Middleware
app.use(helmet());
app.use(compression());
app.use(morgan('combined'));
app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? [process.env.FRONTEND_URL || 'https://your-frontend-url.vercel.app']
    : ['http://localhost:5173', 'http://localhost:5174', 'http://localhost:5175'],
  credentials: true
}));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Routes
app.use('/api/upload', uploadRoutes);
app.use('/api/transform', transformRoutes);
app.use('/api/download', downloadRoutes);
app.use('/api/preview', previewRoutes);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Default route
app.get('/', (req, res) => {
  res.json({ 
    message: 'PDFFlow API Server',
    version: '1.0.0',
    endpoints: [
      'POST /api/upload',
      'POST /api/transform',
      'GET /api/download/:id',
      'GET /api/preview/:id',
      'GET /health'
    ]
  });
});

// Error handling
app.use(errorHandler);

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

app.listen(PORT, () => {
  console.log(`🚀 PDFFlow server running on port ${PORT}`);
  console.log(`📁 Uploads directory: ${uploadsDir}`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
}); 