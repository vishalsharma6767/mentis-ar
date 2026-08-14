import { useFrame } from '@react-three/fiber';
import { useXR } from '@react-three/xr';
import * as THREE from 'three';
import { remoteControl } from '../gamepad/gamepadInput';

// In an immersive WebXR session the headset tracks the camera every frame, so
// the right stick cannot rotate it directly. Rotating the player group instead
// rotates the whole view — the "right stick moves your head" effect — while
// the left stick (XRWalk) still walks relative to that view.
export function XRLook() {
  const presenting = useXR((s) => s.isPresenting);
  const player = useXR((s) => s.player);

  useFrame(() => {
    if (!presenting) return;

    const dx = remoteControl.lookDx;
    const dy = remoteControl.lookDy;
    remoteControl.lookDx = 0;
    remoteControl.lookDy = 0;

    const sens = 0.0009;
    if (dx !== 0 || dy !== 0) {
      player.rotation.y -= dx * sens;
      player.rotation.x -= dy * sens;
      player.rotation.x = THREE.MathUtils.clamp(player.rotation.x, -1.0, 1.0);
    }

    if (remoteControl.recenterPulse > 0) {
      remoteControl.recenterPulse = 0;
      player.rotation.y = 0;
      player.rotation.x = 0;
      // Face the lab bench again.
      player.rotation.y = -Math.PI / 2;
    }
  });

  return null;
}