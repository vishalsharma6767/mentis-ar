export type DroneMode = 'free' | 'race' | 'mission';

export interface DroneGate {
  position: [number, number, number];
  radius?: number;
}

export interface DroneTarget {
  position: [number, number, number];
  radius: number;
  label: string;
}

export const ARENA_HALF = 20;

export const DRONE_START: [number, number, number] = [0, 0, 0];

export const GATE_RADIUS = 1.6;

// Static pylons to dodge — present in every mode.
export const DRONE_PYLONS: [number, number, number][] = [
  [6, 0, -4],
  [-7, 0, 5],
  [9, 0, 8],
  [-9, 0, -8],
  [4, 0, -13],
  [-4, 0, 13],
  [13, 0, 2],
  [-13, 0, -2],
];

// Serpentine race course — gates are flown through sequentially.
export const RACE_GATES: DroneGate[] = [
  { position: [0, 2.2, -7] },
  { position: [6, 2.8, -9] },
  { position: [10, 3.4, -2] },
  { position: [6, 3.6, 6] },
  { position: [-5, 3.2, 7] },
  { position: [-10, 2.8, 0] },
  { position: [-5, 2.4, -7] },
];

export const MISSION_TARGETS: DroneTarget[] = [
  { position: [8, 0.1, 7], radius: 2.4, label: 'Deliver to Pad A' },
  { position: [-8, 0.1, -7], radius: 2.4, label: 'Deliver to Pad B' },
  { position: [0, 0.1, 13], radius: 2.4, label: 'Deliver to Pad C' },
];

export const FREE_LANDING: DroneTarget = {
  position: [0, 0.1, 0],
  radius: 2.4,
  label: 'Landing Pad',
};

export function modeLabel(m: DroneMode): string {
  return m === 'free' ? 'FREE FLIGHT' : m === 'race' ? 'OBSTACLE RACE' : 'MISSION TRAINING';
}
