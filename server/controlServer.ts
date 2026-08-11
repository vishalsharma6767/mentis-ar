// Phone-as-VR-controller hub.
//
// A phone (or any second device) opens /controller, pairs with a 4-digit code,
// and streams joystick / tilt / drag / key events over a WebSocket to the lab
// tab running on the computer. The lab tab relays these into its existing
// keyboard/camera handlers via synthetic events (see src/remote/RemoteBridge).
//
// Protocol (JSON messages):
//   -> { type: 'client' }                         lab tab connects
//   -> { type: 'controller', code: '1234' }       phone pairs
//   -> { type: 'move', x, z }                     joystick axes (-1..1)
//   -> { type: 'look', dx, dy }                   drag deltas (pixels)
//   -> { type: 'tilt', yaw, pitch, active }       gyro angles (radians)
//   -> { type: 'key', code, down }                discrete key (Digit1..9, KeyF...)
//   -> { type: 'voice', down }                    push-to-talk (Spacebar)
//   <- { type: 'paired', code }                   pairing success
//   <- { type: 'error', message }                 pairing failure
//   <- { type: 'controllerCount', count }         to lab tab

import type { Server as HttpServer } from 'http';
import os from 'os';
import { WebSocketServer, WebSocket } from 'ws';

const clients = new Set<WebSocket>();
const controllers = new Set<WebSocket>();
const controllerCodes = new Map<WebSocket, string>();

let pairCode = '';

// Ring buffer of the last few controller messages, exposed via
// /api/control/debug so we can see exactly what the phone is sending.
const recent: {
  t: string;
  type: string;
  code?: string;
  down?: boolean;
  bound?: number;
  error?: string;
  ua?: string;
  screen?: string;
}[] = [];

function logMsg(msg: any) {
  recent.push({
    t: new Date().toISOString().slice(11, 19),
    type: typeof msg.type === 'string' ? msg.type : '?',
    code: typeof msg.code === 'string' ? msg.code : undefined,
    down: typeof msg.down === 'boolean' ? msg.down : undefined,
    bound: typeof msg.bound === 'number' ? msg.bound : undefined,
    error: typeof msg.error === 'string' ? msg.error : undefined,
    ua: typeof msg.ua === 'string' ? msg.ua.slice(0, 80) : undefined,
    screen: typeof msg.screen === 'string' ? msg.screen : undefined,
  });
  if (recent.length > 40) recent.shift();
}

export function getRecentMessages() {
  return [...recent];
}

export function getClientCount() {
  return clients.size;
}

function generateCode(): string {
  return String(Math.floor(1000 + Math.random() * 9000));
}

export function getPairCode(): string {
  return pairCode;
}

export function getLanIp(): string | null {
  const nets = os.networkInterfaces();
  const candidates: string[] = [];
  for (const name of Object.keys(nets)) {
    for (const net of nets[name] || []) {
      if (net.family === 'IPv4' && !net.internal) {
        candidates.push(net.address);
      }
    }
  }
  // Skip common virtual/VM subnets so the real Wi-Fi/LAN IP is picked first.
  const isVirtual = (ip: string) =>
    ip.startsWith('192.168.56.') ||
    ip.startsWith('192.168.99.') ||
    ip.startsWith('172.17.') ||
    ip.startsWith('172.18.') ||
    ip.startsWith('172.19.') ||
    ip.startsWith('172.20.') ||
    ip.startsWith('172.21.') ||
    ip.startsWith('169.254.');
  return candidates.find((ip) => !isVirtual(ip)) || candidates[0] || null;
}

function send(ws: WebSocket, msg: unknown) {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(msg));
  }
}

function broadcastControllerCount() {
  const count = controllers.size;
  for (const c of clients) send(c, { type: 'controllerCount', count });
}

export function attachControlServer(httpServer: HttpServer) {
  if (!pairCode) pairCode = generateCode();

  const wss = new WebSocketServer({ server: httpServer, path: '/ws' });

  wss.on('connection', (ws) => {
    let role: 'client' | 'controller' | null = null;
    let code: string | null = null;

    ws.on('message', (raw) => {
      let msg: any;
      try {
        msg = JSON.parse(raw.toString());
      } catch {
        return;
      }
      if (!msg || typeof msg.type !== 'string') return;

      if (msg.type === 'client') {
        role = 'client';
        clients.add(ws);
        send(ws, { type: 'paired', code: pairCode });
        broadcastControllerCount();
        return;
      }

      if (msg.type === 'controller') {
        role = 'controller';
        code = typeof msg.code === 'string' ? msg.code.trim() : '';
        logMsg({ type: 'pair-attempt', code });
        if (clients.size === 0) {
          send(ws, { type: 'error', message: 'Lab is not open on the computer yet. Open the lab first, then retry.' });
          return;
        }
        if (code !== pairCode) {
          send(ws, { type: 'error', message: 'Invalid pairing code. Check the number on the computer screen.' });
          return;
        }
        controllers.add(ws);
        controllerCodes.set(ws, code);
        send(ws, { type: 'paired', code });
        logMsg({ type: 'paired' });
        broadcastControllerCount();
        return;
      }

      // Telemetry (bound button count, JS errors, screen info) — logged even
      // before pairing so we can see what the phone loaded.
      if (msg.type === 'telemetry') {
        logMsg(msg);
        return;
      }

      // Relay everything else from a paired controller to every lab tab.
      if (role === 'controller' && controllerCodes.has(ws)) {
        logMsg(msg);
        // NOTE: do not strip `code` here — `key` messages need it to replay
        // the keyboard shortcut on the lab tab (pairing `code` never reaches
        // this point; it is handled in the `controller` branch above).
        for (const c of clients) send(c, msg);
      }
    });

    ws.on('close', () => {
      if (role === 'client') clients.delete(ws);
      if (role === 'controller') {
        controllers.delete(ws);
        controllerCodes.delete(ws);
        broadcastControllerCount();
      }
    });
  });
}
