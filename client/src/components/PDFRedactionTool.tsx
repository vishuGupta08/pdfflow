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

// Redaction tool fully removed from UI
