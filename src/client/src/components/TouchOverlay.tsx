/** Transparent input capture layer over the screen view.
 *
 * Routes single-finger gestures to useInput (mouse/tap),
 * two-finger gestures to useZoom (pinch/pan).
 */

import { useCallback } from "react";
import { useInput } from "../hooks/useInput";

interface TouchOverlayProps {
  send: (data: Record<string, unknown>) => void;
  isZoomed: boolean;
  zoomHandlers: {
    onTouchStart: (e: React.TouchEvent) => void;
    onTouchMove: (e: React.TouchEvent) => void;
    onTouchEnd: (e: React.TouchEvent) => void;
  };
  children: React.ReactNode;
}

export function TouchOverlay({ send, isZoomed, zoomHandlers, children }: TouchOverlayProps) {
  const input = useInput(send);

  const onTouchStart = useCallback((e: React.TouchEvent<HTMLElement>) => {
    if (e.touches.length >= 2) {
      zoomHandlers.onTouchStart(e);
    } else {
      input.onTouchStart(e);
    }
  }, [input, zoomHandlers]);

  const onTouchMove = useCallback((e: React.TouchEvent<HTMLElement>) => {
    if (e.touches.length >= 2) {
      zoomHandlers.onTouchMove(e);
    } else if (!isZoomed) {
      input.onTouchMove(e);
    } else {
      // When zoomed, single-finger pans the view
      zoomHandlers.onTouchMove(e);
    }
  }, [input, zoomHandlers, isZoomed]);

  const onTouchEnd = useCallback((e: React.TouchEvent<HTMLElement>) => {
    zoomHandlers.onTouchEnd(e);
    input.onTouchEnd(e);
  }, [input, zoomHandlers]);

  return (
    <div
      style={overlayStyle}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
      onWheel={input.onWheel}
    >
      {children}
    </div>
  );
}

const overlayStyle: React.CSSProperties = {
  width: "100%",
  height: "100%",
  touchAction: "none",
  userSelect: "none",
  WebkitUserSelect: "none",
};
