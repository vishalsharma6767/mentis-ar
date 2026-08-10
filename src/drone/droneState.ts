import * as THREE from 'three';
import type { DroneMode } from './droneModes';

export type DroneStatus = 'idle' | 'flying' | 'landing' | 'landed' | 'crashed' | 'completed';

export interface DroneObjective {
  id: string;
  label: string;
  done: boolean;
}

export interface DroneAxes {
  pitch: number; // -1..1 forward/back
  roll: number; // -1..1 left/right
  yaw: number; // -1..1 rotate
  throttle: number; // 0..1
  turbo: boolean;
}

// Shared mutable state written by the DroneSim loop and read by the HUD
// (mirrors the remoteControl pattern used for the phone bridge).
export const droneState = {
  mode: 'free' as DroneMode,
  status: 'idle' as DroneStatus,
  altitude: 0,
  speed: 0,
  battery: 100,
  throttle: 0,
  time: 0,
  gatesTotal: 0,
  gatesHit: 0,
  objectives: [] as DroneObjective[],
  message: 'Welcome to the Drone Flight Academy. Pick a mode and press Takeoff.',
  bestTime: 0,
  cameraMode: 'fpv' as 'fpv' | 'chase' | 'orbit',
  // Attitude telemetry (degrees) read by the FPV HUD overlay.
  roll: 0,
  pitch: 0,
  heading: 0,
  // Live navigation target (drives HUD pill + FPV edge arrow + 3D arrows).
  targetLabel: '',
  targetDist: 0,
  targetBearing: 0,
};

// Commands dispatched from the HUD / phone controller / keyboard.
export const droneCmd = {
  reset: 0,
  mode: null as DroneMode | null,
  takeoff: 0,
  land: 0,
  camera: 0,
};

// Live drone pose written by the physics loop, read by the 3D model + camera.
export const dronePose = {
  position: new THREE.Vector3(0, 0.35, 0),
  quaternion: new THREE.Quaternion(),
  velocity: new THREE.Vector3(),
};
