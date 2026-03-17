/** Transparent input capture layer over the screen view. */

import { useInput } from "../hooks/useInput";

interface TouchOverlayProps {
  send: (data: Record<string, unknown>) => void;
  children: React.ReactNode;
}

export function TouchOverlay({ send, children }: TouchOverlayProps) {
  const { onTouchStart, onTouchMove, onTouchEnd, onWheel } = useInput(send);

  return (
    <div
      style={overlayStyle}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
      onWheel={onWheel}
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
