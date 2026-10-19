import React, { useState, useEffect } from 'react';
import { X, ZoomIn, ZoomOut, RotateCcw, Download } from 'lucide-react';
import { sounds } from '../utils/sound';

interface PhotoLightboxModalProps {
  isOpen: boolean;
  onClose: () => void;
  imageUrl: string;
  title: string;
  subtitle?: string;
  badge?: string;
}

export const PhotoLightboxModal: React.FC<PhotoLightboxModalProps> = ({
  isOpen,
  onClose,
  imageUrl,
  title,
  subtitle,
  badge
}) => {
  const [scale, setScale] = useState(1);

  useEffect(() => {
    if (isOpen) {
      setScale(1);
      sounds.playTap();
    }
  }, [isOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !imageUrl) return null;

  const handleZoomIn = () => setScale(prev => Math.min(prev + 0.35, 3));
  const handleZoomOut = () => setScale(prev => Math.max(prev - 0.35, 0.75));
  const handleResetZoom = () => setScale(1);

  return (
    <div 
      className="fixed inset-0 z-60 bg-black/90 backdrop-blur-md flex flex-col justify-between p-3 sm:p-5 select-none animate-in fade-in duration-200"
      onClick={onClose}
    >
      {/* Top Controls Bar */}
      <div 
        className="flex items-center justify-between text-white max-w-2xl w-full mx-auto pb-2 shrink-0 border-b border-white/10"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="min-w-0 pr-3">
          <div className="flex items-center gap-2">
            <h4 className="font-black text-sm sm:text-base text-amber-400 truncate">{title}</h4>
            {badge && (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 shrink-0">
                {badge}
              </span>
            )}
          </div>
          {subtitle && (
            <p className="text-xs text-slate-300 truncate mt-0.5">{subtitle}</p>
          )}
        </div>

        {/* Zoom and Close Actions */}
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={handleZoomIn}
            className="p-2 rounded-xl bg-white/10 hover:bg-white/20 active:scale-95 text-white transition-all cursor-pointer"
            title="Zoom In"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={handleZoomOut}
            className="p-2 rounded-xl bg-white/10 hover:bg-white/20 active:scale-95 text-white transition-all cursor-pointer"
            title="Zoom Out"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
          {scale !== 1 && (
            <button
              type="button"
              onClick={handleResetZoom}
              className="p-2 rounded-xl bg-white/10 hover:bg-white/20 active:scale-95 text-white transition-all cursor-pointer"
              title="Reset Zoom"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          )}
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl bg-red-600/80 hover:bg-red-600 active:scale-95 text-white transition-all ml-1 cursor-pointer"
            title="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main Image Display Viewport */}
      <div 
        className="flex-1 flex items-center justify-center overflow-hidden my-auto p-2"
        onClick={(e) => {
          e.stopPropagation();
          // Double click/tap toggles 1.8x zoom
          setScale(prev => (prev === 1 ? 1.8 : 1));
        }}
      >
        <img
          src={imageUrl}
          alt={title}
          style={{ transform: `scale(${scale})`, transition: 'transform 0.2s cubic-bezier(0.16, 1, 0.3, 1)' }}
          className="max-h-[75vh] max-w-full w-auto object-contain rounded-2xl shadow-2xl cursor-zoom-in"
        />
      </div>

      {/* Footer Info & Instructions */}
      <div className="text-center text-[11px] text-slate-400 max-w-md mx-auto pt-2 shrink-0">
        Tap or double-click to zoom • Tap anywhere outside to close
      </div>
    </div>
  );
};
