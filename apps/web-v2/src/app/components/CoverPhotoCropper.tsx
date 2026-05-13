'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Loader2, X } from 'lucide-react';

type Props = {
  file: File;
  aspectRatio: number;
  outputWidth?: number;
  outputType?: 'image/jpeg' | 'image/webp';
  quality?: number;
  onConfirm: (cropped: File) => void;
  onCancel: () => void;
};

type Position = { x: number; y: number };

/**
 * Drag-to-position cover photo cropper. The user picks a file, the image is
 * fitted to `aspectRatio` with object-fit: cover semantics, and they can drag
 * to choose which part is centered. On confirm, the visible region is rendered
 * to a canvas and returned as a new File.
 */
export function CoverPhotoCropper({
  file,
  aspectRatio,
  outputWidth = 1600,
  outputType = 'image/jpeg',
  quality = 0.9,
  onConfirm,
  onCancel,
}: Props) {
  const frameRef = useRef<HTMLDivElement>(null);
  const imgElRef = useRef<HTMLImageElement>(null);
  const dragStart = useRef<{ x: number; y: number; pos: Position } | null>(null);

  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [imageEl, setImageEl] = useState<HTMLImageElement | null>(null);
  // Position is normalized 0..1: fraction of overflow shifted toward top/left.
  // 0.5 = centered.
  const [position, setPosition] = useState<Position>({ x: 0.5, y: 0.5 });
  const [confirming, setConfirming] = useState(false);

  useEffect(() => {
    const url = URL.createObjectURL(file);
    setImageUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  useEffect(() => {
    if (!imageUrl) return;
    const img = new Image();
    img.onload = () => setImageEl(img);
    img.src = imageUrl;
  }, [imageUrl]);

  // Compute display geometry inside the frame: how the image is scaled to
  // "cover" the aspect-ratio frame, and how much overflow exists per axis.
  const getGeometry = useCallback(() => {
    const frame = frameRef.current;
    if (!frame || !imageEl) return null;
    const frameW = frame.clientWidth;
    const frameH = frameW / aspectRatio;
    const scale = Math.max(frameW / imageEl.naturalWidth, frameH / imageEl.naturalHeight);
    const scaledW = imageEl.naturalWidth * scale;
    const scaledH = imageEl.naturalHeight * scale;
    return {
      frameW,
      frameH,
      scaledW,
      scaledH,
      overflowX: Math.max(0, scaledW - frameW),
      overflowY: Math.max(0, scaledH - frameH),
    };
  }, [aspectRatio, imageEl]);

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!imageEl) return;
    (e.target as Element).setPointerCapture(e.pointerId);
    dragStart.current = { x: e.clientX, y: e.clientY, pos: position };
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragStart.current) return;
    const geo = getGeometry();
    if (!geo) return;
    const dx = e.clientX - dragStart.current.x;
    const dy = e.clientY - dragStart.current.y;
    // Dragging right should reveal the left side of the image → decrease x.
    const nextX = geo.overflowX > 0
      ? clamp01(dragStart.current.pos.x - dx / geo.overflowX)
      : dragStart.current.pos.x;
    const nextY = geo.overflowY > 0
      ? clamp01(dragStart.current.pos.y - dy / geo.overflowY)
      : dragStart.current.pos.y;
    setPosition({ x: nextX, y: nextY });
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (dragStart.current && (e.target as Element).hasPointerCapture(e.pointerId)) {
      (e.target as Element).releasePointerCapture(e.pointerId);
    }
    dragStart.current = null;
  };

  const handleConfirm = useCallback(async () => {
    if (!imageEl) return;
    setConfirming(true);
    try {
      const outW = outputWidth;
      const outH = Math.round(outW / aspectRatio);
      // Source rect in image's natural coords that maps to the frame view.
      const naturalScale = Math.max(outW / imageEl.naturalWidth, outH / imageEl.naturalHeight);
      const srcW = outW / naturalScale;
      const srcH = outH / naturalScale;
      const sx = (imageEl.naturalWidth - srcW) * position.x;
      const sy = (imageEl.naturalHeight - srcH) * position.y;

      const canvas = document.createElement('canvas');
      canvas.width = outW;
      canvas.height = outH;
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Canvas 2D context unavailable');
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(imageEl, sx, sy, srcW, srcH, 0, 0, outW, outH);

      const blob: Blob = await new Promise((resolve, reject) => {
        canvas.toBlob(
          (b) => (b ? resolve(b) : reject(new Error('toBlob returned null'))),
          outputType,
          quality,
        );
      });
      const ext = outputType === 'image/webp' ? 'webp' : 'jpg';
      const baseName = file.name.replace(/\.[^.]+$/, '') || 'cover';
      const cropped = new File([blob], `${baseName}-crop.${ext}`, { type: outputType });
      onConfirm(cropped);
    } finally {
      setConfirming(false);
    }
  }, [aspectRatio, file.name, imageEl, onConfirm, outputType, outputWidth, position.x, position.y, quality]);

  // Image transform: shift the image so the chosen portion is visible inside
  // the frame. We use translate with overflow values so the math matches the
  // crop computation exactly.
  const geo = getGeometry();
  const tx = geo ? -geo.overflowX * position.x : 0;
  const ty = geo ? -geo.overflowY * position.y : 0;
  const scaledW = geo?.scaledW ?? 0;
  const scaledH = geo?.scaledH ?? 0;

  const canDragX = (geo?.overflowX ?? 0) > 0.5;
  const canDragY = (geo?.overflowY ?? 0) > 0.5;
  const cursor = canDragX && canDragY ? 'move' : canDragX ? 'ew-resize' : canDragY ? 'ns-resize' : 'default';

  return (
    <div className="space-y-3">
      <div
        ref={frameRef}
        className="relative w-full overflow-hidden bg-[#202020] border-2 border-[#ac6d46]"
        style={{ aspectRatio: `${aspectRatio}`, cursor, touchAction: 'none' }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
      >
        {imageUrl && (
          // Using a plain <img> so we can size it precisely from naturalWidth/Height.
          // eslint-disable-next-line @next/next/no-img-element
          <img
            ref={imgElRef}
            src={imageUrl}
            alt="Cover crop preview"
            draggable={false}
            style={{
              position: 'absolute',
              left: 0,
              top: 0,
              width: scaledW || undefined,
              height: scaledH || undefined,
              transform: `translate(${tx}px, ${ty}px)`,
              userSelect: 'none',
              pointerEvents: 'none',
              maxWidth: 'none',
            }}
          />
        )}
        {!imageEl && (
          <div className="absolute inset-0 flex items-center justify-center text-white/80 text-xs">
            Loading…
          </div>
        )}
        {(canDragX || canDragY) && imageEl && (
          <div className="absolute bottom-2 left-2 px-2 py-1 bg-black/60 text-white text-[10px] font-mono pointer-events-none">
            DRAG TO REPOSITION
          </div>
        )}
      </div>

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={handleConfirm}
          disabled={!imageEl || confirming}
          className="px-4 py-2.5 bg-[#ac6d46] text-white hover:bg-[#8a5738] transition-all active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none focus-visible:ring-[#ac6d46] text-xs font-bold inline-flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {confirming && <Loader2 size={14} className="animate-spin" />}
          {confirming ? 'PROCESSING…' : 'USE THIS CROP'}
        </button>
        <button
          type="button"
          onClick={onCancel}
          disabled={confirming}
          className="px-4 py-2.5 border-2 border-[#202020] dark:border-[#616161] text-[#202020] dark:text-[#e5e5e5] hover:bg-[#f5f5f5] dark:hover:bg-[#2a2a2a] transition-all active:scale-[0.98] text-xs font-bold inline-flex items-center gap-1.5 disabled:opacity-50"
        >
          <X size={14} /> CANCEL
        </button>
        <div className="ml-auto text-[10px] font-mono text-[#616161] dark:text-[#b5bcc4]">
          {aspectRatio.toFixed(2)}:1 PREVIEW
        </div>
      </div>
    </div>
  );
}

function clamp01(v: number) {
  return Math.min(1, Math.max(0, v));
}
