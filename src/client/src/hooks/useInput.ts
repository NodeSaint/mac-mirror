/** Maps viewport touch/mouse events to Mac screen coordinates and sends input commands. */

import { useCallback, useRef } from "react";

interface InputSender {
  (data: Record<string, unknown>): void;
}

interface ScreenMetrics {
  /** Natural width of the streamed image (Mac screen pixels). */
  naturalWidth: number;
  /** Natural height of the streamed image (Mac screen pixels). */
  naturalHeight: number;
  /** Displayed width in the viewport. */
  displayWidth: number;
  /** Displayed height in the viewport. */
  displayHeight: number;
  /** Offset of the image from the left edge of the container. */
  offsetX: number;
  /** Offset of the image from the top edge of the container. */
  offsetY: number;
}

function toScreenCoords(
  clientX: number,
  clientY: number,
  metrics: ScreenMetrics,
): { x: number; y: number } | null {
  const relX = clientX - metrics.offsetX;
  const relY = clientY - metrics.offsetY;

  if (relX < 0 || relY < 0 || relX > metrics.displayWidth || relY > metrics.displayHeight) {
    return null; // outside the image
  }

  const scaleX = metrics.naturalWidth / metrics.displayWidth;
  const scaleY = metrics.naturalHeight / metrics.displayHeight;

  return {
    x: relX * scaleX,
    y: relY * scaleY,
  };
}

export function useInput(send: InputSender) {
  const lastTapRef = useRef<number>(0);
  const dragStartRef = useRef<{ x: number; y: number } | null>(null);
  const isDraggingRef = useRef(false);
  const touchStartTimeRef = useRef<number>(0);
  const touchStartPosRef = useRef<{ cx: number; cy: number } | null>(null);

  const DRAG_THRESHOLD = 10; // px in viewport
  const LONG_PRESS_MS = 400;

  const getMetrics = useCallback((img: HTMLImageElement): ScreenMetrics => {
    const rect = img.getBoundingClientRect();
    return {
      naturalWidth: img.naturalWidth,
      naturalHeight: img.naturalHeight,
      displayWidth: rect.width,
      displayHeight: rect.height,
      offsetX: rect.left,
      offsetY: rect.top,
    };
  }, []);

  const onTouchStart = useCallback(
    (e: React.TouchEvent<HTMLElement>) => {
      if (e.touches.length === 2) {
        // Two-finger tap → right click
        const img = (e.currentTarget as HTMLElement).querySelector("img");
        if (!img) return;
        const metrics = getMetrics(img);
        const touch = e.touches[0]!;
        const coords = toScreenCoords(touch.clientX, touch.clientY, metrics);
        if (coords) {
          send({ type: "input:mouse", ...coords, button: "right", action: "click" });
        }
        return;
      }

      const touch = e.touches[0]!;
      touchStartTimeRef.current = Date.now();
      touchStartPosRef.current = { cx: touch.clientX, cy: touch.clientY };
      isDraggingRef.current = false;
      dragStartRef.current = null;
    },
    [send, getMetrics],
  );

  const onTouchMove = useCallback(
    (e: React.TouchEvent<HTMLElement>) => {
      if (e.touches.length !== 1) return;
      const touch = e.touches[0]!;
      const startPos = touchStartPosRef.current;
      if (!startPos) return;

      const img = (e.currentTarget as HTMLElement).querySelector("img");
      if (!img) return;
      const metrics = getMetrics(img);

      const dx = touch.clientX - startPos.cx;
      const dy = touch.clientY - startPos.cy;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (!isDraggingRef.current && dist > DRAG_THRESHOLD) {
        isDraggingRef.current = true;
        const startCoords = toScreenCoords(startPos.cx, startPos.cy, metrics);
        if (startCoords) {
          dragStartRef.current = startCoords;
          send({ type: "input:mouse", ...startCoords, action: "dragstart" });
        }
      }

      if (isDraggingRef.current) {
        const coords = toScreenCoords(touch.clientX, touch.clientY, metrics);
        if (coords) {
          send({ type: "input:mouse", ...coords, action: "dragmove" });
        }
      }
    },
    [send, getMetrics],
  );

  const onTouchEnd = useCallback(
    (e: React.TouchEvent<HTMLElement>) => {
      if (isDraggingRef.current) {
        // End drag at last known position
        const lastTouch = e.changedTouches[0];
        if (lastTouch) {
          const img = (e.currentTarget as HTMLElement).querySelector("img");
          if (img) {
            const metrics = getMetrics(img);
            const coords = toScreenCoords(lastTouch.clientX, lastTouch.clientY, metrics);
            if (coords) {
              send({ type: "input:mouse", ...coords, action: "dragend" });
            }
          }
        }
        isDraggingRef.current = false;
        dragStartRef.current = null;
        touchStartPosRef.current = null;
        return;
      }

      // Tap — check for double-tap
      const now = Date.now();
      const startPos = touchStartPosRef.current;
      if (!startPos) return;

      const img = (e.currentTarget as HTMLElement).querySelector("img");
      if (!img) return;
      const metrics = getMetrics(img);
      const coords = toScreenCoords(startPos.cx, startPos.cy, metrics);
      if (!coords) return;

      if (now - lastTapRef.current < 300) {
        // Double tap
        send({ type: "input:mouse", ...coords, action: "dblclick" });
        lastTapRef.current = 0;
      } else {
        // Single tap → click
        send({ type: "input:mouse", ...coords, button: "left", action: "click" });
        lastTapRef.current = now;
      }

      touchStartPosRef.current = null;
    },
    [send, getMetrics],
  );

  // Scroll via wheel events (for desktop browser testing)
  const onWheel = useCallback(
    (e: React.WheelEvent<HTMLElement>) => {
      const img = (e.currentTarget as HTMLElement).querySelector("img");
      if (!img) return;
      const metrics = getMetrics(img);
      const coords = toScreenCoords(e.clientX, e.clientY, metrics);
      if (coords) {
        send({
          type: "input:scroll",
          ...coords,
          deltaX: e.deltaX,
          deltaY: e.deltaY,
        });
      }
    },
    [send, getMetrics],
  );

  return { onTouchStart, onTouchMove, onTouchEnd, onWheel };
}
