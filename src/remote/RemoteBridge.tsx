import { useEffect } from 'react';

// Shared, mutable input state written by the WebSocket bridge and read every
// frame by WASDPlayerControls inside LabRoom.tsx.
export const remoteControl = {
  moveX: 0,
  moveZ: 0,
  lookDx: 0,
  lookDy: 0,
  tilt: null as { yaw: number; pitch: number } | null,
  connected: false,
  controllerCount: 0,
  drone: null as {
    pitch: number;
    roll: number;
    yaw: number;
    throttle: number;
    turbo: boolean;
    active: boolean;
  } | null,
  droneCmd: null as string | null,
};

const lastKeys: Record<string, boolean> = {};

function dispatchKey(code: string, down: boolean) {
  // Derive a proper `key` value too: some handlers (e.g. the rack modal item
  // picker) read e.key (parseInt), not e.code.
  let key = code;
  if (code.startsWith('Key')) key = code.slice(3).toLowerCase();
  else if (code.startsWith('Digit')) key = code.slice(5);
  else if (code.startsWith('Numpad')) key = code.slice(6);
  else if (code === 'Space') key = ' ';
  const evt = new KeyboardEvent(down ? 'keydown' : 'keyup', {
    code,
    key,
    bubbles: true,
  });
  window.dispatchEvent(evt);
}

// Convert joystick axes into held WASD key state. Only dispatches on actual
// state changes so the existing key listeners keep a clean pressed state.
function applyMove(x: number, z: number) {
  const want: Record<string, boolean> = {
    KeyW: z < -0.15,
    KeyS: z > 0.15,
    KeyA: x < -0.15,
    KeyD: x > 0.15,
  };
  (['KeyW', 'KeyS', 'KeyA', 'KeyD'] as const).forEach((k) => {
    const pressed = want[k];
    if (pressed !== !!lastKeys[k]) {
      lastKeys[k] = pressed;
      dispatchKey(k, pressed);
    }
  });
}

export function RemoteBridge() {
  useEffect(() => {
    if (typeof window === 'undefined') return;

    let alive = true;

    const connect = () => {
      const proto = location.protocol === 'https:' ? 'wss://' : 'ws://';
      const ws = new WebSocket(`${proto}${location.host}/ws`);

      ws.onopen = () => {
        remoteControl.connected = true;
        ws.send(JSON.stringify({ type: 'client' }));
      };

      ws.onmessage = (e) => {
        let msg: any;
        try {
          msg = JSON.parse(e.data as string);
        } catch {
          return;
        }
        if (!msg || typeof msg.type !== 'string') return;

        switch (msg.type) {
          case 'move':
            applyMove(Number(msg.x) || 0, Number(msg.z) || 0);
            break;
          case 'look':
            remoteControl.lookDx += Number(msg.dx) || 0;
            remoteControl.lookDy += Number(msg.dy) || 0;
            break;
          case 'tilt':
            if (msg.active === false) {
              remoteControl.tilt = null;
            } else if (typeof msg.yaw === 'number' && typeof msg.pitch === 'number') {
              remoteControl.tilt = { yaw: msg.yaw, pitch: msg.pitch };
            }
            break;
          case 'controllerCount':
            remoteControl.controllerCount = Number(msg.count) || 0;
            break;
          case 'key':
            if (typeof msg.code === 'string') {
              dispatchKey(msg.code, Boolean(msg.down));
            }
            break;
          case 'drone':
            remoteControl.drone = {
              pitch: Number(msg.pitch) || 0,
              roll: Number(msg.roll) || 0,
              yaw: Number(msg.yaw) || 0,
              throttle: Math.max(0, Math.min(1, Number(msg.throttle) || 0)),
              turbo: Boolean(msg.turbo),
              active: true,
            };
            break;
          case 'droneCmd':
            remoteControl.droneCmd = typeof msg.cmd === 'string' ? msg.cmd : null;
            break;
          case 'voice':
            dispatchKey('Space', Boolean(msg.down));
            break;
          default:
            break;
        }
      };

      ws.onclose = () => {
        remoteControl.connected = false;
        if (!alive) return;
        applyMove(0, 0);
        remoteControl.tilt = null;
        remoteControl.drone = null;
        remoteControl.droneCmd = null;
        // Auto-reconnect so a server restart doesn't permanently kill the lab tab.
        setTimeout(connect, 2000);
      };
    };

    connect();

    return () => {
      alive = false;
      remoteControl.connected = false;
      remoteControl.drone = null;
      remoteControl.droneCmd = null;
      applyMove(0, 0);
      remoteControl.tilt = null;
    };
  }, []);

  return null;
}
