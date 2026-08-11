import { useFrame, useThree } from '@react-three/fiber';
import { useXR } from '@react-three/xr';
import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { headState } from '../headset/headRig';

export function DesktopController({ mode }: { mode: 'menu' | 'countdown' | 'lab' }) {
  const { camera } = useThree();
  const presenting = useXR((s) => s.isPresenting);
  const keys = useRef<{ [key: string]: boolean }>({});

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if typing in input
      if ((e.target as HTMLElement)?.tagName === 'INPUT') return;
      keys.current[e.code] = true;
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement)?.tagName === 'INPUT') return;
      keys.current[e.code] = false;
    };
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  useFrame((_, delta) => {
    if (mode !== 'lab') return;
    // In an active VR session the headset owns the camera — walk via XRWalk.
    // In split-screen stereo the StereoRig owns the cameras.
    if (presenting || headState.splitActive) return;

    const speed = 4;
    const moveZ = (keys.current['KeyS'] || keys.current['ArrowDown'] ? 1 : 0) - (keys.current['KeyW'] || keys.current['ArrowUp'] ? 1 : 0);
    const moveX = (keys.current['KeyD'] || keys.current['ArrowRight'] ? 1 : 0) - (keys.current['KeyA'] || keys.current['ArrowLeft'] ? 1 : 0);

    const direction = new THREE.Vector3(moveX, 0, moveZ);

    if (direction.lengthSq() > 0) {
      direction.normalize();
      const euler = new THREE.Euler(0, camera.rotation.y, 0, 'YXZ');
      direction.applyEuler(euler);
      camera.position.addScaledVector(direction, speed * delta);
    }

    // Strictly Clamp camera position within solid room bounds (13m x 13m x 1.6m eye level)
    camera.position.x = Math.max(-12, Math.min(12, camera.position.x));
    camera.position.z = Math.max(-12, Math.min(12, camera.position.z));
    camera.position.y = 1.6; // Fixed human eye height
  });

  return null;
}

