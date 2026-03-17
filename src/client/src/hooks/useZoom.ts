/** Pinch-to-zoom and pan gesture handler.
 *
 * - Two-finger pinch to zoom in/out (1x–5x)
 * - Single-finger pan when zoomed in
 * - Double-tap to reset zoom
 */

import { useCallback, useRef, useState } from "react";

interface ZoomState {
  scale: number;
  translateX: number;
  translateY: number;
}

export interface UseZoomReturn {
  /** Current zoom transform as a CSS transform string. */
  transform: string;
  /** Whether currently zoomed in (scale > 1). */
  isZoomed: boolean;
  /** Touch handlers to attach to the zoomable container. */
  handlers: {
    onTouchStart: (e: React.TouchEvent) => void;
    onTouchMove: (e: React.TouchEvent) => void;
    onTouchEnd: (e: React.TouchEvent) => void;
  };
}

const MIN_SCALE = 1;
const MAX_SCALE = 5;

export function useZoom(): UseZoomReturn {
  const [zoom, setZoom] = useState<ZoomState>({ scale: 1, translateX: 0, translateY: 0 });

  const pinchRef = useRef<{ startDist: number; startScale: number; midX: number; midY: number } | null>(null);
  const panRef = useRef<{ startX: number; startY: number; startTx: number; startTy: number } | null>(null);
  const lastTapRef = useRef<number>(0);

  const getTouchDistance = useCallback((t1: React.Touch, t2: React.Touch) => {
    const dx = t1.clientX - t2.clientX;
    const dy = t1.clientY - t2.clientY;
    return Math.sqrt(dx * dx + dy * dy);
  }, []);

  const clampTranslation = useCallback((tx: number, ty: number, scale: number, el: HTMLElement) => {
    if (scale <= 1) return { tx: 0, ty: 0 };

    const rect = el.getBoundingClientRect();
    const maxTx = (rect.width * (scale - 1)) / 2;
    const maxTy = (rect.height * (scale - 1)) / 2;

    return {
      tx: Math.max(-maxTx, Math.min(maxTx, tx)),
      ty: Math.max(-maxTy, Math.min(maxTy, ty)),
    };
  }, []);

  const onTouchStart = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      // Pinch start
      const dist = getTouchDistance(e.touches[0]!, e.touches[1]!);
      pinchRef.current = {
        startDist: dist,
        startScale: zoom.scale,
        midX: (e.touches[0]!.clientX + e.touches[1]!.clientX) / 2,
        midY: (e.touches[0]!.clientY + e.touches[1]!.clientY) / 2,
      };
      panRef.current = null;
    } else if (e.touches.length === 1 && zoom.scale > 1) {
      // Pan start (only when zoomed)
      panRef.current = {
        startX: e.touches[0]!.clientX,
        startY: e.touches[0]!.clientY,
        startTx: zoom.translateX,
        startTy: zoom.translateY,
      };
    }
  }, [zoom.scale, zoom.translateX, zoom.translateY, getTouchDistance]);

  const onTouchMove = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 2 && pinchRef.current) {
      // Pinch zoom
      const dist = getTouchDistance(e.touches[0]!, e.touches[1]!);
      const ratio = dist / pinchRef.current.startDist;
      const newScale = Math.max(MIN_SCALE, Math.min(MAX_SCALE, pinchRef.current.startScale * ratio));

      const el = e.currentTarget as HTMLElement;
      const { tx, ty } = clampTranslation(zoom.translateX, zoom.translateY, newScale, el);

      setZoom({ scale: newScale, translateX: tx, translateY: ty });
    } else if (e.touches.length === 1 && panRef.current && zoom.scale > 1) {
      // Pan
      const dx = e.touches[0]!.clientX - panRef.current.startX;
      const dy = e.touches[0]!.clientY - panRef.current.startY;

      const el = e.currentTarget as HTMLElement;
      const { tx, ty } = clampTranslation(
        panRef.current.startTx + dx,
        panRef.current.startTy + dy,
        zoom.scale,
        el,
      );

      setZoom((prev) => ({ ...prev, translateX: tx, translateY: ty }));
    }
  }, [zoom.scale, zoom.translateX, zoom.translateY, getTouchDistance, clampTranslation]);

  const onTouchEnd = useCallback((e: React.TouchEvent) => {
    if (e.touches.length < 2) {
      pinchRef.current = null;
    }
    if (e.touches.length === 0) {
      panRef.current = null;

      // Double-tap to reset zoom
      const now = Date.now();
      if (now - lastTapRef.current < 300 && zoom.scale > 1) {
        setZoom({ scale: 1, translateX: 0, translateY: 0 });
        lastTapRef.current = 0;
      } else {
        lastTapRef.current = now;
      }
    }
  }, [zoom.scale]);

  const transform = `translate(${zoom.translateX}px, ${zoom.translateY}px) scale(${zoom.scale})`;

  return {
    transform,
    isZoomed: zoom.scale > 1,
    handlers: { onTouchStart, onTouchMove, onTouchEnd },
  };
}
