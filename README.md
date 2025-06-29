# PDFFlow

A modern, full-stack PDF transformation application that allows users to upload, transform, preview, and download PDFs with various modifications. Built with React, TypeScript, Express.js, and PDF-lib.

![PDFFlow Demo](https://img.shields.io/badge/Demo-Live-brightgreen)
![License](https://img.shields.io/badge/License-MIT-blue.svg)
![Node.js](https://img.shields.io/badge/Node.js-18%2B-green)
![React](https://img.shields.io/badge/React-18-blue)

## ✨ Features

### Core Functionality
- 📤 **File Upload**: Secure PDF file upload with drag-and-drop support
- 🔄 **PDF Transformations**: Multiple transformation types:
  - **Rotate Pages**: Rotate specific pages by degrees
  - **Delete Pages**: Remove unwanted pages
  - **Extract Pages**: Extract specific page ranges
  - **Split Document**: Split PDF into multiple documents
  - **Merge Documents**: Combine multiple PDFs
  - **Add Watermark**: Add text or image watermarks
- 👁️ **Live Preview**: Real-time PDF preview with zoom and navigation
- 💾 **Download**: Download transformed PDFs
- 📱 **Responsive Design**: Works on desktop, tablet, and mobile

### Technical Features
- 🚀 **Fast Processing**: Efficient PDF manipulation using PDF-lib
- 🔒 **Secure**: File cleanup and secure handling
- 🎨 **Modern UI**: Beautiful interface with Tailwind CSS
- ⚡ **Real-time Updates**: Live transformation preview
- 🌐 **CORS Enabled**: Proper cross-origin resource sharing
- 📊 **Health Monitoring**: Built-in health checks

## 🛠️ Tech Stack

### Frontend
- **Framework**: React 18 with TypeScript
- **Build Tool**: Vite
- **Styling**: Tailwind CSS
- **PDF Viewer**: PDF.js (pdfjs-dist)
- **Icons**: Lucide React
- **HTTP Client**: Fetch API

### Backend
- **Runtime**: Node.js 18+
- **Framework**: Express.js with TypeScript
- **PDF Processing**: PDF-lib
- **File Upload**: Multer
- **Security**: Helmet, CORS
- **Logging**: Morgan
- **Development**: ts-node-dev

### Development Tools
- **Package Manager**: npm
- **Linting**: ESLint
- **Type Checking**: TypeScript
- **Process Management**: Concurrently
- **Hot Reload**: Vite (frontend) + ts-node-dev (backend)

## 🚀 Quick Start

### Prerequisites
- Node.js 18 or higher
- npm 8 or higher

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/pdfflow.git
   cd pdfflow
   ```

2. **Install dependencies**
   ```bash
   # Install root dependencies
   npm install
   
   # Install frontend dependencies
   cd client && npm install
   
   # Install backend dependencies
   cd ../server && npm install
   
   # Return to root
   cd ..
   ```

3. **Set up environment variables**
   ```bash
   # Create frontend environment file
   cp client/env.example client/.env
   
   # Edit client/.env if needed (default values work for development)
   # VITE_API_BASE_URL=http://localhost:3001/api
   ```

4. **Start development servers**
   ```bash
   npm run dev
   ```

   This will start:
   - Backend server: `http://localhost:3001`
   - Frontend server: `http://localhost:5173` (or next available port)

5. **Open the application**
   Open your browser and navigate to `http://localhost:5173`

## 📁 Project Structure

```
pdfflow/
├── client/                 # Frontend React application
│   ├── src/
│   │   ├── components/     # React components
│   │   │   ├── FileUpload.tsx
│   │   │   ├── TransformationRuleForm.tsx
│   │   │   ├── PDFPreview.tsx
│   │   │   └── PreviewPanel.tsx
│   │   ├── services/       # API service layer
│   │   │   └── api.ts
│   │   ├── types/          # TypeScript type definitions
│   │   │   └── index.ts
│   │   ├── polyfills.ts    # Browser compatibility
│   │   ├── main.tsx        # Application entry point
│   │   └── App.tsx         # Main app component
│   ├── public/             # Static assets
│   ├── package.json
│   └── vite.config.ts
├── server/                 # Backend Express application
│   ├── src/
│   │   ├── routes/         # API route handlers
│   │   │   ├── upload.ts
│   │   │   ├── transform.ts
│   │   │   ├── download.ts
│   │   │   └── preview.ts
│   │   ├── services/       # Business logic
│   │   │   └── pdfService.ts
│   │   ├── middleware/     # Express middleware
│   │   │   └── errorHandler.ts
│   │   ├── types/          # TypeScript types
│   │   │   └── index.ts
│   │   └── index.ts        # Server entry point
│   ├── uploads/            # Temporary file storage
│   ├── package.json
│   └── tsconfig.json
├── DEPLOYMENT.md           # Deployment guide
├── package.json            # Root package.json
└── README.md
```

## 🔌 API Documentation

### Base URL
- Development: `http://localhost:3001/api`
- Production: `https://your-api-domain.com/api`

### Endpoints

#### 1. Upload PDF
```http
POST /api/upload
Content-Type: multipart/form-data
```

**Request Body:**
- `pdf`: PDF file (multipart/form-data)

**Response:**
```json
{
  "success": true,
  "data": {
    "fileId": "uuid-string",
    "originalName": "document.pdf",
    "size": 1048576
  }
}
```

#### 2. Transform PDF
```http
POST /api/transform
Content-Type: application/json
```

**Request Body:**
```json
{
  "fileId": "uuid-string",
  "transformations": [
    {
      "type": "rotate",
      "pages": [1, 2],
      "degrees": 90
    },
    {
      "type": "delete",
      "pages": [3]
    }
  ]
}
```

**Transformation Types:**
- `rotate`: Rotate pages
  - `pages`: Array of page numbers
  - `degrees`: 90, 180, or 270
- `delete`: Delete pages
  - `pages`: Array of page numbers
- `extract`: Extract pages
  - `pages`: Array of page numbers

**Response:**
```json
{
  "success": true,
  "downloadId": "uuid-string",
  "previewId": "uuid-string",
  "fileName": "transformed_document.pdf"
}
```

#### 3. Preview PDF
```http
GET /api/preview/:previewId
```

**Response:** PDF file content

#### 4. Download PDF
```http
GET /api/download/:downloadId
```

**Response:** PDF file download

#### 5. Health Check
```http
GET /health
```

**Response:**
```json
{
  "status": "OK",
  "timestamp": "2025-06-29T04:53:07.616Z"
}
```

## 🎯 Usage Guide

### Basic Workflow

1. **Upload a PDF**
   - Click the upload area or drag and drop a PDF file
   - File is uploaded and processed

2. **Configure Transformations**
   - Add transformation rules using the form
   - Choose from rotate, delete, or extract operations
   - Specify page numbers and parameters

3. **Transform**
   - Click "Transform PDF" to apply all rules
   - Processing happens on the server

4. **Preview & Download**
   - Preview the transformed PDF
   - Download the final result

### Transformation Examples

#### Rotate Pages
```javascript
{
  type: "rotate",
  pages: [1, 3, 5],
  degrees: 90
}
```

#### Delete Pages
```javascript
{
  type: "delete",
  pages: [2, 4]
}
```

#### Extract Pages
```javascript
{
  type: "extract",
  pages: [1, 2, 3]
}
```

## 🚀 Development

### Available Scripts

#### Root Level
```bash
npm run dev          # Start both frontend and backend
npm run dev:client   # Start only frontend
npm run dev:server   # Start only backend
npm run build        # Build both applications
npm run build:client # Build frontend only
npm run build:server # Build backend only
```

#### Frontend (client/)
```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run preview      # Preview production build
npm run lint         # Run ESLint
```

#### Backend (server/)
```bash
npm run dev          # Start development server
npm run build        # Build TypeScript
npm start            # Start production server
```

### Development Workflow

1. **Start development servers**
   ```bash
   npm run dev
   ```

2. **Make changes**
   - Frontend changes auto-reload in browser
   - Backend changes auto-restart server

3. **Test your changes**
   - Upload a test PDF
   - Try different transformations
   - Verify download functionality

### Environment Variables

#### Frontend (.env)
```bash
VITE_API_BASE_URL=http://localhost:3001/api
```

#### Backend
```bash
PORT=3001
NODE_ENV=development
FRONTEND_URL=http://localhost:5173
```

## 🌐 Deployment

See [DEPLOYMENT.md](./DEPLOYMENT.md) for detailed deployment instructions using:
- **Frontend**: Vercel (Free)
- **Backend**: Railway (Free)

### Quick Deploy

1. **Deploy Backend to Railway**
   - Connect your GitHub repository
   - Railway auto-detects Node.js
   - Set environment variables

2. **Deploy Frontend to Vercel**
   - Connect your GitHub repository
   - Set `VITE_API_BASE_URL` to your Railway URL
   - Vercel auto-deploys on push

## 🔧 Troubleshooting

### Common Issues

#### CORS Errors
- **Problem**: Frontend can't access backend API
- **Solution**: Backend automatically allows localhost origins in development
- **Check**: Ensure both servers are running

#### Port Already in Use
```bash
# Kill processes using ports
pkill -f vite
pkill -f ts-node-dev
lsof -ti:3001 | xargs kill -9
```

#### Promise.withResolvers Error
- **Problem**: Older browsers don't support this method
- **Solution**: Polyfill is included in `client/src/polyfills.ts`
- **Import**: Already imported in `main.tsx`

#### File Upload Issues
- **Check**: File size limits (50MB max)
- **Check**: File type (PDF only)
- **Check**: Server uploads directory exists

#### PDF Processing Errors
- **Check**: PDF file is not corrupted
- **Check**: Server has sufficient memory
- **Check**: File permissions on uploads directory

### Development Tips

1. **Clear Vite Cache**
   ```bash
   cd client
   rm -rf node_modules/.vite
   rm -rf .vite
   npm run dev
   ```

2. **Restart Development Servers**
   ```bash
   pkill -f vite && pkill -f ts-node-dev
   npm run dev
   ```

3. **Check Server Logs**
   - Backend logs appear in terminal with `[0]` prefix
   - Frontend logs appear with `[1]` prefix

4. **Debug API Calls**
   ```bash
   # Test backend health
   curl http://localhost:3001/health
   
   # Test CORS
   curl -H "Origin: http://localhost:5173" \
        -X OPTIONS \
        http://localhost:3001/api/upload
   ```

## 🤝 Contributing

1. **Fork the repository**
2. **Create a feature branch**
   ```bash
   git checkout -b feature/amazing-feature
   ```
3. **Make your changes**
4. **Test thoroughly**
5. **Commit your changes**
   ```bash
   git commit -m 'Add amazing feature'
   ```
6. **Push to the branch**
   ```bash
   git push origin feature/amazing-feature
   ```
7. **Open a Pull Request**

### Development Guidelines

- Use TypeScript for type safety
- Follow existing code style and conventions
- Add JSDoc comments for functions
- Test all transformation types
- Ensure responsive design
- Handle error cases gracefully

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- [PDF-lib](https://pdf-lib.js.org/) for PDF manipulation
- [PDF.js](https://mozilla.github.io/pdf.js/) for PDF rendering
- [React](https://reactjs.org/) for the frontend framework
- [Express.js](https://expressjs.com/) for the backend framework
- [Tailwind CSS](https://tailwindcss.com/) for styling
- [Lucide](https://lucide.dev/) for icons

## 📞 Support

If you encounter any issues or have questions:

1. Check the [Troubleshooting](#-troubleshooting) section
2. Search existing [GitHub Issues](https://github.com/yourusername/pdfflow/issues)
3. Create a new issue with detailed information

---

**Made with ❤️ by [Your Name]**

> Transform your PDFs with ease using PDFFlow! 