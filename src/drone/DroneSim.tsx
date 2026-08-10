import { useEffect, useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { Text, Sky, Float } from '@react-three/drei';
import * as THREE from 'three';
import { Drone } from './Drone';
import { dronePose, droneState, droneCmd, DroneObjective, DroneStatus } from './droneState';
import { readDroneAxes, registerDroneInput } from './DroneInput';
import {
  ARENA_HALF,
  DRONE_PYLONS,
  GATE_RADIUS,
  RACE_GATES,
  MISSION_TARGETS,
  FREE_LANDING,
  DroneMode,
} from './droneModes';
import { remoteControl } from '../remote/RemoteBridge';

// ---- Realistic quadcopter constants ----
// A small training quad: mass ~1.1 kg, thrust-to-weight ~2:1, so hover needs
// roughly half throttle. Horizontal accel comes from body tilt (g·tan(tilt)).
const G = 9.81;
const THRUST_MAX = 19.6; // m/s^2 vertical accel at full throttle (2:1)
const MAX_TILT = 0.7; // radians (~40 deg) — angle-mode stick limit
const TILT_RATE = 3.0; // rad/s attitude response (auto-level + stick)
const YAW_SPEED = 2.4;
const DRAG = 0.55;
const MAX_SPEED = 17;
const CRASH_GROUND_VY = 6.5;
const DRONE_R = 0.6;
const GROUND_Y = 0.35;
const HOVER_THROTTLE = G / THRUST_MAX; // ~0.5

const CAM_FOV: Record<string, number> = { fpv: 78, chase: 52, orbit: 44 };

interface GateSim {
  pos: THREE.Vector3;
  forward: THREE.Vector3;
  radius: number;
  passed: boolean;
  prevAlong: number;
}

interface Sim {
  mode: DroneMode;
  status: DroneStatus;
  time: number;
  battery: number;
  throttle: number;
  gates: GateSim[];
  gatesHit: number;
  objectives: DroneObjective[];
  crashTimer: number;
  lastReset: number;
  lastTakeoff: number;
  lastLand: number;
  lastCamera: number;
  orbitAngle: number;
}

function buildGates(): GateSim[] {
  const gates: GateSim[] = [];
  RACE_GATES.forEach((g, i) => {
    const pos = new THREE.Vector3(...g.position);
    let forward: THREE.Vector3;
    const next = RACE_GATES[i + 1];
    const prev = RACE_GATES[i - 1];
    if (next) {
      forward = new THREE.Vector3(...next.position).sub(pos).setY(0).normalize();
    } else if (prev) {
      forward = pos.clone().sub(new THREE.Vector3(...prev.position)).setY(0).normalize();
    } else {
      forward = new THREE.Vector3(0, 0, -1);
    }
    gates.push({ pos, forward, radius: g.radius || GATE_RADIUS, passed: false, prevAlong: 0 });
  });
  return gates;
}

// ---- Desert terrain: deterministic value noise + fbm ----
function hash2(x: number, y: number): number {
  const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453123;
  return s - Math.floor(s);
}
function smooth(t: number): number {
  return t * t * (3 - 2 * t);
}
function valueNoise(x: number, y: number): number {
  const ix = Math.floor(x);
  const iy = Math.floor(y);
  const fx = x - ix;
  const fy = y - iy;
  const sx = smooth(fx);
  const sy = smooth(fy);
  const a = hash2(ix, iy);
  const b = hash2(ix + 1, iy);
  const c = hash2(ix, iy + 1);
  const d = hash2(ix + 1, iy + 1);
  return a + (b - a) * sx + (c - a) * sy + (a - b - c + d) * sx * sy;
}
function fbm(x: number, y: number): number {
  let v = 0;
  let amp = 0.5;
  let f = 1;
  for (let o = 0; o < 4; o++) {
    v += amp * valueNoise(x * f, y * f);
    amp *= 0.5;
    f *= 2.13;
  }
  return v;
}
// Flying field stays flat near the center; dunes roll in beyond it.
function terrainHeight(x: number, z: number): number {
  const d = Math.hypot(x, z);
  const m = Math.min(1, Math.max(0, (d - 34) / 46));
  return fbm(x * 0.016, z * 0.016) * 3.4 * m;
}

const SAND_BASE = new THREE.Color('#d3b27e');
const SAND_DARK = new THREE.Color('#a17e50');
const ROCK_A = new THREE.Color('#9c8b76');
const ROCK_B = new THREE.Color('#6e5f4e');

function Rock({ position, scale, seed }: { position: [number, number, number]; scale: number; seed: number }) {
  const rotY = useMemo(() => hash2(seed, seed + 7) * Math.PI * 2, [seed]);
  const rotX = useMemo(() => (hash2(seed + 3, seed) - 0.5) * 0.35, [seed]);
  const s = useMemo(() => scale * (0.7 + hash2(seed + 1, seed + 2) * 0.6), [scale, seed]);
  return (
    <group position={position} rotation={[rotX, rotY, 0]} scale={s}>
      <mesh castShadow>
        <dodecahedronGeometry args={[0.7, 0]} />
        <meshStandardMaterial color={ROCK_A} flatShading roughness={0.95} metalness={0.02} />
      </mesh>
      <mesh position={[0.15 * s, 0.4 * s, 0.1 * s]} castShadow>
        <icosahedronGeometry args={[0.4, 0]} />
        <meshStandardMaterial color={ROCK_B} flatShading roughness={1} metalness={0} />
      </mesh>
    </group>
  );
}

function Cactus({ position, scale }: { position: [number, number, number]; scale: number }) {
  const rotY = useMemo(() => Math.random() * Math.PI * 2, []);
  return (
    <group position={position} rotation={[0, rotY, 0]} scale={scale}>
      <mesh castShadow position={[0, 1.1, 0]}>
        <cylinderGeometry args={[0.17, 0.22, 2.2, 8]} />
        <meshStandardMaterial color="#3f7a3c" flatShading roughness={0.9} />
      </mesh>
      <mesh castShadow position={[0.3, 1.7, 0]} rotation={[0, 0, -0.6]}>
        <cylinderGeometry args={[0.09, 0.11, 0.9, 6]} />
        <meshStandardMaterial color="#3f7a3c" flatShading roughness={0.9} />
      </mesh>
      <mesh castShadow position={[-0.32, 1.55, 0]} rotation={[0, 0, 0.6]}>
        <cylinderGeometry args={[0.09, 0.11, 0.8, 6]} />
        <meshStandardMaterial color="#3f7a3c" flatShading roughness={0.9} />
      </mesh>
    </group>
  );
}

function HeliPad({ position, label, textColor }: { position: [number, number, number]; label: string; textColor?: string }) {
  const r = 2.2;
  return (
    <group position={[position[0], GROUND_Y - 0.03, position[2]]}>
      <mesh rotation-x={-Math.PI / 2} receiveShadow>
        <circleGeometry args={[r, 40]} />
        <meshStandardMaterial color="#24272d" roughness={0.95} />
      </mesh>
      <mesh rotation-x={-Math.PI / 2} position-y={0.005}>
        <ringGeometry args={[r - 0.35, r, 48]} />
        <meshStandardMaterial color="#e6e2d8" roughness={0.8} />
      </mesh>
      {/* Painted H */}
      <group position={[0, 0.01, 0]}>
        {[-0.32, 0.32].map((x) => (
          <mesh key={x} position={[x, 0.005, 0]} rotation-x={-Math.PI / 2}>
            <planeGeometry args={[0.16, 1.0]} />
            <meshStandardMaterial color="#e6e2d8" roughness={0.8} />
          </mesh>
        ))}
        <mesh position={[0, 0.005, 0]} rotation-x={-Math.PI / 2}>
          <planeGeometry args={[0.95, 0.16]} />
          <meshStandardMaterial color="#e6e2d8" roughness={0.8} />
        </mesh>
      </group>
      <Text position={[0, 0.85, 0]} fontSize={0.24} color={textColor || '#e6e2d8'} anchorX="center">
        {label}
      </Text>
    </group>
  );
}

function RaceGate({ gate, index, isNext }: { gate: GateSim; index: number; isNext: boolean }) {
  const quat = useMemo(
    () => new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), gate.forward.clone()),
    [gate]
  );
  const r = gate.radius;
  const h = r * 2 + 1.2;
  const dim = gate.passed ? '#6b7280' : isNext ? '#f97316' : '#c2601c';
  return (
    <group position={gate.pos} quaternion={quat}>
      {/* Left + right posts */}
      {[-1, 1].map((s) => (
        <group key={s}>
          <mesh position={[s * (r + 0.28), h / 2 - 0.4, 0]} castShadow>
            <boxGeometry args={[0.22, h, 0.22]} />
            <meshStandardMaterial color="#4b5563" roughness={0.7} />
          </mesh>
          <mesh position={[s * (r + 0.28), h - 0.55, 0]}>
            <boxGeometry args={[0.28, 0.3, 0.28]} />
            <meshStandardMaterial color={dim} roughness={0.6} />
          </mesh>
        </group>
      ))}
      {/* Top bar */}
      <mesh position={[0, h - 0.4, 0]} castShadow>
        <boxGeometry args={[2 * (r + 0.28) + 0.2, 0.3, 0.26]} />
        <meshStandardMaterial color={dim} roughness={0.6} />
      </mesh>
      {/* Hanging number banner */}
      <mesh position={[0, h - 0.95, 0.02]}>
        <planeGeometry args={[1.3, 0.85]} />
        <meshStandardMaterial
          color={gate.passed ? '#374151' : isNext ? '#fef3c7' : '#e8e3d8'}
          emissive={isNext ? '#f97316' : '#000000'}
          emissiveIntensity={isNext ? 0.25 : 0}
          roughness={0.9}
        />
      </mesh>
      <Text position={[0, h - 0.95, 0.06]} fontSize={0.5} color={isNext ? '#7c2d12' : '#374151'} anchorX="center" anchorY="middle">
        {index + 1}
      </Text>
    </group>
  );
}

// Guidance arrow that bobs above the next objective so the pilot always knows
// where to go next.
function NavArrow({ position }: { position: THREE.Vector3 }) {
  return (
    <Float speed={2} rotationIntensity={0} floatIntensity={0.7}>
      <group position={[position.x, 3.4, position.z]}>
        <mesh rotation-x={Math.PI} castShadow>
          <coneGeometry args={[0.45, 1.1, 4]} />
          <meshStandardMaterial color="#f97316" emissive="#f97316" emissiveIntensity={0.6} />
        </mesh>
        <mesh position={[0, -0.75, 0]}>
          <cylinderGeometry args={[0.06, 0.06, 0.8, 6]} />
          <meshStandardMaterial color="#fbbf24" emissive="#fbbf24" emissiveIntensity={0.5} />
        </mesh>
      </group>
    </Float>
  );
}

function Terrain() {
  const geo = useMemo(() => {
    const g = new THREE.PlaneGeometry(230, 230, 150, 150);
    g.rotateX(-Math.PI / 2);
    const pos = g.attributes.position;
    const colors = new Float32Array(pos.count * 3);
    const c = new THREE.Color();
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const z = pos.getZ(i);
      const y = terrainHeight(x, z);
      pos.setY(i, y);
      c.lerpColors(SAND_BASE, SAND_DARK, Math.min(1, y * 0.18 + valueNoise(x * 0.35, z * 0.35) * 0.35));
      colors[i * 3] = c.r;
      colors[i * 3 + 1] = c.g;
      colors[i * 3 + 2] = c.b;
    }
    g.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    g.computeVertexNormals();
    return g;
  }, []);
  return (
    <mesh geometry={geo} receiveShadow>
      <meshStandardMaterial vertexColors roughness={1} metalness={0} />
    </mesh>
  );
}

const SCENERY = (() => {
  const rocks: { p: [number, number, number]; s: number; seed: number }[] = [];
  const cacti: { p: [number, number, number]; s: number }[] = [];
  let seed = 1;
  for (let i = 0; i < 26; i++) {
    const a = (i / 26) * Math.PI * 2 + hash2(i, 3) * 0.6;
    const d = 26 + hash2(i, 9) * 26;
    const x = Math.cos(a) * d;
    const z = Math.sin(a) * d;
    if (i % 2 === 0) {
      rocks.push({ p: [x, terrainHeight(x, z) + 0.2, z], s: 1.6 + hash2(i, 5) * 2.2, seed: seed++ });
    } else {
      cacti.push({ p: [x, terrainHeight(x, z), z], s: 1.1 + hash2(i, 7) * 1.1 });
    }
  }
  return { rocks, cacti };
})();

const scratchF = new THREE.Vector3();
const scratchR = new THREE.Vector3();
const scratch = new THREE.Vector3();
const scratch2 = new THREE.Vector3();
const _up = new THREE.Vector3();
const _euler = new THREE.Euler(0, 0, 0, 'YXZ');
const _fwd = new THREE.Vector3();
const _right = new THREE.Vector3();
const _target = new THREE.Vector3();

function clampStep(cur: number, target: number, maxStep: number): number {
  if (cur < target) return Math.min(maxStep, target - cur);
  if (cur > target) return -Math.min(maxStep, cur - target);
  return 0;
}

export function DroneSim({ active }: { active: boolean }) {
  const camera = useThree((s) => s.camera) as THREE.PerspectiveCamera;
  const sim = useRef<Sim>({
    mode: 'free',
    status: 'idle',
    time: 0,
    battery: 100,
    throttle: 0,
    gates: [],
    gatesHit: 0,
    objectives: [],
    crashTimer: 0,
    lastReset: 0,
    lastTakeoff: 0,
    lastLand: 0,
    lastCamera: 0,
    orbitAngle: 0,
  });
  const activeRef = useRef(active);
  activeRef.current = active;
  const camSmooth = useRef(new THREE.Vector3(0, 1.8, 4.6));
  const camFov = useRef(52);
  const resetId = useRef(0);

  const resetSim = (mode: DroneMode) => {
    const s = sim.current;
    s.mode = mode;
    s.status = 'idle';
    s.time = 0;
    s.battery = 100;
    s.throttle = 0;
    s.crashTimer = 0;
    s.gatesHit = 0;
    s.orbitAngle = Math.random() * Math.PI * 2;
    dronePose.position.set(0, GROUND_Y, 0);
    dronePose.quaternion.identity();
    dronePose.velocity.set(0, 0, 0);

    if (mode === 'race') {
      s.gates = buildGates();
      s.objectives = [];
      droneState.message = 'Obstacle Race! Press TAKEOFF, then fly through all 7 gates in order.';
    } else if (mode === 'mission') {
      s.gates = [];
      s.objectives = MISSION_TARGETS.map((t) => ({ id: t.label, label: t.label, done: false }));
      droneState.message = 'Mission Training! Press TAKEOFF, then deliver the package to every pad by landing on it.';
    } else {
      s.gates = [];
      s.objectives = [{ id: 'land', label: 'Practice takeoff, hover and land back on the pad', done: false }];
      droneState.message = 'Free Flight! Press TAKEOFF, hold throttle to climb, tilt to move. Press LAND to come back down.';
    }
    droneState.mode = mode;
    droneState.status = 'idle';
    droneState.gatesTotal = s.gates.length;
    droneState.gatesHit = 0;
    droneState.objectives = [...s.objectives];
    camFov.current = CAM_FOV[droneState.cameraMode];
    camera.fov = camFov.current;
    camera.updateProjectionMatrix();
    resetId.current++;
  };

  useEffect(() => {
    resetSim(droneState.mode);
    const unregister = registerDroneInput();
    const onKey = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement)?.tagName === 'INPUT') return;
      if (e.code === 'Space') {
        const st = sim.current.status;
        if (st === 'idle' || st === 'landed' || st === 'completed') droneCmd.takeoff++;
        else if (st === 'flying') droneCmd.land++;
      } else if (e.code === 'KeyR') {
        droneCmd.reset++;
      } else if (e.code === 'KeyM') {
        cycleMode();
      } else if (e.code === 'KeyC') {
        droneCmd.camera++;
      }
    };
    window.addEventListener('keydown', onKey);
    return () => {
      unregister();
      window.removeEventListener('keydown', onKey);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (active) resetSim(droneState.mode);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active]);

  const cycleMode = () => {
    const order: DroneMode[] = ['free', 'race', 'mission'];
    const cur = sim.current.mode;
    const next = order[(order.indexOf(cur) + 1) % order.length];
    droneCmd.mode = next;
  };

  const takeoff = () => {
    sim.current.status = 'flying';
    droneState.status = 'flying';
    droneState.message = 'Takeoff! Push throttle up, keep it steady near half to hover.';
  };

  const finishLanding = () => {
    const s = sim.current;
    s.status = 'landed';
    droneState.status = 'landed';
    dronePose.velocity.set(0, 0, 0);

    if (s.mode === 'mission') {
      let changed = false;
      s.objectives.forEach((o, i) => {
        if (o.done) return;
        const t = MISSION_TARGETS[i];
        const d = Math.hypot(dronePose.position.x - t.position[0], dronePose.position.z - t.position[2]);
        if (d < t.radius + 0.6) {
          o.done = true;
          changed = true;
        }
      });
      droneState.objectives = [...s.objectives];
      if (changed) droneState.message = 'Package delivered! Take off and fly to the next pad.';
      if (s.objectives.every((o) => o.done)) {
        s.status = 'completed';
        droneState.status = 'completed';
        droneState.message = `Mission complete! All ${s.objectives.length} pads delivered in ${s.time.toFixed(1)}s.`;
      }
    } else if (s.mode === 'free') {
      const t = FREE_LANDING;
      const d = Math.hypot(dronePose.position.x - t.position[0], dronePose.position.z - t.position[2]);
      if (d < t.radius + 0.6) {
        s.objectives[0].done = true;
        droneState.objectives = [...s.objectives];
        droneState.message = `Perfect landing! Flight time: ${s.time.toFixed(1)}s.`;
      }
    }
  };

  const crash = () => {
    const s = sim.current;
    s.status = 'crashed';
    droneState.status = 'crashed';
    droneState.message = 'Crash! Resetting to the start pad…';
    dronePose.velocity.set(0, 0, 0);
    s.crashTimer = 0;
  };

  useFrame((_, delta) => {
    const s = sim.current;
    const dt = Math.min(delta, 0.05);

    if (!activeRef.current) {
      dronePose.position.set(0, GROUND_Y, 0);
      dronePose.quaternion.identity();
      dronePose.velocity.set(0, 0, 0);
      return;
    }

    s.time += dt;

    // Commands (HUD / phone / keyboard)
    if (droneCmd.reset !== s.lastReset) {
      s.lastReset = droneCmd.reset;
      resetSim(s.mode);
    }
    if (droneCmd.mode && droneCmd.mode !== s.mode) {
      resetSim(droneCmd.mode);
      droneCmd.mode = null;
    }
    if (droneCmd.takeoff !== s.lastTakeoff) {
      s.lastTakeoff = droneCmd.takeoff;
      if (s.status === 'idle' || s.status === 'landed' || s.status === 'completed') takeoff();
    }
    if (droneCmd.land !== s.lastLand) {
      s.lastLand = droneCmd.land;
      if (s.status === 'flying') {
        s.status = 'landing';
        droneState.status = 'landing';
        droneState.message = 'Landing… easing down to the ground.';
      }
    }
    if (droneCmd.camera !== s.lastCamera) {
      s.lastCamera = droneCmd.camera;
      droneState.cameraMode =
        droneState.cameraMode === 'fpv' ? 'chase' : droneState.cameraMode === 'chase' ? 'orbit' : 'fpv';
    }

    // Phone command relayed as a one-shot.
    const cmd = remoteControl.droneCmd;
    if (cmd) {
      remoteControl.droneCmd = null;
      if (cmd === 'takeoff') droneCmd.takeoff++;
      else if (cmd === 'land') droneCmd.land++;
      else if (cmd === 'reset') droneCmd.reset++;
      else if (cmd === 'mode') cycleMode();
      else if (cmd === 'camera') droneCmd.camera++;
    }

    const input = readDroneAxes();

    // Battery drain
    if (s.status === 'flying' || s.status === 'landing') {
      s.battery = Math.max(0, s.battery - 0.5 * dt);
      if (s.battery <= 0) {
        s.battery = 0;
        droneState.message = 'Battery empty — landing automatically.';
        s.status = 'landing';
        droneState.status = 'landing';
      }
    } else if (s.status === 'idle' || s.status === 'landed') {
      s.battery = Math.max(0, s.battery - 0.1 * dt);
    }

    switch (s.status) {
      case 'idle':
      case 'landed':
      case 'completed':
        // Drone never takes off by itself — it needs an explicit TAKEOFF command.
        s.throttle = 0;
        break;
      case 'flying':
        s.throttle += (input.throttle - s.throttle) * Math.min(1, 6 * dt);
        stepFlying(s, input, dt, false);
        break;
      case 'landing':
        // Controlled descent: ease throttle below hover until grounded.
        s.throttle += (0.16 - s.throttle) * Math.min(1, 3 * dt);
        stepFlying(s, input, dt, true);
        break;
      case 'crashed':
        s.crashTimer += dt;
        s.throttle = 0;
        if (s.crashTimer > 2.5) resetSim(s.mode);
        break;
    }

    // Race gate pass detection (sequential).
    if (s.mode === 'race' && s.status === 'flying' && s.gatesHit < s.gates.length) {
      const gate = s.gates[s.gatesHit];
      scratch.subVectors(dronePose.position, gate.pos);
      const along = scratch.dot(gate.forward);
      const radial = Math.hypot(
        scratch.x - along * gate.forward.x,
        scratch.y - along * gate.forward.y,
        scratch.z - along * gate.forward.z
      );
      if (gate.prevAlong <= 0 && along > 0 && radial < gate.radius + 0.7) {
        gate.passed = true;
        s.gatesHit++;
        droneState.gatesHit = s.gatesHit;
        droneState.message = `Gate ${s.gatesHit}/${s.gates.length}!`;
        if (s.gatesHit >= s.gates.length) {
          s.status = 'completed';
          droneState.status = 'completed';
          const t = s.time.toFixed(1);
          droneState.message = `Course complete in ${t}s!`;
          if (!droneState.bestTime || s.time < droneState.bestTime) {
            droneState.bestTime = s.time;
          }
        }
      }
      gate.prevAlong = along;
    }

    // Telemetry -> HUD
    droneState.altitude = Math.max(0, dronePose.position.y - GROUND_Y);
    droneState.speed = dronePose.velocity.length();
    droneState.battery = s.battery;
    droneState.throttle = s.throttle;
    droneState.time = s.time;
    droneState.status = s.status;

    // Attitude -> FPV HUD overlay
    _euler.setFromQuaternion(dronePose.quaternion);
    droneState.roll = (THREE.MathUtils.radToDeg(_euler.z) + 360) % 360;
    droneState.pitch = THREE.MathUtils.radToDeg(_euler.x);
    droneState.heading = (THREE.MathUtils.radToDeg(_euler.y) + 360) % 360;

    // Navigation target (where to go next)
    computeNavTarget(s);

    // Camera
    const targetFov = CAM_FOV[droneState.cameraMode] || 52;
    if (Math.abs(camFov.current - targetFov) > 0.05) {
      camFov.current += (targetFov - camFov.current) * Math.min(1, 6 * dt);
      camera.fov = camFov.current;
      camera.updateProjectionMatrix();
    }

    if (droneState.cameraMode === 'fpv') {
      scratchF.set(0, 0.07, 0.22).applyQuaternion(dronePose.quaternion);
      camera.position.copy(dronePose.position).add(scratchF);
      camera.quaternion.copy(dronePose.quaternion);
      camSmooth.current.copy(camera.position);
    } else if (droneState.cameraMode === 'chase') {
      scratchF.set(0, 1.7, 4.6).applyQuaternion(dronePose.quaternion);
      scratch2.copy(dronePose.position).add(scratchF);
      const k = 1 - Math.exp(-3.4 * dt);
      camSmooth.current.lerp(scratch2, k);
      camera.position.copy(camSmooth.current);
      scratch2.copy(dronePose.position).add(_up.set(0, 0.8, 0));
      camera.lookAt(scratch2);
    } else {
      s.orbitAngle += dt * 0.32;
      scratchF.set(Math.cos(s.orbitAngle) * 7, 2.4, Math.sin(s.orbitAngle) * 7);
      scratch2.copy(dronePose.position).add(scratchF);
      const k = 1 - Math.exp(-2.6 * dt);
      camSmooth.current.lerp(scratch2, k);
      camera.position.copy(camSmooth.current);
      scratch2.copy(dronePose.position).add(_up.set(0, 0.9, 0));
      camera.lookAt(scratch2);
    }
  });

  const computeNavTarget = (s: Sim) => {
    let tx: number;
    let tz: number;
    let label = '';
    if (s.mode === 'race' && s.gatesHit < s.gates.length) {
      tx = s.gates[s.gatesHit].pos.x;
      tz = s.gates[s.gatesHit].pos.z;
      label = `Gate ${s.gatesHit + 1}`;
    } else if (s.mode === 'mission') {
      const i = s.objectives.findIndex((o) => !o.done);
      if (i >= 0) {
        tx = MISSION_TARGETS[i].position[0];
        tz = MISSION_TARGETS[i].position[2];
        label = MISSION_TARGETS[i].label;
      } else {
        tx = 0;
        tz = 0;
        label = '';
      }
    } else {
      tx = FREE_LANDING.position[0];
      tz = FREE_LANDING.position[2];
      label = 'Landing Pad';
    }

    _target.set(tx - dronePose.position.x, 0, tz - dronePose.position.z);
    const dist = _target.length();
    droneState.targetDist = dist;
    droneState.targetLabel = label;
    if (dist < 0.5 || !label) {
      droneState.targetBearing = 0;
      return;
    }
    _target.normalize();
    _fwd.set(0, 0, -1).applyQuaternion(dronePose.quaternion);
    _fwd.y = 0;
    if (_fwd.lengthSq() > 0) _fwd.normalize();
    _right.crossVectors(_fwd, _up).normalize();
    const dot = _fwd.dot(_target);
    const cross = _right.dot(_target);
    droneState.targetBearing = THREE.MathUtils.radToDeg(Math.atan2(cross, dot));
  };

  const stepFlying = (s: Sim, input: ReturnType<typeof readDroneAxes>, dt: number, isLanding: boolean) => {
    const v = dronePose.velocity;

    // ---- Angle-mode attitude control (auto-level + stick tilt) ----
    _euler.setFromQuaternion(dronePose.quaternion);
    const targetPitch = isLanding ? 0 : -input.pitch * MAX_TILT;
    const targetRoll = isLanding ? 0 : input.roll * MAX_TILT;
    _euler.x += clampStep(_euler.x, targetPitch, TILT_RATE * dt);
    _euler.z += clampStep(_euler.z, targetRoll, TILT_RATE * dt);
    if (!isLanding) _euler.y += -input.yaw * YAW_SPEED * dt;
    dronePose.quaternion.setFromEuler(_euler);

    // ---- Vertical: thrust vs gravity ----
    v.y += (THRUST_MAX * s.throttle - G) * dt;

    // ---- Horizontal: g·tan(tilt) along the nose / right ----
    _fwd.set(0, 0, -1).applyQuaternion(dronePose.quaternion);
    _fwd.y = 0;
    if (_fwd.lengthSq() > 0) _fwd.normalize();
    _right.set(1, 0, 0).applyQuaternion(dronePose.quaternion);
    _right.y = 0;
    if (_right.lengthSq() > 0) _right.normalize();
    v.addScaledVector(_fwd, -G * Math.tan(_euler.x) * dt);
    v.addScaledVector(_right, G * Math.tan(_euler.z) * dt);

    // ---- Drag + speed cap ----
    v.multiplyScalar(Math.max(0, 1 - DRAG * dt));
    if (v.length() > MAX_SPEED) v.setLength(MAX_SPEED);

    dronePose.position.addScaledVector(v, dt);

    // Field bounds.
    const h = ARENA_HALF - 1.2;
    dronePose.position.x = Math.max(-h, Math.min(h, dronePose.position.x));
    dronePose.position.z = Math.max(-h, Math.min(h, dronePose.position.z));

    // Rock obstacles.
    for (const p of DRONE_PYLONS) {
      scratch.set(p[0], 0, p[2]);
      if (dronePose.position.distanceTo(scratch) < 0.65 + DRONE_R) {
        crash();
        return;
      }
    }

    // Ground contact — no auto-land: it just rests until the pilot raises
    // throttle again (or finishes a commanded landing).
    if (dronePose.position.y <= GROUND_Y) {
      dronePose.position.y = GROUND_Y;
      if (v.y < -CRASH_GROUND_VY || v.length() > MAX_SPEED * 0.92) {
        crash();
        return;
      }
      v.y = 0;
      v.x *= 0.82;
      v.z *= 0.82;
      if (isLanding) {
        finishLanding();
      }
    }
  };

  const nextGateIndex = sim.current.gatesHit < sim.current.gates.length ? sim.current.gatesHit : -1;

  // Which target does the 3D guidance arrow float above?
  let arrowTarget: THREE.Vector3 | null = null;
  if (sim.current.mode === 'race' && nextGateIndex >= 0) {
    arrowTarget = sim.current.gates[nextGateIndex].pos;
  } else if (sim.current.mode === 'mission') {
    const i = sim.current.objectives.findIndex((o) => !o.done);
    if (i >= 0) arrowTarget = new THREE.Vector3(...MISSION_TARGETS[i].position);
  } else if (sim.current.mode === 'free') {
    arrowTarget = new THREE.Vector3(...FREE_LANDING.position);
  }

  return (
    <group>
      {/* Desert sky + heat haze fog */}
      <color attach="background" args={['#b7c9de']} />
      <fog attach="fog" args={['#e2cfae', 60, 240]} />
      <Sky distance={450000} sunPosition={[120, 60, -80]} turbidity={7} rayleigh={1.1} mieCoefficient={0.005} mieDirectionalG={0.8} />

      {/* Lighting — warm desert sun */}
      <ambientLight intensity={0.4} />
      <hemisphereLight args={['#dce8ff', '#8a6a3a', 0.5]} />
      <directionalLight position={[90, 70, 40]} intensity={2.2} color="#ffe0b3" castShadow />

      {/* Sand terrain */}
      <Terrain />

      {/* Decorative scenery beyond the field */}
      {SCENERY.rocks.map((r, i) => (
        <Rock key={`r${i}`} position={r.p} scale={r.s} seed={r.seed} />
      ))}
      {SCENERY.cacti.map((c, i) => (
        <Cactus key={`c${i}`} position={c.p} scale={c.s} />
      ))}

      {/* Low sandstone field boundary */}
      {[
        [-ARENA_HALF, 0, 0, 0.5, 1.1, 44],
        [ARENA_HALF, 0, 0, 0.5, 1.1, 44],
        [0, 0, -ARENA_HALF, 44, 1.1, 0.5],
        [0, 0, ARENA_HALF, 44, 1.1, 0.5],
      ].map(([x, y, z, w, h, d], i) => (
        <mesh key={i} position={[x as number, (y as number) + h / 2, z as number]}>
          <boxGeometry args={[w as number, h as number, d as number]} />
          <meshStandardMaterial color="#b7a06e" roughness={0.95} />
        </mesh>
      ))}

      {/* Start pad */}
      <HeliPad position={[0, 0, 0]} label="START" textColor="#86efac" />

      {/* Rock obstacles to dodge */}
      {DRONE_PYLONS.map((p, i) => (
        <Rock key={`p${i}`} position={[p[0], 0.35, p[2]]} scale={1.5 + (i % 3) * 0.4} seed={i * 13 + 5} />
      ))}

      {/* Race gates */}
      {sim.current.gates.map((gate, i) => (
        <RaceGate key={i} gate={gate} index={i} isNext={i === nextGateIndex} />
      ))}

      {/* Mission + free landing pads */}
      {(sim.current.mode === 'mission' ? MISSION_TARGETS : sim.current.mode === 'free' ? [FREE_LANDING] : []).map(
        (t, i) => {
          const done = sim.current.objectives[i]?.done;
          return (
            <group key={i} position={[t.position[0], 0, t.position[2]]}>
              <HeliPad position={[0, 0, 0]} label={done ? `${t.label} ✓` : t.label} textColor={done ? '#86efac' : '#fcd34d'} />
            </group>
          );
        }
      )}

      {/* Guidance arrow above the next objective */}
      {arrowTarget && <NavArrow position={arrowTarget} />}

      {/* The drone */}
      <Drone resetId={resetId.current} />
    </group>
  );
}
