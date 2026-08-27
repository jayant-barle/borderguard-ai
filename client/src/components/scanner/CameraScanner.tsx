import React, { useRef, useState, useEffect } from 'react';
import { Camera, RefreshCw, X, Check, AlertCircle, SwitchCamera, Scissors } from 'lucide-react';
import { DocumentImageEditor } from '../uploader/DocumentImageEditor';

interface CameraScannerProps {
  onCapture: (imageBase64: string) => void;
  onCancel: () => void;
}

export const CameraScanner: React.FC<CameraScannerProps> = ({ onCapture, onCancel }) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [loading, setLoading] = useState<boolean>(true);
  const [isEditorOpen, setIsEditorOpen] = useState<boolean>(false);

  const startCamera = async () => {
    setLoading(true);
    setError(null);

    // Stop existing stream tracks
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
    }

    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Camera API is not supported in your browser environment.');
      }

      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: facingMode,
          width: { ideal: 1920 },
          height: { ideal: 1080 }
        },
        audio: false
      });

      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
      setLoading(false);
    } catch (err: any) {
      console.warn('Camera access error:', err);
      setLoading(false);
      setError(
        'Camera access unavailable.\nPlease allow camera permission or use the "Upload Document" tab.'
      );
    }
  };

  useEffect(() => {
    startCamera();
    return () => {
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
    };
  }, [facingMode]);

  const handleCapture = () => {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;

    canvas.width = video.videoWidth || 1280;
    canvas.height = video.videoHeight || 720;

    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL('image/png');
      setCapturedImage(dataUrl);
    }
  };

  const handleRetake = () => {
    setCapturedImage(null);
  };

  const handleConfirm = () => {
    if (capturedImage) {
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
      onCapture(capturedImage);
    }
  };

  const toggleFacingMode = () => {
    setFacingMode((prev) => (prev === 'environment' ? 'user' : 'environment'));
  };

  return (
    <div className="relative bg-slate-950 rounded-2xl overflow-hidden shadow-2xl border border-slate-800 text-white">
      {/* Top Controls Bar */}
      <div className="absolute top-0 inset-x-0 p-4 bg-gradient-to-b from-black/80 to-transparent z-20 flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-ping" />
          <span className="text-xs font-mono font-semibold tracking-wider text-slate-200 uppercase">
            Live Optical Capture
          </span>
        </div>
        <div className="flex items-center space-x-2">
          {!capturedImage && !error && (
            <button
              onClick={toggleFacingMode}
              className="p-2 rounded-full bg-slate-800/80 hover:bg-slate-700 text-white transition-colors"
              title="Switch Camera"
            >
              <SwitchCamera className="w-4 h-4" />
            </button>
          )}
          <button
            onClick={onCancel}
            className="p-2 rounded-full bg-slate-800/80 hover:bg-slate-700 text-white transition-colors"
            title="Close Camera"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main Viewport Area */}
      <div className="relative aspect-4/3 sm:aspect-16/10 w-full flex items-center justify-center bg-slate-900 overflow-hidden">
        {loading && (
          <div className="flex flex-col items-center space-y-3 text-slate-400">
            <RefreshCw className="w-8 h-8 animate-spin text-blue-500" />
            <p className="text-xs">Initializing camera feed...</p>
          </div>
        )}

        {error && (
          <div className="p-6 text-center max-w-md space-y-3">
            <div className="w-12 h-12 rounded-full bg-rose-500/20 border border-rose-500/40 text-rose-400 flex items-center justify-center mx-auto">
              <AlertCircle className="w-6 h-6" />
            </div>
            <h4 className="text-sm font-bold text-white">Camera Access Restricted</h4>
            <p className="text-xs text-slate-400 whitespace-pre-line leading-relaxed">{error}</p>
            <button
              onClick={startCamera}
              className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-xs font-semibold transition-colors"
            >
              Retry Camera Connection
            </button>
          </div>
        )}

        {!error && !capturedImage && (
          <>
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover"
            />

            {/* Document Guide Frame Overlay */}
            <div className="absolute inset-8 sm:inset-12 border-2 border-dashed border-blue-400/70 rounded-xl pointer-events-none flex flex-col justify-between p-4 shadow-[0_0_0_9999px_rgba(0,0,0,0.45)]">
              {/* Corner Viewfinder Markers */}
              <div className="flex justify-between">
                <div className="w-6 h-6 border-t-4 border-l-4 border-blue-400 -mt-1 -ml-1 rounded-tl-md" />
                <div className="w-6 h-6 border-t-4 border-r-4 border-blue-400 -mt-1 -mr-1 rounded-tr-md" />
              </div>

              {/* Animated Scan Line */}
              <div className="relative w-full h-0.5 bg-blue-400 shadow-[0_0_8px_#38bdf8] animate-scan-line" />

              <div className="text-center">
                <span className="px-3 py-1 rounded-full bg-black/70 text-[11px] font-medium text-slate-200 border border-slate-700/80">
                  Align document edges within guide frame
                </span>
              </div>

              <div className="flex justify-between">
                <div className="w-6 h-6 border-b-4 border-l-4 border-blue-400 -mb-1 -ml-1 rounded-bl-md" />
                <div className="w-6 h-6 border-b-4 border-r-4 border-blue-400 -mb-1 -mr-1 rounded-br-md" />
              </div>
            </div>
          </>
        )}

        {/* Captured Freeze Frame Preview */}
        {capturedImage && (
          <div className="relative w-full h-full">
            <img
              src={capturedImage}
              alt="Captured Document"
              className="w-full h-full object-contain"
            />
            <div className="absolute bottom-4 left-4 px-3 py-1 rounded bg-black/80 text-xs font-mono text-emerald-400 border border-emerald-500/30">
              ✓ Document snapshot captured
            </div>
          </div>
        )}

        <canvas ref={canvasRef} className="hidden" />
      </div>

      {/* Bottom Action Controls */}
      <div className="p-4 bg-slate-900 border-t border-slate-800 flex items-center justify-center space-x-4">
        {!capturedImage && !error && (
          <button
            onClick={handleCapture}
            className="flex items-center space-x-2 px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-sm shadow-lg hover:shadow-blue-500/25 transition-all transform active:scale-95"
          >
            <Camera className="w-5 h-5" />
            <span>Capture Document</span>
          </button>
        )}

        {capturedImage && (
          <>
            <button
              onClick={handleRetake}
              className="flex items-center space-x-1.5 px-4 py-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition-colors"
            >
              <RefreshCw className="w-4 h-4 mr-1" />
              Retake Photo
            </button>

            <button
              type="button"
              onClick={() => setIsEditorOpen(true)}
              className="flex items-center space-x-1.5 px-4 py-2.5 rounded-lg bg-blue-600/30 hover:bg-blue-600/40 text-blue-300 border border-blue-500/40 text-xs font-semibold transition-colors"
            >
              <Scissors className="w-4 h-4 mr-1 text-blue-400" />
              Rotate & Crop
            </button>

            <button
              onClick={handleConfirm}
              className="flex items-center space-x-1.5 px-6 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-md transition-all"
            >
              <Check className="w-4 h-4 mr-1" />
              Process Captured Document
            </button>
          </>
        )}

        {/* Modal for Rotating and Cropping Camera Capture */}
        {capturedImage && (
          <DocumentImageEditor
            imageSrc={capturedImage}
            originalFileName="camera_snapshot.jpg"
            isOpen={isEditorOpen}
            onClose={() => setIsEditorOpen(false)}
            onSave={(_file, editedDataUrl) => {
              setCapturedImage(editedDataUrl);
            }}
          />
        )}
      </div>
    </div>
  );
};
