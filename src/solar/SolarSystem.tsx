import { useRef, useEffect, useState } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { Sphere, Text, Line } from '@react-three/drei';
import * as THREE from 'three';
import { SOLAR_BODIES, SolarBody, CAMERA_ORIGIN, SYSTEM_SCALE } from './solarData';
import { solarState, solarCmd, resetPlanets } from './solarState';
import { remoteControl } from '../gamepad/gamepadInput';

const FONT =
  'https://fonts.gstatic.com/s/inter/v12/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuLyeMZhrib2Bg-4.ttf';

const planetMeshes = new Map<string, THREE.Mesh>();
const planetGroups = new Map<string, THREE.Group>();

// ---- interaction scratch state (no React) ----
const pointer = new THREE.Vector2(0, 0);
const ray = new THREE.Raycaster();
const grabDist = { v: 0 };
const grabOffset = new THREE.Vector3();
const mouse = { down: false, x: 0, y: 0, moved: 0 };
const rot = new THREE.Euler(0, 0, 0, 'YXZ');

function clampSphere(pos: THREE.Vector3, min: number, max: number) {
  const r = pos.length();
  if (r > max) pos.multiplyScalar(max / r);
  else if (r < min) pos.multiplyScalar(min / r);
  pos.y = THREE.MathUtils.clamp(pos.y, -5, 5);
}

function hitTest(ndc: THREE.Vector2, camera: THREE.Camera): string | null {
  ray.setFromCamera(ndc, camera);
  const targets: THREE.Mesh[] = [];
  planetMeshes.forEach((m) => targets.push(m));
  const hits = ray.intersectObjects(targets, false);
  if (hits.length === 0) return null;
  // Find which planet owns this mesh.
  for (const h of hits) {
    for (const [id, m] of planetMeshes) {
      if (m === h.object) return id;
    }
  }
  return null;
}

// ---- Sun ----
function SunModel() {
  const glow = useRef<THREE.Mesh>(null);
  useFrame(({ clock }) => {
    if (glow.current) glow.current.scale.setScalar(0.8 + Math.sin(clock.getElapsedTime() * 1.5) * 0.1);
  });
  return (
    <group>
      <Sphere args={[1.15, 48, 48]}>
        <meshStandardMaterial color="#ffb703" emissive="#ff8c00" emissiveIntensity={2} roughness={0.4} />
      </Sphere>
      <mesh ref={glow}>
        <sphereGeometry args={[1.7, 32, 32]} />
        <meshBasicMaterial color="#ffb703" transparent opacity={0.18} blending={THREE.AdditiveBlending} depthWrite={false} />
      </mesh>
      <pointLight color="#fff1c2" intensity={300} distance={0} decay={1.6} />
    </group>
  );
}

function OrbitRing({ body }: { body: SolarBody }) {
  if (body.id === 'sun' || body.id === 'moon') return null;
  const pts = Array.from({ length: 72 }, (_, i) => {
    const a = (i / 72) * Math.PI * 2;
    return new THREE.Vector3(Math.cos(a) * body.orbit, 0, Math.sin(a) * body.orbit);
  });
  return <Line points={pts} color="#41507a" transparent opacity={0.55} lineWidth={1} />;
}

// ---- individual planet ----
function PlanetModel({ body }: { body: SolarBody }) {
  const group = useRef<THREE.Group>(null);
  const mesh = useRef<THREE.Mesh>(null);
  const [hov, setHov] = useState(false);
  const [sel, setSel] = useState(false);
  const [hoverTick, setHoverTick] = useState(0);

  useEffect(() => {
    if (group.current) planetGroups.set(body.id, group.current);
    if (mesh.current) planetMeshes.set(body.id, mesh.current);
    return () => {
      planetGroups.delete(body.id);
      planetMeshes.delete(body.id);
    };
  }, [body.id]);

  // Poll flags cheaply (2.5Hz) so the halo follows hover/select.
  useEffect(() => {
    const id = setInterval(() => {
      setHov(solarState.hoveredId === body.id);
      setSel(solarState.selectedId === body.id);
      setHoverTick((t) => t + 1);
    }, 300);
    return () => clearInterval(id);
  }, [body.id]);
  void hoverTick;

  const r = body.radius;
  return (
    <group ref={group}>
      <group>
        <Sphere args={[r, 40, 40]}>
          <meshStandardMaterial
            color={body.color}
            emissive={body.color}
            emissiveIntensity={sel ? 0.5 : hov ? 0.25 : 0.06}
            roughness={0.55}
          />
        </Sphere>
        {body.ring && (
          <mesh rotation={[-Math.PI / 2, 0, 0]}>
            <ringGeometry args={[r * 1.4, r * 2.1, 64]} />
            <meshBasicMaterial color="#d8c79a" transparent opacity={0.55} side={THREE.DoubleSide} />
          </mesh>
        )}
        {/* selection halo */}
        {(sel || hov) && (
          <mesh rotation={[-Math.PI / 2, 0, 0]}>
            <ringGeometry args={[r * 1.45, r * 1.62, 48]} />
            <meshBasicMaterial color={sel ? '#7dd3fc' : '#ffffff'} transparent opacity={0.9} side={THREE.DoubleSide} />
          </mesh>
        )}
      </group>
      {/* label */}
      <group position={[0, r + (body.id === 'sun' ? 0.5 : 0.32), 0]}>
        <Text
          fontSize={body.id === 'sun' ? 0.3 : 0.16}
          color="#ffffff"
          anchorX="center"
          font={FONT}
          outlineWidth={0.02}
          outlineColor="#000000"
        >
          {body.name.toUpperCase()}
        </Text>
      </group>
    </group>
  );
}

// ---- moon orbits earth ----
function MoonModel() {
  const group = useRef<THREE.Group>(null);
  useEffect(() => {
    if (group.current) planetGroups.set('moon', group.current);
    return () => {
      planetGroups.delete('moon');
    };
  }, []);
  const body = SOLAR_BODIES.find((b) => b.id === 'moon')!;
  return (
    <group ref={group}>
      <Sphere args={[body.radius, 24, 24]}>
        <meshStandardMaterial color={body.color} roughness={0.9} />
      </Sphere>
    </group>
  );
}

// ---- main scene ----
export function SolarSystem({ onSelect }: { onSelect?: (id: string | null) => void }) {
  const { camera, gl } = useThree();
  const system = useRef<THREE.Group>(null);
  const rotRef = useRef<THREE.Euler>(new THREE.Euler(0, 0, 0, 'YXZ'));
  const prevHandPinch = useRef(false);
  const onSelectRef = useRef(onSelect);
  onSelectRef.current = onSelect;

  // Init camera once.
  useEffect(() => {
    camera.position.set(CAMERA_ORIGIN[0], CAMERA_ORIGIN[1], CAMERA_ORIGIN[2]);
    camera.lookAt(0, 0, 0);
    camera.updateProjectionMatrix();
  }, [camera]);

  // Initialize per-planet state once.
  useEffect(() => {
    if (Object.keys(solarState.planets).length === 0) {
      for (const body of SOLAR_BODIES) {
        solarState.planets[body.id] = {
          position: new THREE.Vector3(),
          scale: 1,
          spin: 0,
          orbitAngle: Math.random() * Math.PI * 2,
          hovered: false,
          selected: false,
          grabbed: false,
        };
      }
    }
  }, []);

  // Background: transparent when camera passthrough is on, else deep space.
  const spaceBG = solarState.mode === 'space';

  // Mouse drag to rotate the whole model (out-of-headset).
  useEffect(() => {
    const el = gl.domElement;
    const down = (e: PointerEvent) => {
      mouse.down = true;
      mouse.x = e.clientX;
      mouse.y = e.clientY;
      mouse.moved = 0;
    };
    const move = (e: PointerEvent) => {
      if (!mouse.down) return;
      const dx = e.clientX - mouse.x;
      const dy = e.clientY - mouse.y;
      mouse.x = e.clientX;
      mouse.y = e.clientY;
      mouse.moved += Math.abs(dx) + Math.abs(dy);
      rotRef.current.y -= dx * 0.005;
      rotRef.current.x -= dy * 0.0025;
      rotRef.current.x = THREE.MathUtils.clamp(rotRef.current.x, -0.6, 0.6);
    };
    const up = (e: PointerEvent) => {
      mouse.down = false;
      if (mouse.moved < 6) {
        // click -> select
        const ndc = new THREE.Vector2((e.clientX / window.innerWidth) * 2 - 1, -(e.clientY / window.innerHeight) * 2 + 1);
        const id = hitTest(ndc, camera);
        solarState.selectedId = id;
        onSelectRef.current?.(id);
      }
    };
    const wheel = (e: WheelEvent) => {
      e.preventDefault();
      solarState.scale = THREE.MathUtils.clamp(solarState.scale * (e.deltaY > 0 ? 0.92 : 1.08), SYSTEM_SCALE.min, SYSTEM_SCALE.max);
    };
    el.addEventListener('pointerdown', down);
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
    el.addEventListener('wheel', wheel, { passive: false });
    return () => {
      el.removeEventListener('pointerdown', down);
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      el.removeEventListener('wheel', wheel);
    };
  }, [gl, camera]);

  // ---- main physics / interaction loop ----
  useFrame((state, delta) => {
    const dt = Math.min(delta, 0.05);

    // apply one-shot commands
    if (solarCmd.reset > 0) {
      solarCmd.reset = 0;
      resetPlanets();
      onSelectRef.current?.(null);
    }
    if (solarCmd.select > 0) {
      solarCmd.select = 0;
      // select the planet currently under the centre reticle
      const id = hitTest(pointer, camera);
      solarState.selectedId = id;
      onSelectRef.current?.(id);
    }

    // Phone remote (pairing chip) drives model rotation via look deltas.
    if (remoteControl.lookDx !== 0 || remoteControl.lookDy !== 0) {
      rotRef.current.y -= remoteControl.lookDx * 0.004;
      rotRef.current.x -= remoteControl.lookDy * 0.003;
      rotRef.current.x = THREE.MathUtils.clamp(rotRef.current.x, -0.6, 0.6);
      remoteControl.lookDx = 0;
      remoteControl.lookDy = 0;
    }

    // advance orbits
    const scale = solarState.scale;
    for (const body of SOLAR_BODIES) {
      const h = solarState.planets[body.id];
      if (!h) continue;
      if (body.id !== 'sun' && body.id !== 'moon' && !h.grabbed) {
        h.orbitAngle += body.orbitSpeed * dt;
      }
    }

    // Compute world positions.
    const sunPos = new THREE.Vector3(0, 0, 0);
    let earthPos = new THREE.Vector3();
    const targetPos = new THREE.Vector3();
    for (const body of SOLAR_BODIES) {
      const h = solarState.planets[body.id];
      const g = planetGroups.get(body.id);
      if (!h || !g) continue;

      if (body.id === 'sun') {
        targetPos.set(0, 0, 0);
      } else if (body.id === 'moon') {
        // moon orbits earth
        targetPos.set(
          Math.cos(h.orbitAngle) * body.orbit,
          0,
          Math.sin(h.orbitAngle) * body.orbit
        );
        targetPos.add(earthPos);
      } else {
        targetPos.set(
          Math.cos(h.orbitAngle) * body.orbit,
          0,
          Math.sin(h.orbitAngle) * body.orbit
        );
        if (body.id === 'earth') earthPos.copy(targetPos);
      }
      targetPos.multiplyScalar(scale);
      if (h.grabbed) {
        // grabbed planet follows stored dragged position
        targetPos.copy(g.userData.dragPos || targetPos);
      }
      h.position.copy(targetPos);
      g.position.copy(targetPos);
      g.scale.setScalar(h.scale);
      g.rotation.y += (body.spinSpeed || 0.1) * dt;
    }

    // ---- pointer: use hand if active, else gaze centre ----
    const usingHand = solarState.hand.active;
    if (usingHand) {
      pointer.set(solarState.hand.x, solarState.hand.y);
    } else {
      pointer.set(0, 0); // centre reticle
    }

    // hover detection (gaze or hand, non-grabbing)
    if (!usingHand) {
      const id = hitTest(pointer, camera);
      solarState.gazeId = id;
      if (!solarState.grabbedId) solarState.hoveredId = id;
    }

    // ---- hand pinch grab/move ----
    const hand = solarState.hand;
    const pinchNow = hand.active && hand.pinch;
    const pinchEdge = pinchNow && !prevHandPinch.current;
    prevHandPinch.current = pinchNow;

    if (pinchEdge && !solarState.grabbedId) {
      const id = hitTest(pointer, camera);
      if (id && id !== 'sun') {
        const g = planetGroups.get(id);
        if (g) {
          solarState.grabbedId = id;
          const h = solarState.planets[id];
          if (h) h.grabbed = true;
          // store drag offset from pointer plane
          ray.setFromCamera(pointer, camera);
          const dist = ray.ray.origin.distanceTo(g.position);
          grabDist.v = dist;
          g.userData.dragPos = g.position.clone();
        }
      }
    }

    if (solarState.grabbedId) {
      const id = solarState.grabbedId;
      const g = planetGroups.get(id);
      if (g && pinchNow) {
        ray.setFromCamera(pointer, camera);
        const pos = ray.ray.origin.clone().add(ray.ray.direction.clone().multiplyScalar(grabDist.v));
        clampSphere(pos, 1.5, 13);
        g.userData.dragPos = pos;
        g.position.copy(pos);
      } else if (!pinchNow) {
        solarState.grabbedId = null;
        const h = solarState.planets[id];
        if (h) h.grabbed = false;
      }
    }

    // rotate system group from mouse drag
    if (system.current) {
      system.current.rotation.y = rotRef.current.y;
      system.current.rotation.x = rotRef.current.x;
    }
  });

  return (
    <>
      {spaceBG && <color attach="background" args={['#05070f']} />}
      {spaceBG && <Stars />}
      <ambientLight intensity={0.35} />
      <group ref={system}>
        <SunModel />
        {SOLAR_BODIES.filter((b) => b.id !== 'sun' && b.id !== 'moon').map((b) => (
          <OrbitRing key={b.id} body={b} />
        ))}
        {SOLAR_BODIES.filter((b) => b.id !== 'moon').map((b) => (
          <PlanetModel key={b.id} body={b} />
        ))}
        <MoonModel />
      </group>
    </>
  );
}

// ---- starfield (space mode) ----
function Stars() {
  const points = useRef<THREE.Points>(null);
  const geo = useRef<THREE.BufferGeometry>(null);
  useEffect(() => {
    if (!geo.current) return;
    const count = 700;
    const pos = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const rr = 60 + Math.random() * 40;
      pos[i * 3] = rr * Math.sin(phi) * Math.cos(theta);
      pos[i * 3 + 1] = rr * Math.cos(phi) * 0.6;
      pos[i * 3 + 2] = rr * Math.sin(phi) * Math.sin(theta);
    }
    geo.current.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  }, []);
  return (
    <points ref={points}>
      <bufferGeometry ref={geo} />
      <pointsMaterial color="#ffffff" size={0.35} sizeAttenuation transparent opacity={0.9} />
    </points>
  );
}
