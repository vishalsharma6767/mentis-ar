// Shared mutable state for the Solar System Academy — mirrors the droneState
// pattern: plain object written by the physics/interaction loop and read by
// the HUD / scene every frame. No React re-renders for hot paths.
import * as THREE from 'three';

export type SolarMode = 'camera' | 'space';

export interface PlanetHandle {
  // Live 3D position/scale/rotation written by the scene loop.
  position: THREE.Vector3;
  scale: number;
  spin: number;
  orbitAngle: number;
  // Interaction flags.
  hovered: boolean;
  selected: boolean;
  grabbed: boolean;
}

export const solarState = {
  mode: 'space' as SolarMode,
  cameraOn: false,
  cameraReady: false,
  cameraError: null as string | null,

  // Which planet is currently grabbed / selected (id, e.g. 'jupiter').
  grabbedId: null as string | null,
  selectedId: null as string | null,
  hoveredId: null as string | null,

  // Reticle gaze target — the id the centre raycast currently hits.
  gazeId: null as string | null,
  gazeLocked: false,

  // Hand-tracking cursor (2D NDC in [-1,1], y-up) + pinch state. Written by
  // HandTracking.ts, consumed by the SolarSystem interaction loop.
  hand: {
    active: false,
    x: 0,
    y: 0,
    pinch: false,
    pinchStrength: 0,
    lastPinch: false,
  } as {
    active: boolean;
    x: number;
    y: number;
    pinch: boolean;
    pinchStrength: number;
    lastPinch: boolean;
  },

  // Live planet transforms, keyed by planet id (from solarData).
  planets: {} as Record<string, PlanetHandle>,

  // Total system scale applied to orbit radii (pinch-to-zoom).
  scale: 1,

  // Drag look for rotating the whole model (mouse/touch out of headset).
  dragRot: { x: 0, y: 0 }, // degrees applied around the system
};

// Command channel — bumped to trigger one-shot actions from HUD / voice.
export const solarCmd = {
  cameraToggle: 0, // flip camera/space mode
  reset: 0, // restore all planets to orbits
  stop: 0, // stop all planet motion
  focus: 0, // recentre system
  select: 0, // select planet at view centre (phone remote tap)
};

export function resetPlanets() {
  for (const key of Object.keys(solarState.planets)) {
    const p = solarState.planets[key];
    p.scale = 1;
    p.orbitAngle = 0;
    p.grabbed = false;
    p.hovered = false;
    p.selected = false;
  }
  solarState.scale = 1;
  solarState.grabbedId = null;
  solarState.selectedId = null;
  solarState.dragRot = { x: 0, y: 0 };
}
