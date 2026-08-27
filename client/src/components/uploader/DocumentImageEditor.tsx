import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  RotateCw,
  RotateCcw,
  FlipHorizontal,
  FlipVertical,
  Crop,
  ZoomIn,
  ZoomOut,
  Rotate3D,
  Check,
  X,
  Maximize2,
  RefreshCw,
  Sliders,
  Scissors,
  Sparkles
} from 'lucide-react';

interface DocumentImageEditorProps {
  imageSrc: string;
  originalFileName: string;
  isOpen: boolean;
  onClose: () => void;
  onSave: (editedFile: File, editedDataUrl: string) => void;
}

type AspectRatioOption = 'FREE' | 'PASSPORT' | 'ID_CARD' | 'SQUARE' | 'DOC_4_3';

export const DocumentImageEditor: React.FC<DocumentImageEditorProps> = ({
  imageSrc,
  originalFileName,
  isOpen,
  onClose,
  onSave
}) => {
  const [rotation, setRotation] = useState<number>(0); // 0, 90, 180, 270
  const [flipH, setFlipH] = useState<boolean>(false);
  const [flipV, setFlipV] = useState<boolean>(false);
  const [zoom, setZoom] = useState<number>(1);
  const [aspectRatio, setAspectRatio] = useState<AspectRatioOption>('FREE');
  const [cropEnabled, setCropEnabled] = useState<boolean>(true);

  // Normalized crop rectangle (0 to 1 coordinates relative to rotated image)
  const [cropRect, setCropRect] = useState<{ x: number; y: number; width: number; height: number }>({
    x: 0.05,
    y: 0.05,
    width: 0.9,
    height: 0.9
  });

  const [activeHandle, setActiveHandle] = useState<string | null>(null);
  const [dragStart, setDragStart] = useState<{ x: number; y: number; crop: typeof cropRect } | null>(null);

  const containerRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [imageObj, setImageObj] = useState<HTMLImageElement | null>(null);
  const [dimensions, setDimensions] = useState<{ width: number; height: number }>({ width: 0, height: 0 });

  // Load image object
  useEffect(() => {
    if (!imageSrc) return;
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      setImageObj(img);
      setDimensions({ width: img.naturalWidth, height: img.naturalHeight });
      // Reset crop to full coverage
      setCropRect({ x: 0.05, y: 0.05, width: 0.9, height: 0.9 });
      setRotation(0);
      setFlipH(false);
      setFlipV(false);
      setZoom(1);
    };
    img.src = imageSrc;
  }, [imageSrc, isOpen]);

  // Adjust aspect ratio presets
  const applyAspectRatio = useCallback((ratio: AspectRatioOption) => {
    setAspectRatio(ratio);
    if (!imageObj) return;

    const isRotated90or270 = rotation === 90 || rotation === 270;
    const currentW = isRotated90or270 ? imageObj.naturalHeight : imageObj.naturalWidth;
    const currentH = isRotated90or270 ? imageObj.naturalWidth : imageObj.naturalHeight;

    let targetRatio = 1;
    if (ratio === 'FREE') return;
    if (ratio === 'PASSPORT') targetRatio = 1.42; // TD3 ~ 125/88 mm
    if (ratio === 'ID_CARD') targetRatio = 1.58; // TD1 ~ 85.6/53.98 mm
    if (ratio === 'SQUARE') targetRatio = 1.0;
    if (ratio === 'DOC_4_3') targetRatio = 4 / 3;

    let newW = 0.85;
    let newH = (newW * currentW) / (targetRatio * currentH);

    if (newH > 0.85) {
      newH = 0.85;
      newW = (newH * currentH * targetRatio) / currentW;
    }

    setCropRect({
      x: Math.max(0.02, (1 - newW) / 2),
      y: Math.max(0.02, (1 - newH) / 2),
      width: Math.min(0.96, newW),
      height: Math.min(0.96, newH)
    });
  }, [imageObj, rotation]);

  // Handle Dragging Crop Box & Handles
  const handleMouseDown = (e: React.MouseEvent, handle: string) => {
    e.stopPropagation();
    e.preventDefault();
    setActiveHandle(handle);
    setDragStart({
      x: e.clientX,
      y: e.clientY,
      crop: { ...cropRect }
    });
  };

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!activeHandle || !dragStart || !containerRef.current) return;

    const rect = containerRef.current.getBoundingClientRect();
    const deltaX = (e.clientX - dragStart.x) / rect.width;
    const deltaY = (e.clientY - dragStart.y) / rect.height;

    const initial = dragStart.crop;
    let newCrop = { ...initial };

    const minSize = 0.1; // 10% minimum width/height

    if (activeHandle === 'MOVE') {
      newCrop.x = Math.max(0, Math.min(1 - initial.width, initial.x + deltaX));
      newCrop.y = Math.max(0, Math.min(1 - initial.height, initial.y + deltaY));
    } else {
      if (activeHandle.includes('left')) {
        const rightEdge = initial.x + initial.width;
        newCrop.x = Math.max(0, Math.min(rightEdge - minSize, initial.x + deltaX));
        newCrop.width = rightEdge - newCrop.x;
      }
      if (activeHandle.includes('right')) {
        newCrop.width = Math.max(minSize, Math.min(1 - initial.x, initial.width + deltaX));
      }
      if (activeHandle.includes('top')) {
        const bottomEdge = initial.y + initial.height;
        newCrop.y = Math.max(0, Math.min(bottomEdge - minSize, initial.y + deltaY));
        newCrop.height = bottomEdge - newCrop.y;
      }
      if (activeHandle.includes('bottom')) {
        newCrop.height = Math.max(minSize, Math.min(1 - initial.y, initial.height + deltaY));
      }
    }

    setCropRect(newCrop);
  }, [activeHandle, dragStart]);

  const handleMouseUp = useCallback(() => {
    setActiveHandle(null);
    setDragStart(null);
  }, []);

  useEffect(() => {
    if (activeHandle) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [activeHandle, handleMouseMove, handleMouseUp]);

  // Rotate handlers
  const rotateRight = () => {
    setRotation((r) => (r + 90) % 360);
  };

  const rotateLeft = () => {
    setRotation((r) => (r + 270) % 360);
  };

  const rotate180 = () => {
    setRotation((r) => (r + 180) % 360);
  };

  // Generate and Save the Cropped & Rotated Document Image
  const handleApplyAndSave = () => {
    if (!imageObj) return;

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const isRotated90or270 = rotation === 90 || rotation === 270;
    const rotatedW = isRotated90or270 ? imageObj.naturalHeight : imageObj.naturalWidth;
    const rotatedH = isRotated90or270 ? imageObj.naturalWidth : imageObj.naturalHeight;

    // 1. Temporary canvas for full rotation & flip
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = rotatedW;
    tempCanvas.height = rotatedH;
    const tempCtx = tempCanvas.getContext('2d');
    if (!tempCtx) return;

    tempCtx.save();
    tempCtx.translate(rotatedW / 2, rotatedH / 2);
    tempCtx.rotate((rotation * Math.PI) / 180);
    tempCtx.scale(flipH ? -1 : 1, flipV ? -1 : 1);
    tempCtx.drawImage(imageObj, -imageObj.naturalWidth / 2, -imageObj.naturalHeight / 2);
    tempCtx.restore();

    // 2. Crop from rotated canvas
    let cropX = 0;
    let cropY = 0;
    let cropW = rotatedW;
    let cropH = rotatedH;

    if (cropEnabled) {
      cropX = Math.round(cropRect.x * rotatedW);
      cropY = Math.round(cropRect.y * rotatedH);
      cropW = Math.round(cropRect.width * rotatedW);
      cropH = Math.round(cropRect.height * rotatedH);
    }

    canvas.width = Math.max(10, cropW);
    canvas.height = Math.max(10, cropH);

    ctx.drawImage(tempCanvas, cropX, cropY, cropW, cropH, 0, 0, canvas.width, canvas.height);

    // 3. Export to Blob and File
    canvas.toBlob(
      (blob) => {
        if (blob) {
          const ext = originalFileName.includes('.png') ? 'png' : 'jpg';
          const mimeType = ext === 'png' ? 'image/png' : 'image/jpeg';
          const editedFile = new File([blob], `edited_${Date.now()}.${ext}`, { type: mimeType });
          const dataUrl = canvas.toDataURL(mimeType, 0.95);
          onSave(editedFile, dataUrl);
          onClose();
        }
      },
      originalFileName.includes('.png') ? 'image/png' : 'image/jpeg',
      0.95
    );
  };

  const handleReset = () => {
    setRotation(0);
    setFlipH(false);
    setFlipV(false);
    setZoom(1);
    setCropRect({ x: 0.05, y: 0.05, width: 0.9, height: 0.9 });
    setAspectRatio('FREE');
  };

  if (!isOpen || !imageSrc) return null;

  const isRotated90or270 = rotation === 90 || rotation === 270;
  const currentDisplayW = isRotated90or270 ? dimensions.height : dimensions.width;
  const currentDisplayH = isRotated90or270 ? dimensions.width : dimensions.height;

  const estimatedCropW = Math.round(cropRect.width * currentDisplayW);
  const estimatedCropH = Math.round(cropRect.height * currentDisplayH);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 backdrop-blur-md p-4 overflow-y-auto animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-700 w-full max-w-5xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/60">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-xl bg-blue-500/20 text-blue-400 border border-blue-500/30">
              <Scissors className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white flex items-center space-x-2">
                <span>Document Image Studio (Rotate & Crop)</span>
                <span className="text-[10px] font-mono bg-blue-500/20 text-blue-400 px-2 py-0.5 rounded border border-blue-500/30 font-semibold">
                  {rotation}° Rotation
                </span>
              </h3>
              <p className="text-xs text-slate-400">
                Adjust orientation, align document boundaries, and crop to standard aspect ratio before analysis.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Studio Workspace Body */}
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 overflow-hidden min-h-[460px]">
          {/* Left Canvas Preview Stage (8 cols) */}
          <div className="lg:col-span-8 p-6 flex flex-col items-center justify-center bg-slate-950/80 relative overflow-hidden select-none border-b lg:border-b-0 lg:border-r border-slate-800">
            {/* Visual Canvas Container */}
            <div
              ref={containerRef}
              className="relative max-w-full max-h-[55vh] flex items-center justify-center overflow-hidden rounded-xl border border-slate-800 bg-slate-900/50 shadow-inner"
              style={{
                aspectRatio: `${currentDisplayW} / ${currentDisplayH}`
              }}
            >
              {/* Rotated & Scaled Document Image */}
              <img
                src={imageSrc}
                alt="Document Preview"
                className="max-h-[55vh] w-auto object-contain transition-transform duration-200 pointer-events-none"
                style={{
                  transform: `rotate(${rotation}deg) scaleX(${flipH ? -1 : 1}) scaleY(${flipV ? -1 : 1}) scale(${zoom})`
                }}
              />

              {/* Interactive Draggable Crop Overlay */}
              {cropEnabled && (
                <div
                  className="absolute inset-0 pointer-events-none"
                  style={{
                    transform: `scale(${zoom})`
                  }}
                >
                  {/* Outer Dark Mask with transparent crop hole */}
                  <div
                    className="absolute border-2 border-blue-400 shadow-[0_0_0_9999px_rgba(15,23,42,0.65)] pointer-events-auto cursor-move transition-all"
                    style={{
                      left: `${cropRect.x * 100}%`,
                      top: `${cropRect.y * 100}%`,
                      width: `${cropRect.width * 100}%`,
                      height: `${cropRect.height * 100}%`
                    }}
                    onMouseDown={(e) => handleMouseDown(e, 'MOVE')}
                  >
                    {/* Grid Rule-of-Thirds Inside Crop Box */}
                    <div className="w-full h-full grid grid-cols-3 grid-rows-3 pointer-events-none opacity-40">
                      <div className="border-r border-b border-blue-300 border-dashed" />
                      <div className="border-r border-b border-blue-300 border-dashed" />
                      <div className="border-b border-blue-300 border-dashed" />
                      <div className="border-r border-b border-blue-300 border-dashed" />
                      <div className="border-r border-b border-blue-300 border-dashed" />
                      <div className="border-b border-blue-300 border-dashed" />
                      <div className="border-r border-blue-300 border-dashed" />
                      <div className="border-r border-blue-300 border-dashed" />
                      <div />
                    </div>

                    {/* 4 Corner Handles */}
                    <div
                      className="absolute -top-1.5 -left-1.5 w-3.5 h-3.5 bg-blue-500 border-2 border-white rounded-full cursor-nwse-resize shadow-md"
                      onMouseDown={(e) => handleMouseDown(e, 'top-left')}
                    />
                    <div
                      className="absolute -top-1.5 -right-1.5 w-3.5 h-3.5 bg-blue-500 border-2 border-white rounded-full cursor-nesw-resize shadow-md"
                      onMouseDown={(e) => handleMouseDown(e, 'top-right')}
                    />
                    <div
                      className="absolute -bottom-1.5 -left-1.5 w-3.5 h-3.5 bg-blue-500 border-2 border-white rounded-full cursor-nesw-resize shadow-md"
                      onMouseDown={(e) => handleMouseDown(e, 'bottom-left')}
                    />
                    <div
                      className="absolute -bottom-1.5 -right-1.5 w-3.5 h-3.5 bg-blue-500 border-2 border-white rounded-full cursor-nwse-resize shadow-md"
                      onMouseDown={(e) => handleMouseDown(e, 'bottom-right')}
                    />

                    {/* 4 Edge Center Handles */}
                    <div
                      className="absolute top-1/2 -left-1 -translate-y-1/2 w-2 h-4 bg-blue-400 rounded-xs cursor-ew-resize"
                      onMouseDown={(e) => handleMouseDown(e, 'left')}
                    />
                    <div
                      className="absolute top-1/2 -right-1 -translate-y-1/2 w-2 h-4 bg-blue-400 rounded-xs cursor-ew-resize"
                      onMouseDown={(e) => handleMouseDown(e, 'right')}
                    />
                    <div
                      className="absolute -top-1 left-1/2 -translate-x-1/2 w-4 h-2 bg-blue-400 rounded-xs cursor-ns-resize"
                      onMouseDown={(e) => handleMouseDown(e, 'top')}
                    />
                    <div
                      className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-4 h-2 bg-blue-400 rounded-xs cursor-ns-resize"
                      onMouseDown={(e) => handleMouseDown(e, 'bottom')}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Resolution Readout Pill */}
            <div className="mt-4 flex items-center space-x-3 text-xs text-slate-400 font-mono">
              <span className="bg-slate-900 px-3 py-1 rounded-lg border border-slate-800">
                Source: {currentDisplayW} × {currentDisplayH} px
              </span>
              <span className="bg-blue-950 text-blue-400 px-3 py-1 rounded-lg border border-blue-900">
                Crop Area: {estimatedCropW} × {estimatedCropH} px
              </span>
            </div>
          </div>

          {/* Right Control Tools Panel (4 cols) */}
          <div className="lg:col-span-4 p-6 bg-slate-900 space-y-6 overflow-y-auto">
            {/* 1. Orientation & Rotation Section */}
            <div className="space-y-2.5">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center space-x-1.5">
                <RotateCw className="w-3.5 h-3.5 text-blue-400" />
                <span>Rotation & Orientation</span>
              </label>

              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={rotateLeft}
                  className="flex flex-col items-center justify-center p-3 rounded-xl bg-slate-800 hover:bg-slate-750 border border-slate-700 text-slate-200 hover:text-white transition-all text-xs font-semibold"
                  title="Rotate 90° Left"
                >
                  <RotateCcw className="w-4 h-4 mb-1 text-blue-400" />
                  <span>90° Left</span>
                </button>

                <button
                  type="button"
                  onClick={rotateRight}
                  className="flex flex-col items-center justify-center p-3 rounded-xl bg-slate-800 hover:bg-slate-750 border border-slate-700 text-slate-200 hover:text-white transition-all text-xs font-semibold"
                  title="Rotate 90° Right"
                >
                  <RotateCw className="w-4 h-4 mb-1 text-blue-400" />
                  <span>90° Right</span>
                </button>

                <button
                  type="button"
                  onClick={rotate180}
                  className="flex flex-col items-center justify-center p-3 rounded-xl bg-slate-800 hover:bg-slate-750 border border-slate-700 text-slate-200 hover:text-white transition-all text-xs font-semibold"
                  title="Rotate 180° Flip"
                >
                  <Rotate3D className="w-4 h-4 mb-1 text-purple-400" />
                  <span>180° Flip</span>
                </button>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setFlipH((f) => !f)}
                  className={`flex items-center justify-center space-x-2 py-2 px-3 rounded-xl border text-xs font-semibold transition-all ${
                    flipH
                      ? 'bg-blue-600/30 border-blue-500 text-blue-300'
                      : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-750'
                  }`}
                >
                  <FlipHorizontal className="w-3.5 h-3.5" />
                  <span>Flip Horizontal</span>
                </button>

                <button
                  type="button"
                  onClick={() => setFlipV((f) => !f)}
                  className={`flex items-center justify-center space-x-2 py-2 px-3 rounded-xl border text-xs font-semibold transition-all ${
                    flipV
                      ? 'bg-blue-600/30 border-blue-500 text-blue-300'
                      : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-750'
                  }`}
                >
                  <FlipVertical className="w-3.5 h-3.5" />
                  <span>Flip Vertical</span>
                </button>
              </div>
            </div>

            {/* 2. Aspect Ratio Presets */}
            <div className="space-y-2.5">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center space-x-1.5">
                <Crop className="w-3.5 h-3.5 text-blue-400" />
                <span>Standard Crop Presets</span>
              </label>

              <div className="grid grid-cols-2 gap-2">
                {[
                  { id: 'FREE', label: 'Freeform', desc: 'Custom box' },
                  { id: 'PASSPORT', label: 'Passport (3:2)', desc: 'ICAO TD3' },
                  { id: 'ID_CARD', label: 'ID Card (16:9)', desc: 'ICAO TD1' },
                  { id: 'DOC_4_3', label: 'Document (4:3)', desc: 'Standard page' },
                  { id: 'SQUARE', label: 'Square (1:1)', desc: 'Avatar / Photo' }
                ].map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => applyAspectRatio(p.id as AspectRatioOption)}
                    className={`p-2.5 rounded-xl border text-left transition-all ${
                      aspectRatio === p.id
                        ? 'bg-blue-600/20 border-blue-500 text-white shadow-xs ring-1 ring-blue-500'
                        : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-750'
                    }`}
                  >
                    <div className="text-xs font-bold">{p.label}</div>
                    <div className="text-[10px] text-slate-400">{p.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* 3. Zoom Slider */}
            <div className="space-y-2 pt-2 border-t border-slate-800">
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-400 font-semibold flex items-center space-x-1">
                  <ZoomIn className="w-3.5 h-3.5 text-slate-500" />
                  <span>Preview Zoom</span>
                </span>
                <span className="font-mono text-blue-400 font-bold">{Math.round(zoom * 100)}%</span>
              </div>
              <div className="flex items-center space-x-3">
                <button
                  type="button"
                  onClick={() => setZoom((z) => Math.max(0.5, z - 0.1))}
                  className="p-1 rounded-lg bg-slate-800 text-slate-400 hover:text-white"
                >
                  <ZoomOut className="w-3.5 h-3.5" />
                </button>
                <input
                  type="range"
                  min="0.5"
                  max="2.5"
                  step="0.05"
                  value={zoom}
                  onChange={(e) => setZoom(parseFloat(e.target.value))}
                  className="w-full accent-blue-500"
                />
                <button
                  type="button"
                  onClick={() => setZoom((z) => Math.min(2.5, z + 0.1))}
                  className="p-1 rounded-lg bg-slate-800 text-slate-400 hover:text-white"
                >
                  <ZoomIn className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* 4. Reset & Quick Actions */}
            <div className="pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={handleReset}
                className="w-full py-2.5 rounded-xl border border-slate-700 bg-slate-800 hover:bg-slate-750 text-slate-300 hover:text-white text-xs font-semibold flex items-center justify-center space-x-2 transition-all"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Reset to Original Framing</span>
              </button>
            </div>
          </div>
        </div>

        {/* Modal Footer Controls */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-slate-800 bg-slate-950/80">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl border border-slate-700 hover:bg-slate-800 text-slate-300 text-xs font-semibold transition-colors"
          >
            Cancel & Discard
          </button>

          <div className="flex items-center space-x-3">
            <button
              type="button"
              onClick={handleApplyAndSave}
              className="flex items-center space-x-2 px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-md hover:shadow-blue-500/25 transition-all transform active:scale-95"
            >
              <Check className="w-4 h-4" />
              <span>Apply & Use Adjusted Image</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
