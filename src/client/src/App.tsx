/** Root component — connects to relay server, displays screen stream. */

import { useState } from "react";
import { useWebSocket } from "./hooks/useWebSocket";
import { ScreenView } from "./components/ScreenView";
import { StatusBar } from "./components/StatusBar";
import { Settings, getServerUrl } from "./components/Settings";

export function App() {
  const [serverUrl, setServerUrl] = useState<string | null>(getServerUrl);
  const [showSettings, setShowSettings] = useState(serverUrl === null);

  const { frameUrl, status, connected } = useWebSocket(serverUrl);

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
      />
      <div style={viewportStyle}>
        <ScreenView
          frameUrl={frameUrl}
          daemonConnected={status?.daemonConnected ?? false}
          connected={connected}
        />
      </div>
    </>
  );
}

const viewportStyle: React.CSSProperties = {
  paddingTop: 32,
  height: "100%",
  width: "100%",
};
