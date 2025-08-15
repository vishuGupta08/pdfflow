import { useState, useCallback, useRef } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import { 
  Type, 
  Image, 
  Highlighter, 
  StickyNote,
  Square,
  Circle,
  ArrowRight,
  Trash2,
  Save,
  Undo,
  Redo,
  ZoomIn,
  ZoomOut,
  ChevronLeft,
  ChevronRight,
  Settings,
  Palette,
  AlignLeft,
  Bold,
  Italic,
  Underline
} from 'lucide-react';

// Use the correct worker version that matches the installed pdfjs-dist (3.11.174)
pdfjs.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

interface PDFEditorProps {
  fileId: string;
  fileName?: string;
  onSave: (edits: PDFEdit[]) => void;
  onClose: () => void;
}

export interface PDFEdit {
  id: string;
  type: 'text' | 'image' | 'highlight' | 'note' | 'shape' | 'arrow' | 'redaction';
  page: number;
  x: number;
  y: number;
  width?: number;
  height?: number;
  content?: string;
  style?: {
    fontSize?: number;
    fontFamily?: string;
    color?: string;
    backgroundColor?: string;
    borderColor?: string;
    borderWidth?: number;
    opacity?: number;
    bold?: boolean;
    italic?: boolean;
    underline?: boolean;
  };
  imageData?: string; // base64 image data
}

export interface TextStyle {
  fontSize: number;
  fontFamily: string;
  color: string;
  bold: boolean;
  italic: boolean;
  underline: boolean;
}

// Get API base URL from environment variables
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001/api';

export const PDFEditor: React.FC<PDFEditorProps> = ({
  fileId,
  fileName,
  onSave,
  onClose
}) => {
  const [numPages, setNumPages] = useState<number>(0);
  const [pageNumber, setPageNumber] = useState<number>(1);
  const [scale, setScale] = useState<number>(1.0);
  const [error, setError] = useState<string | null>(null);
  const [edits, setEdits] = useState<PDFEdit[]>([]);
  const [undoStack, setUndoStack] = useState<PDFEdit[][]>([]);
  const [redoStack, setRedoStack] = useState<PDFEdit[][]>([]);
  
  // Current tool state
  const [currentTool, setCurrentTool] = useState<string>('select');
  const [isDrawing, setIsDrawing] = useState(false);
  const [startPosition, setStartPosition] = useState<{ x: number; y: number } | null>(null);
  const [selectedEdit, setSelectedEdit] = useState<string | null>(null);
  
  // Text editing state
  const [textStyle, setTextStyle] = useState<TextStyle>({
    fontSize: 16,
    fontFamily: 'Arial',
    color: '#000000',
    bold: false,
    italic: false,
    underline: false
  });
  
  // UI state
  const [showToolbar, setShowToolbar] = useState(true);
  const [showProperties, setShowProperties] = useState(false);
  
  const pageRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const truncateFileName = (fileName: string, maxLength: number = 35): string => {
    if (fileName.length <= maxLength) return fileName;
    
    // Extract file extension
    const lastDotIndex = fileName.lastIndexOf('.');
    const extension = lastDotIndex !== -1 ? fileName.substring(lastDotIndex) : '';
    const nameWithoutExt = lastDotIndex !== -1 ? fileName.substring(0, lastDotIndex) : fileName;
    
    // Calculate how much space we have for the name part
    const availableLength = maxLength - extension.length - 3; // 3 for "..."
    
    if (availableLength <= 0) {
      return fileName.substring(0, maxLength - 3) + '...';
    }
    
    return nameWithoutExt.substring(0, availableLength) + '...' + extension;
  };

  console.log('🔍 PDFEditor - fileId:', fileId);
  
  const pdfUrl = `${API_BASE_URL.replace('/api', '')}/api/preview/upload/${fileId}`;
  console.log('🔍 PDFEditor - pdfUrl:', pdfUrl);

  const onDocumentLoadSuccess = useCallback(({ numPages }: { numPages: number }) => {
    console.log('PDF loaded successfully, pages:', numPages);
    setNumPages(numPages);
    setError(null);
  }, []);

  const onDocumentLoadError = useCallback((error: Error) => {
    console.error('PDF loading error:', error);
    setError('Failed to load PDF for editing');
  }, []);

  // Save current state to undo stack
  const saveToUndoStack = useCallback(() => {
    setUndoStack(prev => [...prev, [...edits]]);
    setRedoStack([]); // Clear redo stack when new action is performed
  }, [edits]);

  // Add edit to the document
  const addEdit = useCallback((edit: Omit<PDFEdit, 'id'>) => {
    console.log('➕ Adding edit:', edit);
    saveToUndoStack();
    const newEdit: PDFEdit = {
      ...edit,
      id: `edit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    };
    console.log('✅ Created edit with ID:', newEdit.id);
    setEdits(prev => {
      const newEdits = [...prev, newEdit];
      console.log('📝 Total edits now:', newEdits.length);
      return newEdits;
    });
  }, [saveToUndoStack]);

  // Update existing edit
  const updateEdit = useCallback((editId: string, updates: Partial<PDFEdit>) => {
    saveToUndoStack();
    setEdits(prev => prev.map(edit => 
      edit.id === editId ? { ...edit, ...updates } : edit
    ));
  }, [saveToUndoStack]);

  // Delete edit
  const deleteEdit = useCallback((editId: string) => {
    saveToUndoStack();
    setEdits(prev => prev.filter(edit => edit.id !== editId));
    setSelectedEdit(null);
  }, [saveToUndoStack]);

  // Undo/Redo functionality
  const undo = useCallback(() => {
    if (undoStack.length > 0) {
      const previousState = undoStack[undoStack.length - 1];
      setRedoStack(prev => [...prev, [...edits]]);
      setEdits(previousState);
      setUndoStack(prev => prev.slice(0, -1));
    }
  }, [undoStack, edits]);

  const redo = useCallback(() => {
    if (redoStack.length > 0) {
      const nextState = redoStack[redoStack.length - 1];
      setUndoStack(prev => [...prev, [...edits]]);
      setEdits(nextState);
      setRedoStack(prev => prev.slice(0, -1));
    }
  }, [redoStack, edits]);

  // Handle mouse events for drawing
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (currentTool === 'select') return;
    
    const rect = pageRef.current?.getBoundingClientRect();
    if (!rect) return;

    const x = (e.clientX - rect.left) / scale;
    const y = (e.clientY - rect.top) / scale;
    
    setIsDrawing(true);
    setStartPosition({ x, y });

    if (currentTool === 'text') {
      const text = prompt('Enter text:');
      if (text) {
        addEdit({
          type: 'text',
          page: pageNumber,
          x,
          y,
          content: text,
          style: {
            fontSize: textStyle.fontSize,
            fontFamily: textStyle.fontFamily,
            color: textStyle.color,
            bold: textStyle.bold,
            italic: textStyle.italic,
            underline: textStyle.underline
          }
        });
      }
    } else if (currentTool === 'note') {
      const note = prompt('Enter note:');
      if (note) {
        addEdit({
          type: 'note',
          page: pageNumber,
          x,
          y,
          width: 200,
          height: 100,
          content: note,
          style: {
            backgroundColor: '#ffeb3b',
            color: '#000000',
            fontSize: 12
          }
        });
      }
    }
  }, [currentTool, scale, pageNumber, addEdit, textStyle]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isDrawing || !startPosition || currentTool === 'select') return;
    
    const rect = pageRef.current?.getBoundingClientRect();
    if (!rect) return;

    const x = (e.clientX - rect.left) / scale;
    const y = (e.clientY - rect.top) / scale;
    
    // Update temporary drawing state for shapes
    // This would be used for real-time preview while drawing
  }, [isDrawing, startPosition, currentTool, scale]);

  const handleMouseUp = useCallback((e: React.MouseEvent) => {
    if (!isDrawing || !startPosition) return;
    
    const rect = pageRef.current?.getBoundingClientRect();
    if (!rect) return;

    const x = (e.clientX - rect.left) / scale;
    const y = (e.clientY - rect.top) / scale;
    
    if (currentTool === 'highlight') {
      addEdit({
        type: 'highlight',
        page: pageNumber,
        x: Math.min(startPosition.x, x),
        y: Math.min(startPosition.y, y),
        width: Math.abs(x - startPosition.x),
        height: Math.abs(y - startPosition.y),
        style: {
          backgroundColor: '#ffff00',
          opacity: 0.3
        }
      });
    } else if (currentTool === 'rectangle') {
      addEdit({
        type: 'shape',
        page: pageNumber,
        x: Math.min(startPosition.x, x),
        y: Math.min(startPosition.y, y),
        width: Math.abs(x - startPosition.x),
        height: Math.abs(y - startPosition.y),
        content: 'rectangle',
        style: {
          borderColor: '#000000',
          borderWidth: 2,
          backgroundColor: 'transparent'
        }
      });
    } else if (currentTool === 'redaction') {
      addEdit({
        type: 'redaction',
        page: pageNumber,
        x: Math.min(startPosition.x, x),
        y: Math.min(startPosition.y, y),
        width: Math.abs(x - startPosition.x),
        height: Math.abs(y - startPosition.y),
        style: {
          backgroundColor: '#000000'
        }
      });
    }
    
    setIsDrawing(false);
    setStartPosition(null);
  }, [isDrawing, startPosition, currentTool, scale, pageNumber, addEdit]);

  // Handle image upload
  const handleImageUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const imageData = event.target?.result as string;
      addEdit({
        type: 'image',
        page: pageNumber,
        x: 50,
        y: 50,
        width: 200,
        height: 150,
        imageData
      });
    };
    reader.readAsDataURL(file);
  }, [pageNumber, addEdit]);

  // Navigation functions
  const goToPrevPage = () => setPageNumber(prev => Math.max(1, prev - 1));
  const goToNextPage = () => setPageNumber(prev => Math.min(numPages, prev + 1));
  const zoomIn = () => setScale(prev => Math.min(3.0, prev + 0.2));
  const zoomOut = () => setScale(prev => Math.max(0.5, prev - 0.2));

  // Render edit overlay
  const renderEditOverlay = (edit: PDFEdit) => {
    if (edit.page !== pageNumber) return null;

    const isSelected = selectedEdit === edit.id;
    const baseStyle: React.CSSProperties = {
      position: 'absolute',
      left: edit.x * scale,
      top: edit.y * scale,
      cursor: currentTool === 'select' ? 'pointer' : 'default',
      border: isSelected ? '2px solid #2196f3' : '1px solid transparent',
      ...edit.style
    };

    if (edit.type === 'text') {
      return (
        <div
          key={edit.id}
          style={{
            ...baseStyle,
            fontSize: (edit.style?.fontSize || 16) * scale,
            fontFamily: edit.style?.fontFamily || 'Arial',
            color: edit.style?.color || '#000000',
            fontWeight: edit.style?.bold ? 'bold' : 'normal',
            fontStyle: edit.style?.italic ? 'italic' : 'normal',
            textDecoration: edit.style?.underline ? 'underline' : 'none',
            whiteSpace: 'nowrap'
          }}
          onClick={() => setSelectedEdit(edit.id)}
        >
          {edit.content}
        </div>
      );
    }

    if (edit.type === 'highlight') {
      return (
        <div
          key={edit.id}
          style={{
            ...baseStyle,
            width: (edit.width || 0) * scale,
            height: (edit.height || 0) * scale,
            backgroundColor: edit.style?.backgroundColor || '#ffff00',
            opacity: edit.style?.opacity || 0.3
          }}
          onClick={() => setSelectedEdit(edit.id)}
        />
      );
    }

    if (edit.type === 'note') {
      return (
        <div
          key={edit.id}
          style={{
            ...baseStyle,
            width: (edit.width || 200) * scale,
            height: (edit.height || 100) * scale,
            backgroundColor: edit.style?.backgroundColor || '#ffeb3b',
            padding: 8 * scale,
            fontSize: (edit.style?.fontSize || 12) * scale,
            overflow: 'hidden'
          }}
          onClick={() => setSelectedEdit(edit.id)}
        >
          {edit.content}
        </div>
      );
    }

    if (edit.type === 'shape') {
      return (
        <div
          key={edit.id}
          style={{
            ...baseStyle,
            width: (edit.width || 0) * scale,
            height: (edit.height || 0) * scale,
            border: `${(edit.style?.borderWidth || 2) * scale}px solid ${edit.style?.borderColor || '#000000'}`,
            backgroundColor: edit.style?.backgroundColor || 'transparent'
          }}
          onClick={() => setSelectedEdit(edit.id)}
        />
      );
    }

    if (edit.type === 'redaction') {
      return (
        <div
          key={edit.id}
          style={{
            ...baseStyle,
            width: (edit.width || 0) * scale,
            height: (edit.height || 0) * scale,
            backgroundColor: '#000000'
          }}
          onClick={() => setSelectedEdit(edit.id)}
        />
      );
    }

    if (edit.type === 'image' && edit.imageData) {
      return (
        <img
          key={edit.id}
          src={edit.imageData}
          style={{
            ...baseStyle,
            width: (edit.width || 0) * scale,
            height: (edit.height || 0) * scale,
            objectFit: 'contain'
          }}
          onClick={() => setSelectedEdit(edit.id)}
          alt="Uploaded"
        />
      );
    }

    return null;
  };

  return (
    <div className="fixed inset-0 z-50 bg-gray-900 flex flex-col">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <h2 className="text-lg font-semibold text-gray-900">PDF Editor</h2>
            {fileName && (
              <span className="text-sm text-gray-500" title={fileName}>
                {truncateFileName(fileName)}
              </span>
            )}
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => {
                console.log('🔥 Save Changes button clicked');
                console.log('📝 Current edits:', edits);
                console.log('📊 Edits count:', edits.length);
                onSave(edits);
              }}
              className="btn-primary"
              disabled={edits.length === 0}
            >
              <Save className="h-4 w-4 mr-2" />
              Save Changes
            </button>
            <button
              onClick={onClose}
              className="btn-secondary"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Toolbar */}
        {showToolbar && (
          <div className="w-16 bg-gray-800 text-white flex flex-col items-center py-4 space-y-2">
            <button
              onClick={() => setCurrentTool('select')}
              className={`p-2 rounded ${currentTool === 'select' ? 'bg-blue-600' : 'hover:bg-gray-700'}`}
              title="Select"
            >
              <ArrowRight className="h-5 w-5" />
            </button>
            <button
              onClick={() => setCurrentTool('text')}
              className={`p-2 rounded ${currentTool === 'text' ? 'bg-blue-600' : 'hover:bg-gray-700'}`}
              title="Add Text"
            >
              <Type className="h-5 w-5" />
            </button>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="p-2 rounded hover:bg-gray-700"
              title="Add Image"
            >
              <Image className="h-5 w-5" />
            </button>
            <button
              onClick={() => setCurrentTool('highlight')}
              className={`p-2 rounded ${currentTool === 'highlight' ? 'bg-blue-600' : 'hover:bg-gray-700'}`}
              title="Highlight"
            >
              <Highlighter className="h-5 w-5" />
            </button>
            <button
              onClick={() => setCurrentTool('note')}
              className={`p-2 rounded ${currentTool === 'note' ? 'bg-blue-600' : 'hover:bg-gray-700'}`}
              title="Sticky Note"
            >
              <StickyNote className="h-5 w-5" />
            </button>
            <button
              onClick={() => setCurrentTool('rectangle')}
              className={`p-2 rounded ${currentTool === 'rectangle' ? 'bg-blue-600' : 'hover:bg-gray-700'}`}
              title="Rectangle"
            >
              <Square className="h-5 w-5" />
            </button>
            <button
              onClick={() => setCurrentTool('redaction')}
              className={`p-2 rounded ${currentTool === 'redaction' ? 'bg-blue-600' : 'hover:bg-gray-700'}`}
              title="Redaction"
            >
              <Circle className="h-5 w-5" />
            </button>
            <div className="border-t border-gray-600 w-8 my-2"></div>
            <button
              onClick={undo}
              disabled={undoStack.length === 0}
              className="p-2 rounded hover:bg-gray-700 disabled:opacity-50"
              title="Undo"
            >
              <Undo className="h-5 w-5" />
            </button>
            <button
              onClick={redo}
              disabled={redoStack.length === 0}
              className="p-2 rounded hover:bg-gray-700 disabled:opacity-50"
              title="Redo"
            >
              <Redo className="h-5 w-5" />
            </button>
            {selectedEdit && (
              <button
                onClick={() => deleteEdit(selectedEdit)}
                className="p-2 rounded hover:bg-red-600"
                title="Delete Selected"
              >
                <Trash2 className="h-5 w-5" />
              </button>
            )}
          </div>
        )}

        {/* Main Editor Area */}
        <div className="flex-1 flex flex-col bg-gray-100">
          {/* Editor Toolbar */}
          <div className="bg-white border-b border-gray-200 px-4 py-2">
            <div className="flex items-center justify-between">
              {/* Page Navigation */}
              <div className="flex items-center space-x-2">
                <button
                  onClick={goToPrevPage}
                  disabled={pageNumber <= 1}
                  className="btn-secondary btn-sm disabled:opacity-50"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <span className="text-sm font-medium px-3 py-1 bg-gray-100 rounded">
                  Page {pageNumber} of {numPages}
                </span>
                <button
                  onClick={goToNextPage}
                  disabled={pageNumber >= numPages}
                  className="btn-secondary btn-sm disabled:opacity-50"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>

              {/* Zoom Controls */}
              <div className="flex items-center space-x-2">
                <button
                  onClick={zoomOut}
                  disabled={scale <= 0.5}
                  className="btn-ghost btn-sm disabled:opacity-50"
                >
                  <ZoomOut className="h-4 w-4" />
                </button>
                <span className="text-sm font-medium px-2 py-1 bg-gray-100 rounded min-w-[60px] text-center">
                  {Math.round(scale * 100)}%
                </span>
                <button
                  onClick={zoomIn}
                  disabled={scale >= 3.0}
                  className="btn-ghost btn-sm disabled:opacity-50"
                >
                  <ZoomIn className="h-4 w-4" />
                </button>
                <button
                  onClick={() => setShowProperties(!showProperties)}
                  className="btn-ghost btn-sm"
                >
                  <Settings className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Text Formatting Toolbar */}
            {currentTool === 'text' && (
              <div className="flex items-center space-x-4 mt-2 pt-2 border-t border-gray-200">
                <select
                  value={textStyle.fontFamily}
                  onChange={(e) => setTextStyle(prev => ({ ...prev, fontFamily: e.target.value }))}
                  className="text-sm border border-gray-300 rounded px-2 py-1"
                >
                  <option value="Arial">Arial</option>
                  <option value="Helvetica">Helvetica</option>
                  <option value="Times New Roman">Times New Roman</option>
                  <option value="Courier New">Courier New</option>
                </select>
                <input
                  type="number"
                  value={textStyle.fontSize}
                  onChange={(e) => setTextStyle(prev => ({ ...prev, fontSize: parseInt(e.target.value) }))}
                  className="text-sm border border-gray-300 rounded px-2 py-1 w-16"
                  min="8"
                  max="72"
                />
                <input
                  type="color"
                  value={textStyle.color}
                  onChange={(e) => setTextStyle(prev => ({ ...prev, color: e.target.value }))}
                  className="w-8 h-8 border border-gray-300 rounded"
                />
                <button
                  onClick={() => setTextStyle(prev => ({ ...prev, bold: !prev.bold }))}
                  className={`p-1 rounded ${textStyle.bold ? 'bg-blue-100 text-blue-700' : 'hover:bg-gray-100'}`}
                >
                  <Bold className="h-4 w-4" />
                </button>
                <button
                  onClick={() => setTextStyle(prev => ({ ...prev, italic: !prev.italic }))}
                  className={`p-1 rounded ${textStyle.italic ? 'bg-blue-100 text-blue-700' : 'hover:bg-gray-100'}`}
                >
                  <Italic className="h-4 w-4" />
                </button>
                <button
                  onClick={() => setTextStyle(prev => ({ ...prev, underline: !prev.underline }))}
                  className={`p-1 rounded ${textStyle.underline ? 'bg-blue-100 text-blue-700' : 'hover:bg-gray-100'}`}
                >
                  <Underline className="h-4 w-4" />
                </button>
              </div>
            )}
          </div>

          {/* PDF Viewer with Overlay */}
          <div className="flex-1 overflow-auto bg-gray-300 p-4">
            <div className="flex justify-center">
              {error && (
                <div className="flex items-center justify-center h-64">
                  <div className="text-center">
                    <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <span className="text-red-600 text-2xl">⚠</span>
                    </div>
                    <h3 className="text-lg font-medium text-gray-900 mb-2">Editor Error</h3>
                    <p className="text-gray-600">{error}</p>
                  </div>
                </div>
              )}

              {!error && (
                <div className="relative bg-white shadow-lg">
                  <Document
                    file={pdfUrl}
                    onLoadSuccess={onDocumentLoadSuccess}
                    onLoadError={onDocumentLoadError}
                    loading={
                      <div className="flex items-center justify-center h-96">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                        <span className="ml-3 text-gray-600">Loading PDF...</span>
                      </div>
                    }
                  >
                    <div
                      ref={pageRef}
                      className="relative"
                      onMouseDown={handleMouseDown}
                      onMouseMove={handleMouseMove}
                      onMouseUp={handleMouseUp}
                    >
                      <Page
                        pageNumber={pageNumber}
                        scale={scale}
                        loading={
                          <div className="flex items-center justify-center h-96">
                            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                          </div>
                        }
                        renderTextLayer={false}
                        renderAnnotationLayer={false}
                      />
                      {/* Render all edits for current page */}
                      {edits.map(renderEditOverlay)}
                    </div>
                  </Document>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Properties Panel */}
        {showProperties && selectedEdit && (
          <div className="w-80 bg-white border-l border-gray-200 p-4">
            <h3 className="text-lg font-semibold mb-4">Properties</h3>
            {/* Properties editing interface would go here */}
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  X Position
                </label>
                <input
                  type="number"
                  className="w-full border border-gray-300 rounded px-3 py-2"
                  value={edits.find(e => e.id === selectedEdit)?.x || 0}
                  onChange={(e) => updateEdit(selectedEdit, { x: parseInt(e.target.value) })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Y Position
                </label>
                <input
                  type="number"
                  className="w-full border border-gray-300 rounded px-3 py-2"
                  value={edits.find(e => e.id === selectedEdit)?.y || 0}
                  onChange={(e) => updateEdit(selectedEdit, { y: parseInt(e.target.value) })}
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Hidden file input for image uploads */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        style={{ display: 'none' }}
        onChange={handleImageUpload}
      />
    </div>
  );
};
