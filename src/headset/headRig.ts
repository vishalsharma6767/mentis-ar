import * as THREE from 'three';

const DEG = Math.PI / 180;

// Shared headset state for the manual side-by-side stereo mode. Both eye
// cameras read this; the phone's gyroscope (DeviceOrientation) supplies the
// base look orientation, and the phone controller's look touchpad adds a
// persistent offset on top (lookYaw/lookPitch). remoteControl.moveX/moveZ
// (phone controller or gamepad left stick) drive walking around the room.
export const headState = {
  splitActive: false,
  yaw: 0, // radians, positive = turn right
  pitch: 0,
  lookYaw: 0, // touchpad / right-stick look offset on top of the gyro
  lookPitch: 0,
  ipd: 0.064, // interpupillary distance (metres)
  playerPos: new THREE.Vector3(0, 1.6, 3.8),
};

let rawYaw = 0;
let rawPitch = 0;
let yawOffset = 0;
let pitchOffset = 0;

// Merge the gyro base with the accumulated touchpad look offset. Called on
// every gyro event AND once per frame from StereoRig so the touchpad look is
// never clobbered by the next deviceorientation update.
function compute() {
  headState.yaw = rawYaw - yawOffset + headState.lookYaw;
  headState.pitch = THREE.MathUtils.clamp(
    rawPitch - pitchOffset + headState.lookPitch,
    -Math.PI / 2,
    Math.PI / 2
  );
}

// Recompute the merged orientation now (StereoRig calls this each frame).
export function updateHead() {
  compute();
}

function onOrientation(e: DeviceOrientationEvent) {
  const gamma = e.gamma ?? 0;
  const beta = e.beta ?? 0;
  rawYaw = -gamma * DEG;
  rawPitch = -beta * DEG;
  compute();
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

// Re-zero the look so "straight ahead" matches the current phone pose. The
// touchpad look offset is preserved so the view does not jump.
export function recenter() {
  yawOffset = rawYaw;
  pitchOffset = rawPitch;
  compute();
}
