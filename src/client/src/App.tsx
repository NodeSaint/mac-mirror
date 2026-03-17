/** Root component — connects to relay server, displays screen stream with input. */

import { useState } from "react";
import { useWebSocket } from "./hooks/useWebSocket";
import { ScreenView } from "./components/ScreenView";
import { StatusBar } from "./components/StatusBar";
import { Settings, getServerUrl } from "./components/Settings";
import { TouchOverlay } from "./components/TouchOverlay";
import { VirtualKeyboard } from "./components/VirtualKeyboard";

export function App() {
  const [serverUrl, setServerUrl] = useState<string | null>(getServerUrl);
  const [showSettings, setShowSettings] = useState(serverUrl === null);
  const [showKeyboard, setShowKeyboard] = useState(false);

  const { frameUrl, status, connected, send } = useWebSocket(serverUrl);

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
        <TouchOverlay send={send}>
          <ScreenView
            frameUrl={frameUrl}
            daemonConnected={status?.daemonConnected ?? false}
            connected={connected}
          />
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
};
