import * as THREE from 'three';

const DEG = Math.PI / 180;

// Shared headset state for the manual side-by-side stereo mode. Both eye
// cameras read this; the phone's gyroscope (DeviceOrientation) supplies the
// look orientation, and remoteControl.moveX/moveZ (phone controller or
// gamepad left stick) drive walking around the room.
export const headState = {
  splitActive: false,
  yaw: 0, // radians, positive = turn right
  pitch: 0,
  ipd: 0.064, // interpupillary distance (metres)
  playerPos: new THREE.Vector3(0, 1.6, 3.8),
};

let rawYaw = 0;
let rawPitch = 0;
let yawOffset = 0;
let pitchOffset = 0;

function apply() {
  headState.yaw = rawYaw - yawOffset;
  headState.pitch = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, rawPitch - pitchOffset));
}

function onOrientation(e: DeviceOrientationEvent) {
  const gamma = e.gamma ?? 0;
  const beta = e.beta ?? 0;
  rawYaw = -gamma * DEG;
  rawPitch = -beta * DEG;
  apply();
}

// iOS requires an explicit permission request (triggered by a user gesture).
export function startHeadTracking(): Promise<boolean> {
  const anyEvt = DeviceOrientationEvent as unknown as { requestPermission?: () => Promise<string> };
  if (typeof DeviceOrientationEvent !== 'undefined' && typeof anyEvt.requestPermission === 'function') {
    return anyEvt
      .requestPermission()
      .then((perm) => {
        if (perm === 'granted') {
          window.addEventListener('deviceorientation', onOrientation);
          return true;
        }
        return false;
      })
      .catch(() => false);
  }
  window.addEventListener('deviceorientation', onOrientation);
  return Promise.resolve(true);
}

export function stopHeadTracking() {
  window.removeEventListener('deviceorientation', onOrientation);
}

// Re-zero the look so "straight ahead" matches the current phone pose.
export function recenter() {
  yawOffset = rawYaw;
  pitchOffset = rawPitch;
  apply();
}
