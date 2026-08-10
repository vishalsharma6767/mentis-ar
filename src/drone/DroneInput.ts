import { remoteControl } from '../remote/RemoteBridge';
import type { DroneAxes } from './droneState';

const keys: Record<string, boolean> = {};
let kbThrottle = 0;

function clamp01(v: number): number {
  return Math.max(0, Math.min(1, v));
}

function dead(v: number): number {
  return Math.abs(v) < 0.08 ? 0 : v;
}

export function registerDroneInput(): () => void {
  const down = (e: KeyboardEvent) => {
    if ((e.target as HTMLElement)?.tagName === 'INPUT' || (e.target as HTMLElement)?.tagName === 'SELECT') return;
    keys[e.code] = true;
  };
  const up = (e: KeyboardEvent) => {
    keys[e.code] = false;
  };
  window.addEventListener('keydown', down);
  window.addEventListener('keyup', up);
  return () => {
    window.removeEventListener('keydown', down);
    window.removeEventListener('keyup', up);
  };
}

function readGamepad(): DroneAxes | null {
  if (typeof navigator === 'undefined' || !navigator.getGamepads) return null;
  const gp = navigator.getGamepads()[0];
  if (!gp) return null;
  const ax = gp.axes || [];
  const btn = gp.buttons || [];
  // Mode-2 style: left stick = pitch/roll, right stick = yaw/throttle.
  // Throttle is "push up to climb" so a centred stick is 0 — the drone never
  // moves or takes off by itself when a gamepad is just sitting at neutral.
  return {
    pitch: dead(ax[1] || 0),
    roll: dead(ax[0] || 0),
    yaw: dead(ax[2] || 0),
    throttle: Math.max(0, -dead(ax[3] || 0)),
    turbo: !!(btn[5]?.pressed || btn[7]?.pressed),
  };
}

export function readDroneAxes(): DroneAxes {
  // Keyboard throttle is a persistent "stick": hold W to climb, S to descend.
  if (keys['KeyW']) kbThrottle = Math.min(1, kbThrottle + 0.05);
  if (keys['KeyS']) kbThrottle = Math.max(0, kbThrottle - 0.05);

  const kbd: DroneAxes = {
    pitch: (keys['ArrowUp'] ? 1 : 0) - (keys['ArrowDown'] ? 1 : 0),
    roll: (keys['ArrowRight'] ? 1 : 0) - (keys['ArrowLeft'] ? 1 : 0),
    yaw: (keys['KeyD'] ? 1 : 0) - (keys['KeyA'] ? 1 : 0),
    throttle: kbThrottle,
    turbo: !!(keys['ShiftLeft'] || keys['ShiftRight']),
  };

  // Mobile phone controller takes priority when streaming drone axes.
  const mob = remoteControl.drone;
  if (mob && mob.active) {
    return {
      pitch: dead(mob.pitch),
      roll: dead(mob.roll),
      yaw: dead(mob.yaw),
      throttle: clamp01(mob.throttle),
      turbo: mob.turbo || kbd.turbo,
    };
  }

  const pad = readGamepad();
  if (pad) return { ...pad, turbo: pad.turbo || kbd.turbo };

  return kbd;
}
