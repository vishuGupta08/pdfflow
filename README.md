# PDF Clinic - Comprehensive PDF Transformation Platform

A powerful, modern web application for transforming PDF documents with an extensive range of professional features. Built with React, TypeScript, Node.js, and Express. PDF Clinic makes professional PDF editing simple everywhere.

## ✨ Recent Enhancements (v2.0)

### 🎨 Enhanced Transformation Type Selector
- **Beautiful Modal Interface** - Replaced dropdown with elegant popup modal
- **Category Organization** - Transformations grouped by logical categories with visual separators
- **Icon Integration** - Each transformation type displays its unique icon for instant recognition
- **Visual Selection** - Current selection highlighted with color indicators and status dots
- **Responsive Design** - Optimized for desktop and mobile with smooth animations
- **Improved UX** - Larger click targets, better spacing, and intuitive navigation

### 🔧 Merge PDF Functionality
- **Fixed File Upload** - Resolved "Add PDF Files" button not responding
- **Multiple File Support** - Upload multiple PDFs simultaneously for merging
- **Real-time File List** - Dynamic display of selected files with removal options
- **Enhanced Error Handling** - Better feedback for file type validation and upload errors

### 🔒 New Security Feature
- **Remove Password Protection** - New transformation to remove passwords from protected PDFs
- **Dual Password Support** - Option to remove user passwords, owner passwords, or both
- **Current Password Verification** - Secure verification before password removal
- **Comprehensive UI** - Clear interface with helpful information and warnings

### 🎯 User Experience Improvements
- **Modal State Management** - Smooth opening and closing transitions
- **Visual Feedback** - Hover effects and selection indicators
- **Type Safety** - Full TypeScript support for better development experience
- **Performance Optimization** - Efficient rendering and state management

## 🚀 Features Overview

PDFFlow provides a comprehensive suite of PDF transformation tools organized into four main categories:

### 📄 Page Operations
- **Remove Pages** - Delete specific pages from your PDF
- **Rotate Pages** - Rotate pages by 90°, 180°, or 270°
- **Extract Pages** - Extract specific page ranges into new documents
- **Rearrange Pages** - Change the order of pages
- **Add Blank Pages** - Insert empty pages at any position
- **Crop Pages** - Trim pages using presets or custom margins
- **Resize Pages** - Scale pages or change dimensions

### 📋 Document Management
- **Merge PDFs** - Combine multiple PDF files into one document
- **Split PDF** - Split documents by page count, ranges, or individual pages
- **Compress PDF** - Reduce file size with customizable quality settings

### 🎨 Content & Annotations
- **Add Watermarks** - Text watermarks with positioning and opacity control
- **Add Images/Logos** - Insert images with flexible positioning and sizing
- **Headers & Footers** - Add consistent headers and footers with page numbers and dates
- **Page Numbers** - Automatic page numbering with customizable positioning
- **Text Annotations** - Add text boxes, comments, highlights, and sticky notes
- **Backgrounds** - Add background colors or images with various scaling options
- **Borders** - Add decorative borders with customizable styles

### 🔒 Security & Privacy
- **Text Redaction** - Hide sensitive information permanently
- **Password Protection** - Add user and owner passwords with detailed permissions
- **Remove Password** - Remove existing password protection from PDFs you own

## 🎯 Key Capabilities

### Advanced Compression
- **Smart Compression Levels**: Low, Medium, High, Maximum, and Custom
- **Target File Size**: Specify exact target file sizes
- **Image Quality Control**: Adjustable image quality (10-100%)
- **Professional Optimization**: Uses Ghostscript for optimal results
- **Real-time Estimates**: Preview size reduction before processing

### Flexible Page Management
- **Batch Operations**: Apply transformations to specific pages or all pages
- **Custom Page Ranges**: Precise control over which pages to transform
- **Smart Positioning**: Nine-point positioning system for elements
- **Aspect Ratio Control**: Maintain or adjust aspect ratios as needed

### Professional Content Tools
- **Multi-format Image Support**: PNG, JPG, SVG support
- **Custom Fonts and Colors**: Full typography control
- **Annotation System**: Rich annotation types with positioning
- **Template-based Headers/Footers**: Professional document formatting

### Security Features
- **Granular Permissions**: Control printing, editing, copying, and more
- **Dual Password System**: Separate user and owner passwords
- **Password Removal**: Remove existing password protection with proper verification
- **Accessibility Support**: Screen reader compatibility options
- **Document Assembly Control**: Prevent unauthorized page manipulation

## 💻 Technical Architecture

### Frontend (React + TypeScript)
- **Modern UI Components**: Beautiful, responsive interface with modal-based interactions
- **Enhanced Modal System**: Elegant popup interfaces for transformation selection
- **Category-based Organization**: Intuitive transformation selection with visual groupings
- **Real-time Preview**: Live preview of transformation rules
- **Advanced State Management**: Efficient React hooks for modal and form state
- **Icon Integration**: Comprehensive icon system using Lucide React
- **Form Validation**: Comprehensive client-side validation
- **Progressive Enhancement**: Works across all modern browsers
- **Responsive Design**: Mobile-first approach with adaptive layouts

### Backend (Node.js + Express)
- **PDF Processing**: Advanced PDF manipulation using pdf-lib
- **File Management**: Secure file upload and storage
- **Compression Engine**: Ghostscript integration for optimal compression
- **Validation Layer**: Server-side validation with Joi schemas
- **Error Handling**: Comprehensive error handling and logging

### Key Libraries
- **pdf-lib**: Core PDF manipulation
- **Ghostscript**: Professional compression
- **Multer**: File upload handling
- **Joi**: Schema validation
- **UUID**: Unique identifier generation (v11.1.0+)
- **Lucide React**: Beautiful icons and visual elements
- **React**: Modern UI framework with hooks
- **TypeScript**: Type-safe development experience

## 🛠️ Installation & Setup

### Prerequisites
- Node.js (v16+ recommended)
- npm or yarn
- Ghostscript (for compression features)

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd pdfFlow
   ```

2. **Install dependencies**
   ```bash
   # Install server dependencies
   cd server
   npm install
   
   # Install client dependencies
   cd ../client
   npm install
   
   # Note: Recent updates include UUID v11.1.0+ and enhanced TypeScript types
   # These are automatically installed with the above commands
   ```

3. **Install Ghostscript** (for compression)
   ```bash
   # Ubuntu/Debian
   sudo apt-get install ghostscript

   # macOS
   brew install ghostscript

   # Windows
   # Download and install from: https://www.ghostscript.com/download/gsdnld.html
   ```

4. **Start the development servers**
   ```bash
   # Terminal 1 - Start backend server
   cd server
   npm run dev

   # Terminal 2 - Start frontend development server
   cd client
   npm start
   ```

5. **Access the application**
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:5000

## 📖 Usage Guide

### Basic Workflow

1. **Upload PDF**: Select a PDF file using the upload interface
2. **Add Transformations**: Choose from 20+ transformation types
3. **Configure Settings**: Customize each transformation with detailed options
4. **Preview Changes**: Review your transformation plan
5. **Process & Download**: Execute transformations and download results

### Example Transformations

#### Professional Document Setup
```javascript
// Add company letterhead
{
  type: 'add_header_footer',
  headerText: 'Company Name',
  footerText: 'Confidential',
  includePageNumber: true,
  includeDate: true
}

// Add watermark for draft documents
{
  type: 'add_watermark',
  text: 'DRAFT',
  position: 'center',
  opacity: 0.3
}
```

#### Document Optimization
```javascript
// Compress for web distribution
{
  type: 'compress',
  compressionLevel: 'high',
  imageQuality: 75
}

// Custom size targeting
{
  type: 'compress',
  compressionLevel: 'custom',
  targetFileSize: 500 // KB
}
```

#### Security Implementation
```javascript
// Password protection with permissions
{
  type: 'password_protect',
  userPassword: 'view123',
  ownerPassword: 'admin456',
  permissions: {
    printing: false,
    modifying: false,
    copying: true
  }
}

// Remove password protection
{
  type: 'remove_password',
  currentPassword: 'current123',
  removeUserPassword: true,
  removeOwnerPassword: true
}
```

## 🎨 User Interface Features

### Enhanced Transformation Selector
- **Modal-based Selection** - Beautiful popup interface replaces traditional dropdowns
- **Category Organization** - Intuitive grouping with visual separators and headers
- **Icon-rich Interface** - Every transformation type features a distinctive icon
- **Visual Hierarchy** - Clear organization with proper spacing and typography
- **Selection Indicators** - Active selections highlighted with color-coded indicators
- **Responsive Layout** - Adapts seamlessly to different screen sizes

### Category-based Organization
Transformations are organized into intuitive categories:
- **Page Operations**: Core page manipulation tools
- **Document Management**: File-level operations
- **Content & Annotations**: Visual and textual enhancements
- **Security & Privacy**: Protection and redaction tools

### Smart Form Controls
- **Conditional Fields**: Options appear based on selections
- **Range Sliders**: Intuitive controls for numeric values
- **Color Pickers**: Visual color selection
- **File Upload Zones**: Drag-and-drop file handling
- **Modal Interfaces**: Clean, focused user interactions

### Real-time Feedback
- **Live Previews**: See changes before processing
- **Size Estimates**: Compression size predictions
- **Validation Messages**: Immediate feedback on form inputs
- **Progress Indicators**: Visual processing feedback
- **Interactive Modals**: Smooth animations and transitions

## 🔧 API Endpoints

### File Operations
- `POST /api/upload` - Upload PDF files
- `GET /api/files/:id` - Retrieve file information
- `DELETE /api/files/:id` - Delete uploaded files

### Transformation Operations
- `POST /api/transform` - Apply transformations
- `GET /api/transform/:id` - Get transformation status
- `GET /api/preview/:id` - Preview transformed PDF

### Download Operations
- `GET /api/download/:id` - Download processed files
- `GET /api/preview/:id` - Preview in browser

## 🔒 Security Considerations

### File Security
- **Temporary Storage**: Files are automatically cleaned up
- **Unique Identifiers**: UUIDs prevent file enumeration
- **Size Limits**: Configurable file size restrictions
- **Type Validation**: Strict MIME type checking

### Processing Security
- **Input Validation**: Comprehensive parameter validation
- **Resource Limits**: Protection against resource exhaustion
- **Error Handling**: Secure error messages
- **Audit Logging**: Processing activity logs

## 🚀 Performance Optimization

### Client-side Optimizations
- **Lazy Loading**: Components loaded on demand
- **Efficient Re-renders**: Optimized React patterns
- **Memory Management**: Proper cleanup of resources
- **Bundle Optimization**: Code splitting and tree shaking

### Server-side Optimizations
- **Streaming Processing**: Large file handling
- **Concurrent Operations**: Parallel transformation processing
- **Memory Management**: Efficient buffer handling
- **Caching Strategies**: Intelligent result caching

## 🧪 Testing

### Running Tests
```bash
# Backend tests
cd server
npm test

# Frontend tests
cd client
npm test

# Integration tests
npm run test:integration
```

### Test Coverage
- **Unit Tests**: Component and function testing
- **Integration Tests**: API endpoint testing
- **E2E Tests**: Full workflow validation
- **Performance Tests**: Load and stress testing

## 📦 Deployment

### Production Build
```bash
# Build frontend
cd client
npm run build

# Start production server
cd ../server
npm start
```

### Environment Variables
```bash
# Server configuration
PORT=5000
NODE_ENV=production
UPLOAD_DIR=./uploads
MAX_FILE_SIZE=50mb

# Client configuration
REACT_APP_API_URL=http://localhost:5000
```

### Docker Deployment
```dockerfile
# Use the provided Dockerfile
docker build -t pdfflow .
docker run -p 3000:3000 -p 5000:5000 pdfflow
   ```

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

### Development Guidelines
- **Code Style**: ESLint and Prettier configurations
- **TypeScript**: Strict type checking enabled
- **Testing**: Comprehensive test coverage required
- **Documentation**: Update docs for new features

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

### Getting Help
- **Documentation**: Check this README and inline docs
- **Issues**: Report bugs via GitHub Issues
- **Discussions**: Join community discussions
- **Email**: Contact support@pdfflow.com

### Common Issues
- **Ghostscript Installation**: Required for compression features
- **Memory Limits**: Adjust Node.js memory for large files
- **CORS Issues**: Configure CORS for cross-origin requests
- **File Permissions**: Ensure write access for upload directory

## 📋 Changelog

### Version 2.0.0 (Latest)
- ✨ **Enhanced Transformation Selector**: Replaced dropdown with beautiful modal interface
- 🎨 **Icon Integration**: Added unique icons for each transformation type
- 🔧 **Fixed Merge PDF**: Resolved file upload functionality for PDF merging
- 🔒 **Remove Password Feature**: New transformation to remove password protection from PDFs
- 🎯 **Improved UX**: Better spacing, visual hierarchy, and responsive design
- 📦 **Dependencies**: Added UUID v11.1.0+ and @types/uuid v10.0.0
- 🔄 **State Management**: Enhanced React hooks for modal and form state
- 🎨 **Visual Indicators**: Added selection highlighting and status dots

### Version 1.0.0
- 🚀 **Initial Release**: Complete PDF transformation platform
- 📄 **19 Transformation Types**: Comprehensive feature set (now 20 in v2.0.0)
- 🎨 **Modern UI**: React + TypeScript frontend
- 🔧 **Robust Backend**: Node.js + Express API
- 🔒 **Security Features**: Password protection and permissions
- 📊 **Compression Engine**: Ghostscript integration

## 🗺️ Roadmap

### Upcoming Features
- **OCR Integration**: Text recognition and extraction
- **Digital Signatures**: Sign documents electronically
- **Batch Processing**: Process multiple files simultaneously
- **Cloud Storage**: Integration with cloud storage providers
- **Template System**: Reusable transformation templates
- **API Keys**: Programmatic access via API
- **Webhook Support**: Real-time processing notifications

### Performance Improvements
- **WebAssembly**: Browser-based PDF processing
- **Worker Threads**: Background processing
- **CDN Integration**: Faster file delivery
- **Database Storage**: Persistent file management

---

## 📊 Feature Matrix

| Feature | Status | Category | Description |
|---------|--------|----------|-------------|
| Remove Pages | ✅ | Page Operations | Delete specific pages |
| Rotate Pages | ✅ | Page Operations | Rotate by 90°/180°/270° |
| Add Watermark | ✅ | Content & Annotations | Text watermarks |
| Merge PDFs | ✅ | Document Management | Combine multiple files |
| Compress PDF | ✅ | Document Management | Advanced compression |
| Redact Text | ✅ | Security & Privacy | Hide sensitive content |
| Page Numbers | ✅ | Content & Annotations | Auto page numbering |
| Rearrange Pages | ✅ | Page Operations | Change page order |
| Extract Pages | ✅ | Page Operations | Extract page ranges |
| Split PDF | ✅ | Document Management | Split into multiple files |
| Add Images | ✅ | Content & Annotations | Insert images/logos |
| Headers/Footers | ✅ | Content & Annotations | Professional formatting |
| Blank Pages | ✅ | Page Operations | Insert empty pages |
| Crop Pages | ✅ | Page Operations | Trim page dimensions |
| Backgrounds | ✅ | Content & Annotations | Colors and images |
| Text Annotations | ✅ | Content & Annotations | Comments and highlights |
| Borders | ✅ | Content & Annotations | Decorative borders |
| Resize Pages | ✅ | Page Operations | Scale and resize |
| Password Protection | ✅ | Security & Privacy | Encryption and permissions |
| Remove Password | ✅ | Security & Privacy | Remove existing password protection |

**Total: 20 transformation types implemented** 🎉

---

Built with ❤️ by the PDFFlow team. Transform your PDFs with confidence! 