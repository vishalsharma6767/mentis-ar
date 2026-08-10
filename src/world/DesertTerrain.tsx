import { useMemo } from 'react';
import * as THREE from 'three';
import { campusHeight, fbm, hash2, valueNoise, tintedPlane, scatter } from './terrainUtil';

const SAND_BASE = new THREE.Color('#d6b583');
const SAND_DARK = new THREE.Color('#b2905d');
const SAND_EDGE = new THREE.Color('#c8a26a');

const ROCK_A = new THREE.Color('#a4937c');
const ROCK_B = new THREE.Color('#7c6c58');
const BUSH_A = new THREE.Color('#8a7a52');
const BUSH_B = new THREE.Color('#6d8a4f');
const CACTUS = new THREE.Color('#4f7d4a');
const DUNE = new THREE.Color('#e0c28d');
const ROAD = new THREE.Color('#a5845c');
const ROAD_EDGE = new THREE.Color('#8f6f4a');

// Distant mountain silhouette ring drawn at the horizon so the academy sits in
// an actual valley instead of floating on a flat disc.
function MountainRing() {
  const meshes = useMemo(() => {
    const list: { p: [number, number, number]; s: number; r: number; c: THREE.Color }[] = [];
    const n = 14;
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 + hash2(i, 1) * 0.3;
      const d = 260 + hash2(i, 2) * 70;
      const x = Math.cos(a) * d;
      const z = Math.sin(a) * d;
      const h = 36 + hash2(i, 3) * 34;
      const w = 60 + hash2(i, 4) * 50;
      const c = new THREE.Color().lerpColors(new THREE.Color('#b6a086'), new THREE.Color('#8d7a5f'), hash2(i, 5));
      list.push({ p: [x, -6, z], s: w, r: h, c });
    }
    return list;
  }, []);
  return (
    <group>
      {meshes.map((m, i) => (
        <mesh key={i} position={m.p} scale={[m.s, m.r, m.s]}>
          <coneGeometry args={[1, 1, 6]} />
          <meshStandardMaterial color={m.c} flatShading roughness={1} />
        </mesh>
      ))}
    </group>
  );
}

function InstancedRocks() {
  const items = useMemo(
    () =>
      scatter(90, {
        x: [60, 230],
        z: [60, 230],
        base: 0,
        seed: 101,
        ring: true,
      }),
    []
  );
  const geo = useMemo(() => new THREE.DodecahedronGeometry(0.8, 0), []);
  const mats = useMemo(
    () => [
      new THREE.MeshStandardMaterial({ color: ROCK_A, flatShading: true, roughness: 0.95 }),
      new THREE.MeshStandardMaterial({ color: ROCK_B, flatShading: true, roughness: 0.95 }),
    ],
    []
  );
  return (
    <group>
      {items.map((it, i) => {
        const y = campusHeight(it.position.x, it.position.z) + 0.2;
        const r = it.seed % 2;
        return (
          <mesh
            key={i}
            geometry={geo}
            material={mats[r]}
            position={[it.position.x, y, it.position.z]}
            rotation={[0, it.rot, 0]}
            scale={it.scale}
          />
        );
      })}
    </group>
  );
}

function InstancedBushes() {
  const items = useMemo(
    () =>
      scatter(70, {
        x: [50, 200],
        z: [50, 200],
        base: 0,
        seed: 202,
        ring: true,
        avoid: (x, z) => Math.hypot(x, z) < 40,
      }),
    []
  );
  return (
    <group>
      {items.map((it, i) => {
        const y = campusHeight(it.position.x, it.position.z) + 0.35;
        const c = it.seed % 2 === 0 ? BUSH_A : BUSH_B;
        return (
          <group key={i} position={[it.position.x, y, it.position.z]} scale={it.scale} rotation={[0, it.rot, 0]}>
            <mesh>
              <icosahedronGeometry args={[0.7, 1]} />
              <meshStandardMaterial color={c} flatShading roughness={1} />
            </mesh>
            <mesh position={[0.3, 0.3, 0.2]} scale={0.7}>
              <icosahedronGeometry args={[0.6, 1]} />
              <meshStandardMaterial color={c} flatShading roughness={1} />
            </mesh>
          </group>
        );
      })}
    </group>
  );
}

function InstancedCacti() {
  const items = useMemo(
    () =>
      scatter(26, {
        x: [48, 190],
        z: [48, 190],
        base: 0,
        seed: 303,
        ring: true,
        avoid: (x, z) => Math.hypot(x, z) < 36,
      }),
    []
  );
  return (
    <group>
      {items.map((it, i) => {
        const y = campusHeight(it.position.x, it.position.z);
        return (
          <group key={i} position={[it.position.x, y, it.position.z]} rotation={[0, it.rot, 0]} scale={it.scale}>
            <mesh position={[0, 1.1, 0]}>
              <cylinderGeometry args={[0.18, 0.24, 2.2, 8]} />
              <meshStandardMaterial color={CACTUS} flatShading roughness={0.9} />
            </mesh>
            <mesh position={[0.32, 1.8, 0]} rotation={[0, 0, -0.5]}>
              <cylinderGeometry args={[0.1, 0.12, 0.9, 6]} />
              <meshStandardMaterial color={CACTUS} flatShading roughness={0.9} />
            </mesh>
            <mesh position={[-0.34, 1.6, 0]} rotation={[0, 0, 0.55]}>
              <cylinderGeometry args={[0.1, 0.12, 0.8, 6]} />
              <meshStandardMaterial color={CACTUS} flatShading roughness={0.9} />
            </mesh>
          </group>
        );
      })}
    </group>
  );
}

// A straight dirt road strip from a to b with beaten edges.
export function Road({
  from,
  to,
  width = 3,
}: {
  from: [number, number];
  to: [number, number];
  width?: number;
}) {
  const [len, ang, y] = useMemo(() => {
    const dx = to[0] - from[0];
    const dz = to[1] - from[1];
    const l = Math.hypot(dx, dz);
    const a = Math.atan2(dz, dx);
    const midX = (from[0] + to[0]) / 2;
    const midZ = (from[1] + to[1]) / 2;
    return [l, a, campusHeight(midX, midZ) + 0.08];
  }, [from, to]);
  return (
    <group position={[(from[0] + to[0]) / 2, y, (from[1] + to[1]) / 2]} rotation={[0, -ang, 0]}>
      {/* hard packed center */}
      <mesh>
        <planeGeometry args={[len, width, 1, 1]} />
        <meshStandardMaterial color={ROAD} roughness={1} />
      </mesh>
      {/* lighter wheel tracks */}
      <mesh position={[0, 0.01, -width * 0.22]}>
        <planeGeometry args={[len, width * 0.14]} />
        <meshStandardMaterial color={ROAD_EDGE} roughness={1} />
      </mesh>
      <mesh position={[0, 0.01, width * 0.22]}>
        <planeGeometry args={[len, width * 0.14]} />
        <meshStandardMaterial color={ROAD_EDGE} roughness={1} />
      </mesh>
    </group>
  );
}

export function DesertTerrain() {
  const groundGeo = useMemo(() => {
    const g = tintedPlane(480, 480, (x, z) => {
      const h = campusHeight(x, z);
      const d = Math.hypot(x, z);
      const c = new THREE.Color();
      if (d < 48) {
        c.copy(SAND_BASE);
        c.lerp(SAND_DARK, Math.max(0, h * 0.15 + valueNoise(x * 0.5, z * 0.5) * 0.12));
      } else {
        c.copy(SAND_EDGE);
        c.lerp(DUNE, Math.min(1, (d - 48) / 120) * 0.7 + h * 0.05);
        c.lerp(SAND_DARK, fbm(x * 0.02, z * 0.02) * 0.35);
      }
      return c;
    }, 120);
    // Lift a few local bump features into the vertex positions so the ground
    // visibly rolls near the edges.
    const pos = g.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const z = pos.getZ(i);
      pos.setY(i, campusHeight(x, z));
    }
    g.computeVertexNormals();
    return g;
  }, []);

  return (
    <group>
      <mesh geometry={groundGeo} receiveShadow>
        <meshStandardMaterial vertexColors roughness={1} metalness={0} />
      </mesh>
      <MountainRing />
      <InstancedRocks />
      <InstancedBushes />
      <InstancedCacti />
    </group>
  );
}
