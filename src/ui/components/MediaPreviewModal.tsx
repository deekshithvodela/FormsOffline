import React, { useEffect, useState } from 'react';
import { X, Download, FileText, ZoomIn, ZoomOut, Maximize2, ShieldCheck, Image as ImageIcon, ChevronLeft, ChevronRight, FileCode, Music, Video, Archive, File, Table } from 'lucide-react';
import JSZip from 'jszip';
import * as XLSX from 'xlsx';
import * as pdfjsLib from 'pdfjs-dist';
import pdfWorker from 'pdfjs-dist/build/pdf.worker.min.js?url';
import { useBodyScrollLock } from '../hooks/useBodyScrollLock';

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;

export interface MediaPreviewItem {
  title: string;
  dataUrl?: string;
  type?: string;
  fileName?: string;
  size?: number;
  capturedAt?: string;
}

interface MediaPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  item: MediaPreviewItem | null;
  galleryItems?: MediaPreviewItem[];
  initialIndex?: number;
}

export const MediaPreviewModal: React.FC<MediaPreviewModalProps> = ({
  isOpen,
  onClose,
  item,
  galleryItems,
  initialIndex = 0
}) => {
  const [currentIndex, setCurrentIndex] = useState<number>(initialIndex);
  const [zoomLevel, setZoomLevel] = useState<number>(1);
  const [decodedText, setDecodedText] = useState<string | null>(null);

  // In-app parsed states for DOCX, XLSX, and PDF
  const [parsedDocxParagraphs, setParsedDocxParagraphs] = useState<string[] | null>(null);
  const [isDocxParsing, setIsDocxParsing] = useState(false);
  const [parsedXlsxData, setParsedXlsxData] = useState<{ sheetName: string; rows: any[][] } | null>(null);
  const [isXlsxParsing, setIsXlsxParsing] = useState(false);
  const [pdfPageUrls, setPdfPageUrls] = useState<string[] | null>(null);
  const [isPdfRendering, setIsPdfRendering] = useState(false);
  const [pdfPageCount, setPdfPageCount] = useState<number>(0);

  // Lock background body scrolling while modal is open
  useBodyScrollLock(isOpen);

  const activeList = galleryItems && galleryItems.length > 0 ? galleryItems : (item ? [item] : []);
  const activeItem = activeList[currentIndex] || item;

  useEffect(() => {
    if (isOpen) {
      setCurrentIndex(initialIndex >= 0 && initialIndex < activeList.length ? initialIndex : 0);
      setZoomLevel(1);
    }
  }, [isOpen, item, galleryItems, initialIndex]);

  const fileNameLower = (activeItem?.fileName || '').toLowerCase();
  const mimeType = (activeItem?.type || '').toLowerCase();

  const isPdf =
    mimeType === 'application/pdf' ||
    activeItem?.dataUrl?.startsWith('data:application/pdf') ||
    /\.pdf$/i.test(fileNameLower);

  const isDocx = /\.docx$/i.test(fileNameLower) || mimeType.includes('wordprocessingml');
  const isXlsx = /\.(xlsx|xls|csv)$/i.test(fileNameLower) || mimeType.includes('spreadsheet') || mimeType.includes('excel');

  // Decode text, docx, xlsx, or pdf files when active item changes
  useEffect(() => {
    if (!activeItem?.dataUrl) {
      setDecodedText(null);
      setParsedDocxParagraphs(null);
      setParsedXlsxData(null);
      setPdfPageUrls(null);
      return;
    }

    // 1. In-App Visual PDF Page Rendering via PDF.js
    if (isPdf && activeItem.dataUrl.includes(',')) {
      setIsPdfRendering(true);
      setPdfPageUrls(null);
      setParsedDocxParagraphs(null);
      setParsedXlsxData(null);
      setDecodedText(null);

      try {
        const base64Data = activeItem.dataUrl.split(',')[1];
        const binary = atob(base64Data);
        const array = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) {
          array[i] = binary.charCodeAt(i);
        }

        pdfjsLib.getDocument({ data: array }).promise.then(async (pdfDoc) => {
          setPdfPageCount(pdfDoc.numPages);
          const urls: string[] = [];
          const maxPages = Math.min(pdfDoc.numPages, 30); // Render up to 30 pages
          for (let pageNum = 1; pageNum <= maxPages; pageNum++) {
            const page = await pdfDoc.getPage(pageNum);
            const viewport = page.getViewport({ scale: 2.0 }); // Crisp 2x render for zoom
            const canvas = document.createElement('canvas');
            const context = canvas.getContext('2d');
            if (context) {
              canvas.height = viewport.height;
              canvas.width = viewport.width;
              await page.render({ canvasContext: context, viewport }).promise;
              urls.push(canvas.toDataURL('image/png'));
            }
          }
          setPdfPageUrls(urls.length > 0 ? urls : null);
        }).catch((err) => {
          console.error('Failed to render PDF in-app:', err);
          setPdfPageUrls(null);
        }).finally(() => {
          setIsPdfRendering(false);
        });
      } catch (err) {
        console.error('Error initiating PDF render:', err);
        setIsPdfRendering(false);
        setPdfPageUrls(null);
      }
      return;
    }

    // 2. In-App DOCX Parsing
    if (isDocx && activeItem.dataUrl.includes(',')) {
      setIsDocxParsing(true);
      setDecodedText(null);
      setParsedXlsxData(null);
      setPdfPageUrls(null);
      try {
        const base64Data = activeItem.dataUrl.split(',')[1];
        JSZip.loadAsync(base64Data, { base64: true })
          .then(async (zip) => {
            const docXml = await zip.file('word/document.xml')?.async('text');
            if (docXml) {
              const parser = new DOMParser();
              const xmlDoc = parser.parseFromString(docXml, 'application/xml');
              const paragraphs = xmlDoc.getElementsByTagName('w:p');
              const extracted: string[] = [];
              for (let i = 0; i < paragraphs.length; i++) {
                const textNodes = paragraphs[i].getElementsByTagName('w:t');
                let pText = '';
                for (let j = 0; j < textNodes.length; j++) {
                  pText += textNodes[j].textContent || '';
                }
                if (pText.trim()) {
                  extracted.push(pText.trim());
                }
              }
              setParsedDocxParagraphs(extracted.length > 0 ? extracted : ['[Document contains no readable text paragraphs]']);
            } else {
              setParsedDocxParagraphs(null);
            }
          })
          .catch((err) => {
            console.error('Failed to parse DOCX:', err);
            setParsedDocxParagraphs(null);
          })
          .finally(() => setIsDocxParsing(false));
      } catch (e) {
        setIsDocxParsing(false);
        setParsedDocxParagraphs(null);
      }
      return;
    }

    // 3. In-App Spreadsheet Parsing
    if (isXlsx && activeItem.dataUrl.includes(',') && !activeItem.fileName?.endsWith('.csv')) {
      setIsXlsxParsing(true);
      setDecodedText(null);
      setParsedDocxParagraphs(null);
      setPdfPageUrls(null);
      try {
        const base64Data = activeItem.dataUrl.split(',')[1];
        const binary = atob(base64Data);
        const array = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) {
          array[i] = binary.charCodeAt(i);
        }
        const workbook = XLSX.read(array, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        if (sheetName) {
          const sheet = workbook.Sheets[sheetName];
          const rows: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });
          setParsedXlsxData({ sheetName, rows: rows.slice(0, 100) });
        } else {
          setParsedXlsxData(null);
        }
      } catch (err) {
        console.error('Failed to parse XLSX:', err);
        setParsedXlsxData(null);
      } finally {
        setIsXlsxParsing(false);
      }
      return;
    }

    // 4. Plain Text / JSON / Code
    const isTextFile =
      activeItem.type?.startsWith('text/') ||
      activeItem.type === 'application/json' ||
      activeItem.type === 'application/xml' ||
      activeItem.type === 'application/javascript' ||
      activeItem.type === 'text/csv' ||
      /\.(txt|json|csv|md|log|xml|html|js|ts|css|svg)$/i.test(activeItem.fileName || '');

    if (isTextFile && activeItem.dataUrl.includes(',')) {
      try {
        const base64Part = activeItem.dataUrl.split(',')[1];
        const rawString = atob(base64Part);
        const bytes = Uint8Array.from(rawString, (c) => c.charCodeAt(0));
        const decoded = new TextDecoder('utf-8').decode(bytes);
        setDecodedText(decoded);
        setParsedDocxParagraphs(null);
        setParsedXlsxData(null);
        setPdfPageUrls(null);
      } catch (err) {
        setDecodedText(null);
      }
    } else {
      setDecodedText(null);
      setParsedDocxParagraphs(null);
      setParsedXlsxData(null);
      setPdfPageUrls(null);
    }
  }, [activeItem, isDocx, isXlsx, isPdf]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'ArrowLeft' && currentIndex > 0) {
        setCurrentIndex((prev) => prev - 1);
        setZoomLevel(1);
      } else if (e.key === 'ArrowRight' && currentIndex < activeList.length - 1) {
        setCurrentIndex((prev) => prev + 1);
        setZoomLevel(1);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose, currentIndex, activeList.length]);

  if (!isOpen || !activeItem) return null;

  const isImage =
    mimeType.startsWith('image/') ||
    activeItem.dataUrl?.startsWith('data:image/') ||
    /\.(jpg|jpeg|png|webp|gif|svg)$/i.test(fileNameLower);

  const isAudio =
    mimeType.startsWith('audio/') ||
    activeItem.dataUrl?.startsWith('data:audio/') ||
    /\.(mp3|wav|ogg|m4a|aac|flac)$/i.test(fileNameLower);

  const isVideo =
    mimeType.startsWith('video/') ||
    activeItem.dataUrl?.startsWith('data:video/') ||
    /\.(mp4|webm|ogv)$/i.test(fileNameLower);

  const isText = decodedText !== null;

  const isArchive =
    mimeType.includes('zip') ||
    mimeType.includes('tar') ||
    mimeType.includes('compressed') ||
    /\.(zip|tar|gz|rar|7z)$/i.test(fileNameLower);

  const isOfficeDoc = /\.(docx?|xlsx?|pptx?)$/i.test(fileNameLower);

  const isSignature =
    activeItem.title?.toLowerCase().includes('signature') ||
    fileNameLower.includes('signature');

  // Direct safe local file download without about:blank tabs
  const handleDownload = () => {
    if (!activeItem?.dataUrl) return;
    try {
      const parts = activeItem.dataUrl.split(',');
      if (parts.length >= 2) {
        const mimeMatch = parts[0].match(/:(.*?);/);
        const mime = mimeMatch ? mimeMatch[1] : activeItem.type || 'application/octet-stream';
        const binary = atob(parts[1]);
        const array = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) {
          array[i] = binary.charCodeAt(i);
        }
        const blob = new Blob([array], { type: mime });
        const blobUrl = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = blobUrl;
        a.download = activeItem.fileName || (isImage ? 'photo_capture.jpg' : isPdf ? 'document.pdf' : 'attachment.dat');
        document.body.appendChild(a);
        a.click();
        setTimeout(() => {
          document.body.removeChild(a);
          URL.revokeObjectURL(blobUrl);
        }, 1000);
        return;
      }
      const a = document.createElement('a');
      a.href = activeItem.dataUrl;
      a.download = activeItem.fileName || 'attachment.dat';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch (err) {
      console.error('Download failed:', err);
    }
  };

  const handleZoomIn = () => setZoomLevel((prev) => Math.min(prev + 0.25, 3));
  const handleZoomOut = () => setZoomLevel((prev) => Math.max(prev - 0.25, 0.5));
  const handleResetZoom = () => setZoomLevel(1);

  const handlePrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex((prev) => prev - 1);
      setZoomLevel(1);
    }
  };

  const handleNext = () => {
    if (currentIndex < activeList.length - 1) {
      setCurrentIndex((prev) => prev + 1);
      setZoomLevel(1);
    }
  };

  const displayTitle = activeItem.title || activeItem.fileName || 'Attachment Preview';
  const fileSizeText = activeItem.size ? `${(activeItem.size / 1024).toFixed(1)} KB` : '';
  const fileMimeText = isPdf
    ? 'PDF Document'
    : isDocx
    ? 'Word Document (DOCX)'
    : isXlsx
    ? 'Spreadsheet (Excel)'
    : isOfficeDoc
    ? 'Office Document'
    : isArchive
    ? 'Archive ZIP'
    : isAudio
    ? 'Audio Track'
    : isVideo
    ? 'Video Clip'
    : isText
    ? 'Text Document'
    : isImage
    ? activeItem.type?.replace(/^image\//, '').toUpperCase() || 'IMAGE'
    : activeItem.type || 'FILE';

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.8)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        zIndex: 10700,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '0',
        overscrollBehavior: 'contain',
        touchAction: 'none'
      }}
      onClick={onClose}
    >
      <div
        style={{
          backgroundColor: 'var(--bg-card)',
          border: '1px solid var(--border-color)',
          borderRadius: '12px',
          width: '94vw',
          maxWidth: '1000px',
          height: '90vh',
          maxHeight: '840px',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          boxShadow: 'var(--shadow-lg)',
          position: 'relative'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Top Header Toolbar */}
        <div
          style={{
            padding: '0.85rem 1.15rem',
            borderBottom: '1px solid var(--border-color)',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.5rem',
            background: 'var(--bg-secondary)'
          }}
        >
          {/* Row 1: Title & Close Button */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              gap: '0.75rem'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', minWidth: 0, flex: 1 }}>
              <div
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '6px',
                  background: 'rgba(99, 102, 241, 0.12)',
                  border: '1px solid rgba(99, 102, 241, 0.25)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0
                }}
              >
                {isPdf ? (
                  <FileText size={18} color="var(--primary, #6366f1)" />
                ) : isDocx ? (
                  <FileText size={18} color="#3b82f6" />
                ) : isXlsx ? (
                  <Table size={18} color="#10b981" />
                ) : isImage ? (
                  <ImageIcon size={18} color="#818cf8" />
                ) : isText ? (
                  <FileCode size={18} color="#10b981" />
                ) : isAudio ? (
                  <Music size={18} color="#ec4899" />
                ) : isVideo ? (
                  <Video size={18} color="#3b82f6" />
                ) : isArchive ? (
                  <Archive size={18} color="#f59e0b" />
                ) : isOfficeDoc ? (
                  <FileText size={18} color="#3b82f6" />
                ) : (
                  <File size={18} color="#818cf8" />
                )}
              </div>
              <h3
                style={{
                  margin: 0,
                  fontSize: '0.98rem',
                  fontWeight: 600,
                  color: 'var(--text-primary)',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  flex: 1,
                  minWidth: 0
                }}
                title={displayTitle}
              >
                {displayTitle}
              </h3>
              {activeList.length > 1 && (
                <span
                  style={{
                    background: 'rgba(168, 85, 247, 0.15)',
                    color: 'var(--accent-purple, #8b5cf6)',
                    border: '1px solid rgba(168, 85, 247, 0.3)',
                    padding: '0.15rem 0.5rem',
                    borderRadius: '9999px',
                    fontSize: '0.72rem',
                    fontWeight: 600,
                    whiteSpace: 'nowrap',
                    flexShrink: 0
                  }}
                >
                  File {currentIndex + 1} of {activeList.length}
                </span>
              )}
            </div>

            {/* Circular Close Button */}
            <button
              onClick={onClose}
              style={{
                width: '34px',
                height: '34px',
                borderRadius: '50%',
                background: 'var(--bg-card)',
                border: '1px solid var(--border-color)',
                color: 'var(--text-secondary)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                flexShrink: 0,
                transition: 'all 0.15s ease'
              }}
              title="Close Preview (Esc)"
              aria-label="Close Preview"
            >
              <X size={18} />
            </button>
          </div>

          {/* Row 2: Metadata Pills & Action Toolbar */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '0.5rem'
            }}
          >
            {/* Metadata Pills */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
              {fileSizeText && (
                <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', background: 'var(--bg-card)', border: '1px solid var(--border-color)', padding: '0.2rem 0.45rem', borderRadius: '4px' }}>
                  {fileSizeText}
                </span>
              )}
              {fileMimeText && (
                <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', background: 'var(--bg-card)', border: '1px solid var(--border-color)', padding: '0.2rem 0.45rem', borderRadius: '4px' }}>
                  {fileMimeText}
                </span>
              )}
              {activeItem.capturedAt && (
                <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                  {activeItem.capturedAt}
                </span>
              )}
            </div>

            {/* Controls Toolbar Group */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', flexWrap: 'wrap' }}>
              {/* Multi-File Navigation Buttons */}
              {activeList.length > 1 && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.2rem', background: 'var(--bg-card)', border: '1px solid var(--border-color)', padding: '2px', borderRadius: '6px' }}>
                  <button
                    type="button"
                    onClick={handlePrev}
                    disabled={currentIndex === 0}
                    style={{
                      padding: '0.25rem 0.5rem',
                      fontSize: '0.75rem',
                      background: 'transparent',
                      border: 'none',
                      color: currentIndex === 0 ? 'var(--text-muted)' : 'var(--text-primary)',
                      cursor: currentIndex === 0 ? 'not-allowed' : 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.2rem'
                    }}
                    title="Previous Attachment (←)"
                    aria-label="Previous Attachment"
                  >
                    <ChevronLeft size={14} /> Prev
                  </button>
                  <button
                    type="button"
                    onClick={handleNext}
                    disabled={currentIndex === activeList.length - 1}
                    style={{
                      padding: '0.25rem 0.5rem',
                      fontSize: '0.75rem',
                      background: 'transparent',
                      border: 'none',
                      color: currentIndex === activeList.length - 1 ? 'var(--text-muted)' : 'var(--text-primary)',
                      cursor: currentIndex === activeList.length - 1 ? 'not-allowed' : 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.2rem'
                    }}
                    title="Next Attachment (→)"
                    aria-label="Next Attachment"
                  >
                    Next <ChevronRight size={14} />
                  </button>
                </div>
              )}

              {/* Zoom Controls for Images & PDFs */}
              {(isImage || isPdf) && activeItem.dataUrl && (
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.15rem',
                    background: 'var(--bg-card)',
                    border: '1px solid var(--border-color)',
                    padding: '2px 4px',
                    borderRadius: '6px'
                  }}
                >
                  <button
                    type="button"
                    onClick={handleZoomOut}
                    disabled={zoomLevel <= 0.5}
                    style={{
                      padding: '0.2rem 0.35rem',
                      background: 'transparent',
                      border: 'none',
                      color: zoomLevel <= 0.5 ? 'var(--text-muted)' : 'var(--text-secondary)',
                      cursor: zoomLevel <= 0.5 ? 'not-allowed' : 'pointer'
                    }}
                    title="Zoom Out"
                    aria-label="Zoom Out"
                  >
                    <ZoomOut size={13} />
                  </button>
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', minWidth: '34px', textAlign: 'center' }}>
                    {Math.round(zoomLevel * 100)}%
                  </span>
                  <button
                    type="button"
                    onClick={handleZoomIn}
                    disabled={zoomLevel >= 3}
                    style={{
                      padding: '0.2rem 0.35rem',
                      background: 'transparent',
                      border: 'none',
                      color: zoomLevel >= 3 ? 'var(--text-muted)' : 'var(--text-secondary)',
                      cursor: zoomLevel >= 3 ? 'not-allowed' : 'pointer'
                    }}
                    title="Zoom In"
                    aria-label="Zoom In"
                  >
                    <ZoomIn size={13} />
                  </button>
                  <button
                    type="button"
                    onClick={handleResetZoom}
                    style={{
                      padding: '0.2rem 0.35rem',
                      background: 'transparent',
                      border: 'none',
                      color: 'var(--text-secondary)',
                      cursor: 'pointer'
                    }}
                    title="Fit to Screen (100%)"
                    aria-label="Fit to Screen"
                  >
                    <Maximize2 size={12} />
                  </button>
                </div>
              )}

              {/* Header Quick Download Button */}
              {activeItem.dataUrl && (
                <button
                  type="button"
                  onClick={handleDownload}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.35rem',
                    fontSize: '0.78rem',
                    fontWeight: 600,
                    padding: '0.35rem 0.75rem',
                    background: 'var(--primary)',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer'
                  }}
                  title="Download File Copy"
                  aria-label="Download File Copy"
                >
                  <Download size={13} />
                  <span>Download</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Media Content Preview Body — Theme Reactive & In-App Native */}
        <div
          style={{
            flex: 1,
            position: 'relative',
            padding: isText || isDocx || isXlsx || isPdf ? '1rem' : '1.5rem 1rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: isSignature ? '#050811' : 'var(--bg-primary)',
            overflow: 'auto',
            minHeight: '260px',
            overscrollBehavior: 'contain',
            touchAction: 'pan-x pan-y pinch-zoom',
            WebkitOverflowScrolling: 'touch'
          }}
        >
          {isPdfRendering ? (
            <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '2rem' }}>
              <div className="spinner" style={{ width: '28px', height: '28px', margin: '0 auto 1rem auto', border: '3px solid var(--border-color)', borderTopColor: 'var(--primary)', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
              <p style={{ fontSize: '0.9rem' }}>Rendering PDF Document in-app...</p>
            </div>
          ) : isPdf && pdfPageUrls && pdfPageUrls.length > 0 ? (
            /* 1. Native In-App Visual Multi-Page PDF Viewer with Zoom */
            <div
              style={{
                width: '100%',
                height: '100%',
                maxHeight: 'calc(90vh - 180px)',
                overflow: 'auto',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '1.25rem',
                padding: '0.5rem',
                boxSizing: 'border-box'
              }}
            >
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '1.25rem',
                  transform: `scale(${zoomLevel})`,
                  transformOrigin: 'top center',
                  transition: 'transform 0.12s ease-out',
                  maxWidth: '100%'
                }}
              >
                {pdfPageUrls.map((pageUrl, pageIdx) => (
                  <div
                    key={pageIdx}
                    style={{
                      position: 'relative',
                      background: '#ffffff',
                      boxShadow: 'var(--shadow-md)',
                      border: '1px solid var(--border-color)',
                      borderRadius: '4px',
                      overflow: 'hidden',
                      maxWidth: '100%'
                    }}
                  >
                    <img
                      src={pageUrl}
                      alt={`PDF Page ${pageIdx + 1}`}
                      style={{
                        display: 'block',
                        maxWidth: '100%',
                        height: 'auto',
                        maxHeight: '85vh',
                        objectFit: 'contain'
                      }}
                    />
                    <div
                      style={{
                        position: 'absolute',
                        bottom: '8px',
                        right: '8px',
                        background: 'rgba(15, 23, 42, 0.75)',
                        color: '#ffffff',
                        padding: '0.15rem 0.5rem',
                        borderRadius: '4px',
                        fontSize: '0.7rem',
                        fontWeight: 600
                      }}
                    >
                      Page {pageIdx + 1} of {pdfPageCount}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : isDocxParsing ? (
            <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '2rem' }}>
              <div className="spinner" style={{ width: '28px', height: '28px', margin: '0 auto 1rem auto', border: '3px solid var(--border-color)', borderTopColor: '#3b82f6', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
              <p style={{ fontSize: '0.9rem' }}>Parsing Word Document in-app...</p>
            </div>
          ) : isDocx && parsedDocxParagraphs ? (
            /* 2. Native In-App DOCX Document Viewer */
            <div
              style={{
                width: '100%',
                maxWidth: '780px',
                height: '100%',
                maxHeight: 'calc(90vh - 180px)',
                overflow: 'auto',
                background: 'var(--bg-card)',
                border: '1px solid var(--border-color)',
                borderRadius: '10px',
                padding: '1.5rem',
                color: 'var(--text-primary)',
                boxShadow: 'var(--shadow-md)'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <FileText size={20} color="var(--primary, #6366f1)" />
                  <span style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--text-primary)', wordBreak: 'break-word' }}>{activeItem.fileName}</span>
                </div>
                <span className="badge badge-purple" style={{ fontSize: '0.72rem' }}>DOCX In-App View</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', lineHeight: 1.6, fontSize: '0.9rem' }}>
                {parsedDocxParagraphs.map((paragraph, pIdx) => (
                  <p key={pIdx} style={{ margin: 0, wordBreak: 'break-word', color: pIdx === 0 ? 'var(--text-primary)' : 'var(--text-secondary)', fontWeight: pIdx === 0 ? 600 : 400 }}>
                    {paragraph}
                  </p>
                ))}
              </div>
            </div>
          ) : isXlsxParsing ? (
            <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '2rem' }}>
              <div className="spinner" style={{ width: '28px', height: '28px', margin: '0 auto 1rem auto', border: '3px solid var(--border-color)', borderTopColor: '#10b981', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
              <p style={{ fontSize: '0.9rem' }}>Parsing Spreadsheet in-app...</p>
            </div>
          ) : isXlsx && parsedXlsxData ? (
            /* 3. Native In-App Spreadsheet (XLSX) Viewer */
            <div
              style={{
                width: '100%',
                height: '100%',
                maxHeight: 'calc(90vh - 180px)',
                overflow: 'auto',
                background: 'var(--bg-card)',
                border: '1px solid var(--border-color)',
                borderRadius: '10px',
                padding: '1rem'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#10b981' }}>Sheet: {parsedXlsxData.sheetName}</span>
                <span className="badge badge-green" style={{ fontSize: '0.72rem' }}>Spreadsheet Preview</span>
              </div>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem', color: 'var(--text-primary)' }}>
                  <tbody>
                    {parsedXlsxData.rows.map((row, rIdx) => (
                      <tr key={rIdx} style={{ background: rIdx === 0 ? 'var(--bg-secondary)' : 'transparent', borderBottom: '1px solid var(--border-color)' }}>
                        {row.map((cell, cIdx) => (
                          <td key={cIdx} style={{ padding: '0.45rem 0.6rem', borderRight: '1px solid var(--border-color)', fontWeight: rIdx === 0 ? 600 : 400, whiteSpace: 'nowrap' }}>
                            {String(cell ?? '')}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : isImage && activeItem.dataUrl ? (
            /* 4. Full-Resolution Image Viewer with Zoom */
            <div
              style={{
                transform: `scale(${zoomLevel})`,
                transition: 'transform 0.12s ease-out',
                transformOrigin: 'center center',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                maxWidth: '100%',
                maxHeight: '100%'
              }}
            >
              <img
                src={activeItem.dataUrl}
                alt={displayTitle}
                style={{
                  maxWidth: '100%',
                  maxHeight: 'calc(90vh - 180px)',
                  objectFit: 'contain',
                  borderRadius: '6px',
                  boxShadow: 'var(--shadow-md)',
                  backgroundColor: isSignature ? 'rgba(255, 255, 255, 0.05)' : 'transparent'
                }}
              />
            </div>
          ) : isText && decodedText !== null ? (
            /* 5. Decoded Text / JSON / CSV / Markdown Viewer */
            <div
              style={{
                width: '100%',
                height: '100%',
                maxHeight: 'calc(90vh - 180px)',
                overflow: 'auto',
                background: 'var(--bg-card)',
                border: '1px solid var(--border-color)',
                borderRadius: '8px',
                padding: '1.25rem',
                fontFamily: 'monospace',
                fontSize: '0.84rem',
                color: 'var(--text-primary)',
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word',
                textAlign: 'left',
                lineHeight: 1.5
              }}
            >
              {decodedText}
            </div>
          ) : isAudio && activeItem.dataUrl ? (
            /* 6. Native HTML5 Audio Player Card */
            <div
              style={{
                background: 'var(--bg-card)',
                border: '1px solid var(--border-color)',
                borderRadius: '12px',
                padding: '2rem 1.5rem',
                textAlign: 'center',
                maxWidth: '440px',
                width: '100%',
                boxShadow: 'var(--shadow-md)',
                boxSizing: 'border-box'
              }}
            >
              <Music size={48} color="#ec4899" style={{ margin: '0 auto 1rem auto' }} />
              <h4
                style={{
                  margin: '0 0 0.5rem 0',
                  fontSize: '1.05rem',
                  fontWeight: 700,
                  color: 'var(--text-primary)',
                  wordBreak: 'break-word',
                  overflowWrap: 'anywhere',
                  whiteSpace: 'normal',
                  lineHeight: 1.4
                }}
              >
                {activeItem.fileName || 'Audio Recording'}
              </h4>
              <p style={{ margin: '0 0 1.25rem 0', fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                Audio File {fileSizeText ? `• ${fileSizeText}` : ''}
              </p>
              <audio controls src={activeItem.dataUrl} style={{ width: '100%', outline: 'none' }} />
            </div>
          ) : isVideo && activeItem.dataUrl ? (
            /* 7. Native HTML5 Video Player */
            <video
              controls
              src={activeItem.dataUrl}
              style={{
                maxWidth: '100%',
                maxHeight: 'calc(90vh - 180px)',
                borderRadius: '6px',
                boxShadow: 'var(--shadow-md)'
              }}
            />
          ) : (
            /* 8. Fallback Archive / Binary Card */
            <div
              style={{
                background: 'var(--bg-card)',
                border: '1px solid var(--border-color)',
                borderRadius: '12px',
                padding: '2rem 1.5rem',
                textAlign: 'center',
                maxWidth: '460px',
                width: '100%',
                boxShadow: 'var(--shadow-md)',
                boxSizing: 'border-box'
              }}
            >
              <div
                style={{
                  width: '68px',
                  height: '68px',
                  borderRadius: '16px',
                  margin: '0 auto 1.25rem auto',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: isArchive
                    ? 'rgba(245, 158, 11, 0.12)'
                    : 'rgba(99, 102, 241, 0.12)',
                  border: isArchive
                    ? '1px solid rgba(245, 158, 11, 0.3)'
                    : '1px solid rgba(99, 102, 241, 0.3)'
                }}
              >
                {isArchive ? (
                  <Archive size={38} color="#f59e0b" />
                ) : (
                  <File size={38} color="var(--primary, #6366f1)" />
                )}
              </div>

              <h4
                style={{
                  margin: '0 0 0.6rem 0',
                  fontSize: '1.1rem',
                  fontWeight: 700,
                  color: 'var(--text-primary)',
                  wordBreak: 'break-word',
                  overflowWrap: 'anywhere',
                  whiteSpace: 'normal',
                  lineHeight: 1.4
                }}
              >
                {activeItem.fileName || 'Attached Document'}
              </h4>

              <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.45rem', flexWrap: 'wrap', marginBottom: '1.5rem' }}>
                <span className="badge badge-purple" style={{ fontSize: '0.75rem', padding: '0.2rem 0.55rem' }}>
                  {fileMimeText}
                </span>
                {fileSizeText && (
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', background: 'var(--bg-secondary)', padding: '0.2rem 0.55rem', borderRadius: '4px' }}>
                    {fileSizeText}
                  </span>
                )}
                <span className="badge badge-green" style={{ fontSize: '0.75rem', padding: '0.2rem 0.55rem' }}>
                  IndexedDB Stored
                </span>
              </div>

              {activeItem.dataUrl && (
                <button
                  type="button"
                  onClick={handleDownload}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.5rem',
                    padding: '0.65rem 1.25rem',
                    background: 'var(--primary)',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '8px',
                    fontWeight: 600,
                    fontSize: '0.88rem',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    width: '100%',
                    maxWidth: '280px',
                    margin: '0 auto'
                  }}
                  title="Download File"
                >
                  <Download size={16} />
                  <span>Download File</span>
                </button>
              )}
            </div>
          )}
        </div>

        {/* Modal Footer Info */}
        <div
          style={{
            padding: '0.65rem 1.15rem',
            borderTop: '1px solid var(--border-color)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            background: 'var(--bg-secondary)',
            fontSize: '0.75rem',
            color: 'var(--text-muted)',
            flexWrap: 'wrap',
            gap: '0.4rem'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <ShieldCheck size={14} color="#10b981" />
            <span style={{ color: 'var(--text-secondary)' }}>100% Offline & Locally Stored</span>
          </div>
          <div style={{ color: 'var(--text-muted)', fontSize: '0.72rem' }}>
            {activeList.length > 1 ? '← / → arrows to flip files • ' : ''}Press Esc to close
          </div>
        </div>
      </div>
    </div>
  );
};
