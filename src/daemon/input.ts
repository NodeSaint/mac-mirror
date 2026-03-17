/** Mouse/keyboard injection via cliclick.
 *
 * Translates JSON input commands into cliclick CLI invocations.
 * All coordinates are in Mac screen space (the client maps viewport → screen).
 */

import { execFile } from "node:child_process";

const CLICLICK = "cliclick";

function run(args: string[]): Promise<void> {
  return new Promise((resolve, reject) => {
    execFile(CLICLICK, args, { timeout: 5000 }, (err) => {
      if (err) reject(err);
      else resolve();
    });
  });
}

// --- Mouse ---

export async function mouseClick(x: number, y: number): Promise<void> {
  await run([`c:${Math.round(x)},${Math.round(y)}`]);
}

export async function mouseRightClick(x: number, y: number): Promise<void> {
  await run([`rc:${Math.round(x)},${Math.round(y)}`]);
}

export async function mouseDoubleClick(x: number, y: number): Promise<void> {
  await run([`dc:${Math.round(x)},${Math.round(y)}`]);
}

export async function mouseMove(x: number, y: number): Promise<void> {
  await run([`m:${Math.round(x)},${Math.round(y)}`]);
}

export async function mouseDragStart(x: number, y: number): Promise<void> {
  await run([`dd:${Math.round(x)},${Math.round(y)}`]);
}

export async function mouseDragMove(x: number, y: number): Promise<void> {
  await run([`dm:${Math.round(x)},${Math.round(y)}`]);
}

export async function mouseDragEnd(x: number, y: number): Promise<void> {
  await run([`du:${Math.round(x)},${Math.round(y)}`]);
}

// --- Scroll ---
// cliclick doesn't have native scroll, so we use AppleScript for scroll events.

export async function scroll(x: number, y: number, deltaX: number, deltaY: number): Promise<void> {
  // Move mouse to position first, then use AppleScript for scroll
  await mouseMove(x, y);

  // Use osascript with JavaScript for Automation to create scroll events
  const scrollScript = `
    ObjC.import('Quartz');
    const ev = $.CGEventCreateScrollWheelEvent(null, 1, 2, ${Math.round(-deltaY)}, ${Math.round(-deltaX)});
    $.CGEventPost($.kCGHIDEventTap, ev);
  `;

  return new Promise((resolve, reject) => {
    execFile("osascript", ["-l", "JavaScript", "-e", scrollScript], { timeout: 5000 }, (err) => {
      if (err) reject(err);
      else resolve();
    });
  });
}

// --- Keyboard ---

const MODIFIER_MAP: Record<string, string> = {
  meta: "cmd",
  command: "cmd",
  cmd: "cmd",
  alt: "alt",
  option: "alt",
  ctrl: "ctrl",
  control: "ctrl",
  shift: "shift",
  fn: "fn",
};

const SPECIAL_KEY_MAP: Record<string, string> = {
  Enter: "return",
  Backspace: "delete",
  Delete: "fwd-delete",
  Tab: "tab",
  Escape: "esc",
  ArrowUp: "arrow-up",
  ArrowDown: "arrow-down",
  ArrowLeft: "arrow-left",
  ArrowRight: "arrow-right",
  Home: "home",
  End: "end",
  PageUp: "page-up",
  PageDown: "page-down",
  " ": "space",
  F1: "f1", F2: "f2", F3: "f3", F4: "f4",
  F5: "f5", F6: "f6", F7: "f7", F8: "f8",
  F9: "f9", F10: "f10", F11: "f11", F12: "f12",
};

export async function keyPress(key: string, modifiers: string[] = []): Promise<void> {
  const cmds: string[] = [];

  // Press modifiers
  const mods = modifiers
    .map((m) => MODIFIER_MAP[m.toLowerCase()])
    .filter((m): m is string => m !== undefined);

  if (mods.length > 0) {
    cmds.push(`kd:${mods.join(",")}`);
  }

  // Press the key
  const special = SPECIAL_KEY_MAP[key];
  if (special) {
    cmds.push(`kp:${special}`);
  } else if (key.length === 1) {
    // Single character — type it
    cmds.push(`t:${key}`);
  }

  // Release modifiers
  if (mods.length > 0) {
    cmds.push(`ku:${mods.join(",")}`);
  }

  if (cmds.length > 0) {
    await run(cmds);
  }
}

export async function typeText(text: string): Promise<void> {
  if (text) {
    await run([`t:${text}`]);
  }
}

// --- Dispatch ---

export interface InputMessage {
  type: string;
  x?: number;
  y?: number;
  button?: string;
  action?: string;
  deltaX?: number;
  deltaY?: number;
  key?: string;
  modifiers?: string[];
  text?: string;
}

export async function handleInput(msg: InputMessage): Promise<void> {
  switch (msg.type) {
    case "input:mouse": {
      const x = msg.x ?? 0;
      const y = msg.y ?? 0;
      switch (msg.action) {
        case "click":
          if (msg.button === "right") await mouseRightClick(x, y);
          else await mouseClick(x, y);
          break;
        case "dblclick":
          await mouseDoubleClick(x, y);
          break;
        case "move":
          await mouseMove(x, y);
          break;
        case "dragstart":
          await mouseDragStart(x, y);
          break;
        case "dragmove":
          await mouseDragMove(x, y);
          break;
        case "dragend":
          await mouseDragEnd(x, y);
          break;
      }
      break;
    }

    case "input:scroll": {
      const x = msg.x ?? 0;
      const y = msg.y ?? 0;
      await scroll(x, y, msg.deltaX ?? 0, msg.deltaY ?? 0);
      break;
    }

    case "input:key":
      if (msg.key) {
        await keyPress(msg.key, msg.modifiers ?? []);
      }
      break;

    case "input:text":
      if (msg.text) {
        await typeText(msg.text);
      }
      break;
  }
}
