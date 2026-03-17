/** Settings overlay — server URL configuration with localStorage persistence. */

import { useState } from "react";

const STORAGE_KEY = "mac-mirror-server-url";

export function getServerUrl(): string | null {
  return localStorage.getItem(STORAGE_KEY);
}

export function saveServerUrl(url: string): void {
  localStorage.setItem(STORAGE_KEY, url);
}

interface SettingsProps {
  currentUrl: string | null;
  onSave: (url: string) => void;
  onCancel?: () => void;
}

export function Settings({ currentUrl, onSave, onCancel }: SettingsProps) {
  const defaultUrl = `ws://${window.location.hostname}:${window.location.port || "3847"}`;
  const [value, setValue] = useState(currentUrl ?? defaultUrl);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = value.trim();
    if (trimmed) {
      saveServerUrl(trimmed);
      onSave(trimmed);
    }
  }

  return (
    <div style={overlayStyle}>
      <form onSubmit={handleSubmit} style={formStyle}>
        <h2 style={titleStyle}>Mac Mirror</h2>
        <p style={hintStyle}>
          Enter the WebSocket URL of your relay server.
          <br />
          Use your Mac's Tailscale IP, e.g. <code>ws://100.x.x.x:3847</code>
        </p>
        <input
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="ws://100.x.x.x:3847"
          autoFocus
          style={inputStyle}
        />
        <div style={buttonRow}>
          {onCancel && (
            <button type="button" onClick={onCancel} style={cancelStyle}>
              Cancel
            </button>
          )}
          <button type="submit" style={saveStyle}>
            Connect
          </button>
        </div>
      </form>
    </div>
  );
}

const overlayStyle: React.CSSProperties = {
  position: "fixed",
  inset: 0,
  background: "rgba(0, 0, 0, 0.9)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  zIndex: 200,
};

const formStyle: React.CSSProperties = {
  background: "#1a1a1a",
  borderRadius: 12,
  padding: 24,
  width: "min(90vw, 400px)",
  display: "flex",
  flexDirection: "column",
  gap: 16,
};

const titleStyle: React.CSSProperties = {
  fontSize: 20,
  fontWeight: 600,
  color: "#fff",
};

const hintStyle: React.CSSProperties = {
  fontSize: 13,
  color: "#888",
  lineHeight: 1.5,
};

const inputStyle: React.CSSProperties = {
  background: "#0a0a0a",
  border: "1px solid #333",
  borderRadius: 8,
  padding: "10px 12px",
  fontSize: 16,
  color: "#fff",
  outline: "none",
  width: "100%",
};

const buttonRow: React.CSSProperties = {
  display: "flex",
  gap: 8,
  justifyContent: "flex-end",
};

const cancelStyle: React.CSSProperties = {
  background: "none",
  border: "1px solid #444",
  borderRadius: 8,
  padding: "8px 16px",
  color: "#aaa",
  cursor: "pointer",
  fontSize: 14,
};

const saveStyle: React.CSSProperties = {
  background: "#2563eb",
  border: "none",
  borderRadius: 8,
  padding: "8px 20px",
  color: "#fff",
  cursor: "pointer",
  fontSize: 14,
  fontWeight: 500,
};
