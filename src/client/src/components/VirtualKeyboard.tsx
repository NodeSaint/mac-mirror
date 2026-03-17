/** Virtual keyboard — captures text input via a hidden input field. */

import { useRef, useEffect } from "react";

interface VirtualKeyboardProps {
  visible: boolean;
  send: (data: Record<string, unknown>) => void;
  onClose: () => void;
}

export function VirtualKeyboard({ visible, send, onClose }: VirtualKeyboardProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (visible && inputRef.current) {
      inputRef.current.focus();
    }
  }, [visible]);

  if (!visible) return null;

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    e.preventDefault();

    if (e.key === "Escape") {
      onClose();
      return;
    }

    const modifiers: string[] = [];
    if (e.metaKey) modifiers.push("cmd");
    if (e.altKey) modifiers.push("alt");
    if (e.ctrlKey) modifiers.push("ctrl");
    if (e.shiftKey) modifiers.push("shift");

    send({
      type: "input:key",
      key: e.key,
      modifiers,
    });
  }

  return (
    <div style={barStyle}>
      <input
        ref={inputRef}
        type="text"
        style={inputStyle}
        placeholder="Type here..."
        onKeyDown={handleKeyDown}
        autoCapitalize="none"
        autoComplete="off"
        autoCorrect="off"
      />
      <button onClick={onClose} style={closeStyle}>
        Done
      </button>
    </div>
  );
}

const barStyle: React.CSSProperties = {
  position: "fixed",
  bottom: 0,
  left: 0,
  right: 0,
  height: 48,
  background: "rgba(26, 26, 26, 0.95)",
  backdropFilter: "blur(8px)",
  display: "flex",
  alignItems: "center",
  padding: "0 12px",
  gap: 8,
  zIndex: 150,
  borderTop: "1px solid #333",
};

const inputStyle: React.CSSProperties = {
  flex: 1,
  background: "#0a0a0a",
  border: "1px solid #444",
  borderRadius: 8,
  padding: "8px 12px",
  fontSize: 16,
  color: "#fff",
  outline: "none",
};

const closeStyle: React.CSSProperties = {
  background: "none",
  border: "1px solid #444",
  borderRadius: 8,
  padding: "8px 12px",
  color: "#aaa",
  cursor: "pointer",
  fontSize: 14,
};
