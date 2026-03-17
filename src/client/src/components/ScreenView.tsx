/** Displays the latest JPEG frame from the daemon, scaled to fit the viewport. */

interface ScreenViewProps {
  frameUrl: string | null;
  daemonConnected: boolean;
  connected: boolean;
  debugInfo?: string;
}

export function ScreenView({ frameUrl, daemonConnected, connected, debugInfo }: ScreenViewProps) {
  if (!connected) {
    return (
      <div style={centreStyle}>
        <p style={messageStyle}>Connecting to server...</p>
        {debugInfo && <p style={debugStyle}>{debugInfo}</p>}
      </div>
    );
  }

  if (!daemonConnected) {
    return (
      <div style={centreStyle}>
        <p style={messageStyle}>Waiting for desktop daemon...</p>
      </div>
    );
  }

  if (!frameUrl) {
    return (
      <div style={centreStyle}>
        <p style={messageStyle}>Waiting for first frame...</p>
      </div>
    );
  }

  return (
    <div style={containerStyle}>
      <img
        src={frameUrl}
        alt="Mac screen"
        style={imgStyle}
        draggable={false}
      />
    </div>
  );
}

const centreStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  height: "100%",
  width: "100%",
  gap: 8,
};

const messageStyle: React.CSSProperties = {
  color: "#666",
  fontSize: "1.1rem",
};

const debugStyle: React.CSSProperties = {
  color: "#444",
  fontSize: "0.75rem",
  fontFamily: "monospace",
  wordBreak: "break-all",
  padding: "0 20px",
  textAlign: "center",
};

const containerStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  height: "100%",
  width: "100%",
  overflow: "hidden",
};

const imgStyle: React.CSSProperties = {
  maxWidth: "100%",
  maxHeight: "100%",
  objectFit: "contain",
};
