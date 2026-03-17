/** Root component — connects to relay server, displays screen stream with input. */

import { useState } from "react";
import { useWebSocket } from "./hooks/useWebSocket";
import { useZoom } from "./hooks/useZoom";
import { ScreenView } from "./components/ScreenView";
import { StatusBar } from "./components/StatusBar";
import { Settings, getServerUrl } from "./components/Settings";
import { TouchOverlay } from "./components/TouchOverlay";
import { VirtualKeyboard } from "./components/VirtualKeyboard";

function autoDetectUrl(): string | null {
  const saved = getServerUrl();
  if (saved) return saved;
  // Auto-connect to the same host that served this page
  const host = window.location.hostname || "localhost";
  const port = window.location.port || "3847";
  return `ws://${host}:${port}`;
}

export function App() {
  const [serverUrl, setServerUrl] = useState<string | null>(autoDetectUrl);
  const [showSettings, setShowSettings] = useState(serverUrl === null);
  const [showKeyboard, setShowKeyboard] = useState(false);

  const { frameUrl, status, connected, debugInfo, send } = useWebSocket(serverUrl);
  const { transform, isZoomed, handlers: zoomHandlers } = useZoom();

  if (showSettings) {
    return (
      <Settings
        currentUrl={serverUrl}
        onSave={(url) => {
          setServerUrl(url);
          setShowSettings(false);
        }}
        onCancel={serverUrl ? () => setShowSettings(false) : undefined}
      />
    );
  }

  return (
    <>
      <StatusBar
        connected={connected}
        status={status}
        onSettingsClick={() => setShowSettings(true)}
        onKeyboardClick={() => setShowKeyboard((v) => !v)}
      />
      <div style={viewportStyle}>
        <TouchOverlay send={send} isZoomed={isZoomed} zoomHandlers={zoomHandlers}>
          <div style={{ ...zoomContainerStyle, transform }}>
            <ScreenView
              frameUrl={frameUrl}
              daemonConnected={status?.daemonConnected ?? false}
              connected={connected}
              debugInfo={debugInfo}
            />
          </div>
        </TouchOverlay>
      </div>
      <VirtualKeyboard
        visible={showKeyboard}
        send={send}
        onClose={() => setShowKeyboard(false)}
      />
    </>
  );
}

const viewportStyle: React.CSSProperties = {
  paddingTop: 32,
  height: "100%",
  width: "100%",
  overflow: "hidden",
};

const zoomContainerStyle: React.CSSProperties = {
  width: "100%",
  height: "100%",
  transformOrigin: "center center",
  willChange: "transform",
};
