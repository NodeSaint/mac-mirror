/** Connection status bar — fixed at top. */

import type { StatusData } from "../hooks/useWebSocket";

interface StatusBarProps {
  connected: boolean;
  status: StatusData | null;
  onSettingsClick: () => void;
}

export function StatusBar({ connected, status, onSettingsClick }: StatusBarProps) {
  const daemonUp = status?.daemonConnected ?? false;

  let dotColour: string;
  let label: string;

  if (!connected) {
    dotColour = "#ef4444";
    label = "Disconnected";
  } else if (!daemonUp) {
    dotColour = "#f59e0b";
    label = "No daemon";
  } else {
    dotColour = "#22c55e";
    label = `${status!.fps} FPS`;
    if (status!.latencyMs > 0) {
      label += ` · ${status!.latencyMs}ms`;
    }
  }

  return (
    <div style={barStyle}>
      <div style={leftStyle}>
        <span style={{ ...dotStyle, backgroundColor: dotColour }} />
        <span style={labelStyle}>{label}</span>
        {connected && status && (
          <span style={clientsStyle}>
            {status.clientCount} client{status.clientCount !== 1 ? "s" : ""}
          </span>
        )}
      </div>
      <button onClick={onSettingsClick} style={gearStyle} aria-label="Settings">
        &#9881;
      </button>
    </div>
  );
}

const barStyle: React.CSSProperties = {
  position: "fixed",
  top: 0,
  left: 0,
  right: 0,
  height: 32,
  background: "rgba(10, 10, 10, 0.85)",
  backdropFilter: "blur(8px)",
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  padding: "0 12px",
  zIndex: 100,
  borderBottom: "1px solid #222",
};

const leftStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 8,
};

const dotStyle: React.CSSProperties = {
  width: 8,
  height: 8,
  borderRadius: "50%",
  flexShrink: 0,
};

const labelStyle: React.CSSProperties = {
  fontSize: 13,
  color: "#ccc",
};

const clientsStyle: React.CSSProperties = {
  fontSize: 12,
  color: "#666",
};

const gearStyle: React.CSSProperties = {
  background: "none",
  border: "none",
  color: "#888",
  fontSize: 18,
  cursor: "pointer",
  padding: 4,
};
