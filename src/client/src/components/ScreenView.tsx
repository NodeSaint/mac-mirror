/** Displays the latest JPEG frame from the daemon, scaled to fit the viewport. */

interface ScreenViewProps {
  frameUrl: string | null;
  daemonConnected: boolean;
  connected: boolean;
}

export function ScreenView({ frameUrl, daemonConnected, connected }: ScreenViewProps) {
  if (!connected) {
    return (
      <div style={centreStyle}>
        <p style={messageStyle}>Connecting to server...</p>
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
  alignItems: "center",
  justifyContent: "center",
  height: "100%",
  width: "100%",
};

const messageStyle: React.CSSProperties = {
  color: "#666",
  fontSize: "1.1rem",
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
