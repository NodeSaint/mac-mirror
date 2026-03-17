/** WebSocket hook — receives binary JPEG frames and JSON status messages.
 *
 * Binary messages → object URL for <img> rendering.
 * JSON messages → parsed status updates.
 * Auto-reconnect with exponential backoff (1s → 30s).
 */

import { useEffect, useRef, useState, useCallback } from "react";

export interface StatusData {
  daemonConnected: boolean;
  clientCount: number;
  fps: number;
  latencyMs: number;
  uptimeSeconds: number;
}

export interface UseWebSocketReturn {
  /** Object URL of the latest JPEG frame, or null if no frame received yet. */
  frameUrl: string | null;
  /** Latest status message from the server. */
  status: StatusData | null;
  /** Whether the WebSocket is currently connected. */
  connected: boolean;
  /** Send a JSON message to the server. */
  send: (data: Record<string, unknown>) => void;
}

export function useWebSocket(serverUrl: string | null): UseWebSocketReturn {
  const [frameUrl, setFrameUrl] = useState<string | null>(null);
  const [status, setStatus] = useState<StatusData | null>(null);
  const [connected, setConnected] = useState(false);

  const wsRef = useRef<WebSocket | null>(null);
  const prevUrlRef = useRef<string | null>(null);

  const send = useCallback((data: Record<string, unknown>) => {
    const ws = wsRef.current;
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(data));
    }
  }, []);

  useEffect(() => {
    if (!serverUrl) return;

    let mounted = true;
    let backoff = 1000;
    const maxBackoff = 30000;
    let timer: ReturnType<typeof setTimeout> | null = null;

    function connect() {
      if (!mounted) return;

      const url = `${serverUrl}/client`;
      const ws = new WebSocket(url);
      ws.binaryType = "arraybuffer";
      wsRef.current = ws;

      ws.onopen = () => {
        if (!mounted) return;
        setConnected(true);
        backoff = 1000;
      };

      ws.onmessage = (event) => {
        if (!mounted) return;

        if (event.data instanceof ArrayBuffer) {
          // Binary JPEG frame — create object URL
          const blob = new Blob([event.data], { type: "image/jpeg" });
          const url = URL.createObjectURL(blob);

          // Revoke previous URL to avoid memory leak
          setFrameUrl((prev) => {
            if (prev) URL.revokeObjectURL(prev);
            return url;
          });
        } else {
          // JSON message
          try {
            const msg = JSON.parse(event.data as string) as Record<string, unknown>;
            if (msg["type"] === "status") {
              setStatus(msg as unknown as StatusData);
            }
          } catch {
            // Malformed — ignore
          }
        }
      };

      ws.onclose = () => {
        if (!mounted) return;
        wsRef.current = null;
        setConnected(false);

        timer = setTimeout(() => {
          backoff = Math.min(backoff * 2, maxBackoff);
          connect();
        }, backoff);
      };

      ws.onerror = () => {
        // onclose will fire after this
      };
    }

    connect();

    return () => {
      mounted = false;
      if (timer) clearTimeout(timer);
      const ws = wsRef.current;
      if (ws) {
        ws.onclose = null;
        ws.close();
        wsRef.current = null;
      }
      // Clean up last frame URL
      setFrameUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return null;
      });
    };
  }, [serverUrl]);

  // Clean up previous object URL when component using old URL reference is gone
  useEffect(() => {
    prevUrlRef.current = frameUrl;
  }, [frameUrl]);

  return { frameUrl, status, connected, send };
}
