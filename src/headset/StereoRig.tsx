import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { headState } from './headRig';
import { remoteControl } from '../remote/RemoteBridge';

const euler = new THREE.Euler(0, 0, 0, 'YXZ');
const _right = new THREE.Vector3();
const _fwd = new THREE.Vector3();
const _dir = new THREE.Vector3();

// Drives one eye camera of the split-screen stereo view from the shared
// headset state: head yaw/pitch (gyroscope) + a fixed interpupillary offset.
// The left eye also integrates walking input so it is applied exactly once.
export function StereoRig({ eye, clampMode }: { eye: 'left' | 'right'; clampMode: 'lab' | 'solar' }) {
  const { camera } = useThree();

  useFrame((_, delta) => {
    const s = headState;

    if (eye === 'left') {
      // Right-stick / phone-controller look while in split VR.
      if (remoteControl.lookDx !== 0 || remoteControl.lookDy !== 0) {
        const sens = 0.0035;
        s.yaw -= remoteControl.lookDx * sens;
        s.pitch -= remoteControl.lookDy * sens;
        s.pitch = Math.max(-1.1, Math.min(1.1, s.pitch));
        remoteControl.lookDx = 0;
        remoteControl.lookDy = 0;
      }

      // Left-stick walking.
      const x = remoteControl.moveX;
      const z = remoteControl.moveZ;
      if (x !== 0 || z !== 0) {
        _fwd.set(-Math.sin(s.yaw), 0, -Math.cos(s.yaw));
        _right.set(Math.cos(s.yaw), 0, -Math.sin(s.yaw));
        _dir.set(0, 0, 0).addScaledVector(_right, x).addScaledVector(_fwd, z);
        if (_dir.lengthSq() > 0) _dir.normalize();
        s.playerPos.addScaledVector(_dir, 2.8 * delta);
        if (clampMode === 'lab') {
          s.playerPos.x = Math.max(-4.5, Math.min(4.5, s.playerPos.x));
          s.playerPos.z = Math.max(0.5, Math.min(6.0, s.playerPos.z));
        } else {
          s.playerPos.x = Math.max(-10, Math.min(10, s.playerPos.x));
          s.playerPos.z = Math.max(-10, Math.min(10, s.playerPos.z));
        }
        s.playerPos.y = 1.6;
      }
    }

    _right.set(Math.cos(s.yaw), 0, -Math.sin(s.yaw));
    camera.position.copy(s.playerPos).addScaledVector(_right, (eye === 'left' ? -1 : 1) * (s.ipd / 2));
    euler.set(s.pitch, s.yaw, 0);
    camera.quaternion.setFromEuler(euler);
  });

  return null;
}
