import { useFrame, useThree } from '@react-three/fiber';
import { useXR } from '@react-three/xr';
import * as THREE from 'three';
import { remoteControl } from '../gamepad/gamepadInput';

// Moves the XR player (not the camera) so walking works while a headset
// session is presenting. In immersive VR the headset controls the camera
// every frame, so input must translate the player group instead.
export function XRWalk() {
  const presenting = useXR((s) => s.isPresenting);
  const player = useXR((s) => s.player);
  const { camera } = useThree();

  useFrame((_, delta) => {
    if (!presenting) return;
    const x = remoteControl.moveX;
    const z = remoteControl.moveZ;
    if (x === 0 && z === 0) return;

    const fwd = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion);
    fwd.y = 0;
    if (fwd.lengthSq() > 0) fwd.normalize();

    const right = new THREE.Vector3(1, 0, 0).applyQuaternion(camera.quaternion);
    right.y = 0;
    if (right.lengthSq() > 0) right.normalize();

    const dir = new THREE.Vector3().addScaledVector(right, x).addScaledVector(fwd, z);
    if (dir.lengthSq() > 0) dir.normalize();

    player.position.addScaledVector(dir, 2.8 * delta);

    // Keep the user inside the lab room (roomier now: 24 x 30 with the front
    // and back walls enclosed).
    player.position.x = Math.max(-8.0, Math.min(8.0, player.position.x));
    player.position.z = Math.max(-5.0, Math.min(10.0, player.position.z));
  });

  return null;
}
