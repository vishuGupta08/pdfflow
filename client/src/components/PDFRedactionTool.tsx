import React, { useState, useRef, useEffect } from 'react';
import * as pdfjsLib from 'pdfjs-dist';

// Set worker source
pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

interface RedactionBox {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  pageNumber: number;
  text?: string;
}

interface PDFRedactionToolProps {
  pdfFile: File;
  onRedactionComplete: (redactionBoxes: RedactionBox[]) => void;
}

export const PDFRedactionTool: React.FC<PDFRedactionToolProps> = ({
  pdfFile,
  onRedactionComplete
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [pdfDoc, setPdfDoc] = useState<any>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [redactionBoxes, setRedactionBoxes] = useState<RedactionBox[]>([]);
  const [isSelecting, setIsSelecting] = useState(false);
  const [selectionStart, setSelectionStart] = useState<{ x: number; y: number } | null>(null);
  const [currentSelection, setCurrentSelection] = useState<RedactionBox | null>(null);
  const [scale, setScale] = useState(1.5);

  useEffect(() => {
    loadPDF();
  }, [pdfFile]);

  useEffect(() => {
    if (pdfDoc && currentPage) {
      renderPage(currentPage);
    }
  }, [pdfDoc, currentPage, scale, redactionBoxes]);

  const loadPDF = async () => {
    try {
      const arrayBuffer = await pdfFile.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      setPdfDoc(pdf);
      setTotalPages(pdf.numPages);
      setCurrentPage(1);
    } catch (error) {
      console.error('Error loading PDF:', error);
    }
  };

  const renderPage = async (pageNumber: number) => {
    if (!pdfDoc || !canvasRef.current) return;

    const page = await pdfDoc.getPage(pageNumber);
    const viewport = page.getViewport({ scale });
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');

    if (!context) return;

    canvas.height = viewport.height;
    canvas.width = viewport.width;

    // Render PDF page
    await page.render({
      canvasContext: context,
      viewport: viewport,
    }).promise;

    // Draw existing redaction boxes
    context.fillStyle = 'rgba(0, 0, 0, 0.8)';
    redactionBoxes
      .filter(box => box.pageNumber === pageNumber)
      .forEach(box => {
        context.fillRect(box.x * scale, box.y * scale, box.width * scale, box.height * scale);
      });

    // Draw current selection
    if (currentSelection && currentSelection.pageNumber === pageNumber) {
      context.fillStyle = 'rgba(255, 0, 0, 0.5)';
      context.fillRect(
        currentSelection.x * scale,
        currentSelection.y * scale,
        currentSelection.width * scale,
        currentSelection.height * scale
      );
    }
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left) / scale;
    const y = (e.clientY - rect.top) / scale;

    setIsSelecting(true);
    setSelectionStart({ x, y });
    setCurrentSelection(null);
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isSelecting || !selectionStart || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left) / scale;
    const y = (e.clientY - rect.top) / scale;

    const selection: RedactionBox = {
      id: `temp-${Date.now()}`,
      x: Math.min(selectionStart.x, x),
      y: Math.min(selectionStart.y, y),
      width: Math.abs(x - selectionStart.x),
      height: Math.abs(y - selectionStart.y),
      pageNumber: currentPage
    };

    setCurrentSelection(selection);
    renderPage(currentPage);
  };

  const handleMouseUp = () => {
    if (!isSelecting || !currentSelection) return;

    // Only add if selection is meaningful (not too small)
    if (currentSelection.width > 5 && currentSelection.height > 5) {
      const newBox: RedactionBox = {
        ...currentSelection,
        id: `redaction-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
      };
      setRedactionBoxes(prev => [...prev, newBox]);
    }

    setIsSelecting(false);
    setSelectionStart(null);
    setCurrentSelection(null);
  };

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setCurrentPage(newPage);
    }
  };

  const removeRedactionBox = (id: string) => {
    setRedactionBoxes(prev => prev.filter(box => box.id !== id));
  };

  const clearAllRedactions = () => {
    setRedactionBoxes([]);
  };

  const handleApplyRedaction = () => {
    onRedactionComplete(redactionBoxes);
  };

  return (
    <div className="pdf-redaction-tool">
      <div className="controls mb-4 flex flex-wrap gap-4 items-center">
        <div className="page-controls flex items-center gap-2">
          <button
            onClick={() => handlePageChange(currentPage - 1)}
            disabled={currentPage <= 1}
            className="px-3 py-1 bg-blue-500 text-white rounded disabled:bg-gray-300"
          >
            Previous
          </button>
          <span className="text-sm">
            Page {currentPage} of {totalPages}
          </span>
          <button
            onClick={() => handlePageChange(currentPage + 1)}
            disabled={currentPage >= totalPages}
            className="px-3 py-1 bg-blue-500 text-white rounded disabled:bg-gray-300"
          >
            Next
          </button>
        </div>

        <div className="zoom-controls flex items-center gap-2">
          <label className="text-sm">Zoom:</label>
          <button
            onClick={() => setScale(prev => Math.max(0.5, prev - 0.25))}
            className="px-2 py-1 bg-gray-500 text-white rounded"
          >
            -
          </button>
          <span className="text-sm min-w-[3rem] text-center">
            {Math.round(scale * 100)}%
          </span>
          <button
            onClick={() => setScale(prev => Math.min(3, prev + 0.25))}
            className="px-2 py-1 bg-gray-500 text-white rounded"
          >
            +
          </button>
        </div>

        <div className="redaction-controls flex items-center gap-2">
          <button
            onClick={clearAllRedactions}
            className="px-3 py-1 bg-yellow-500 text-white rounded"
            disabled={redactionBoxes.length === 0}
          >
            Clear All ({redactionBoxes.length})
          </button>
          <button
            onClick={handleApplyRedaction}
            className="px-4 py-2 bg-red-600 text-white rounded font-medium"
            disabled={redactionBoxes.length === 0}
          >
            Apply Redaction
          </button>
        </div>
      </div>

      <div className="instructions mb-4 p-3 bg-blue-50 rounded">
        <p className="text-sm text-blue-800">
          <strong>Instructions:</strong> Click and drag to select areas of text you want to redact. 
          The selected areas will be blacked out in the final PDF. Use the page controls to navigate 
          through multi-page documents.
        </p>
      </div>

      <div className="pdf-viewer border border-gray-300 rounded overflow-auto max-h-[70vh]">
        <canvas
          ref={canvasRef}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          className="cursor-crosshair block"
          style={{
            maxWidth: '100%',
            height: 'auto'
          }}
        />
      </div>

      {redactionBoxes.length > 0 && (
        <div className="redaction-list mt-4">
          <h3 className="text-lg font-medium mb-2">Redaction Areas ({redactionBoxes.length})</h3>
          <div className="max-h-32 overflow-y-auto">
            {redactionBoxes.map((box, index) => (
              <div
                key={box.id}
                className="flex items-center justify-between p-2 bg-gray-50 rounded mb-1"
              >
                <span className="text-sm">
                  Area {index + 1} - Page {box.pageNumber} 
                  ({Math.round(box.width)}×{Math.round(box.height)}px)
                </span>
                <button
                  onClick={() => removeRedactionBox(box.id)}
                  className="text-red-500 hover:text-red-700 text-sm"
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
