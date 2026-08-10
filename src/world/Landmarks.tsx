import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

const STEEL = new THREE.Color('#b7bcc2');
const STEEL_D = new THREE.Color('#7d848c');
const TANK = new THREE.Color('#c8cfd6');
const WOOD = new THREE.Color('#a0703f');

export function WaterTower({ position = [0, 0, 0] as [number, number, number] }) {
  const H = 9;
  const legs: [number, number, number][] = [
    [-1.6, 0, -1.6],
    [1.6, 0, -1.6],
    [-1.6, 0, 1.6],
    [1.6, 0, 1.6],
  ];
  return (
    <group position={position}>
      {legs.map((p, i) => (
        <mesh key={i} position={p} castShadow>
          <boxGeometry args={[0.18, H, 0.18]} />
          <meshStandardMaterial color={STEEL_D} roughness={0.7} metalness={0.3} />
        </mesh>
      ))}
      {/* tank */}
      <mesh position={[0, H + 1.6, 0]} castShadow>
        <cylinderGeometry args={[2.6, 2.6, 3.2, 16]} />
        <meshStandardMaterial color={TANK} roughness={0.5} metalness={0.3} />
      </mesh>
      <mesh position={[0, H + 3.3, 0]}>
        <cylinderGeometry args={[2.7, 2.7, 0.15, 16]} />
        <meshStandardMaterial color={STEEL} roughness={0.6} />
      </mesh>
      {/* ladder */}
      <mesh position={[2.1, H / 2, 2.1]} rotation={[0, Math.PI / 4, 0]}>
        <boxGeometry args={[0.1, H, 0.4]} />
        <meshStandardMaterial color={STEEL_D} roughness={0.7} />
      </mesh>
    </group>
  );
}

function WindmillBlades({ position = [0, 0, 0] as [number, number, number] }) {
  const ref = useRef<THREE.Group>(null);
  useFrame((_, delta) => {
    if (ref.current) ref.current.rotation.z += delta * 1.4;
  });
  return (
    <group position={position}>
      {[0, 1, 2, 3].map((i) => {
        const a = (i / 4) * Math.PI * 2;
        return (
          <mesh key={i} position={[Math.cos(a) * 1.1, Math.sin(a) * 1.1, 0]} rotation-z={a}>
            <boxGeometry args={[0.22, 1.3, 0.06]} />
            <meshStandardMaterial color="#e8e3d8" roughness={0.8} />
          </mesh>
        );
      })}
    </group>
  );
}

export function Windmill({ position = [0, 0, 0] as [number, number, number] }) {
  const groupRef = useRef<THREE.Group>(null);
  return (
    <group position={position}>
      <mesh position={[0, 3.2, 0]} castShadow>
        <cylinderGeometry args={[0.28, 0.45, 6.4, 8]} />
        <meshStandardMaterial color="#d6c9ae" roughness={0.9} />
      </mesh>
      <mesh position={[0, 6.3, 0]}>
        <cylinderGeometry args={[0.55, 0.4, 0.6, 8]} />
        <meshStandardMaterial color="#c8bfa6" roughness={0.9} />
      </mesh>
      <group ref={groupRef} position={[0, 6.4, 0]} rotation-z={0.3}>
        <mesh position={[0, 0, 0.1]}>
          <cylinderGeometry args={[0.35, 0.35, 0.16, 8]} />
          <meshStandardMaterial color="#7d848c" roughness={0.6} />
        </mesh>
        <WindmillBlades position={[0, 0, 0.22]} />
      </group>
    </group>
  );
}

export function FlagPole({ position = [0, 0, 0] as [number, number, number], color = '#f97316' }) {
  return (
    <group position={position}>
      <mesh position={[0, 4.4, 0]} castShadow>
        <cylinderGeometry args={[0.05, 0.07, 8.8, 8]} />
        <meshStandardMaterial color="#8a9299" metalness={0.5} roughness={0.4} />
      </mesh>
      <mesh position={[0, 8.4, 0]}>
        <boxGeometry args={[1.6, 0.72, 0.05]} />
        <meshStandardMaterial color={color} roughness={0.6} />
      </mesh>
    </group>
  );
}

export function Bench({ position = [0, 0, 0] as [number, number, number], rotation = 0 }) {
  return (
    <group position={position} rotation={[0, rotation, 0]}>
      {[-0.7, 0.7].map((x, i) => (
        <mesh key={i} position={[x, 0.45, 0]} castShadow>
          <boxGeometry args={[0.12, 0.9, 0.12]} />
          <meshStandardMaterial color={STEEL_D} roughness={0.7} />
        </mesh>
      ))}
      <mesh position={[0, 0.5, 0]} castShadow>
        <boxGeometry args={[1.6, 0.07, 0.5]} />
        <meshStandardMaterial color={WOOD} roughness={0.9} />
      </mesh>
      <mesh position={[0, 0.85, 0]} castShadow>
        <boxGeometry args={[1.6, 0.05, 0.16]} />
        <meshStandardMaterial color={WOOD} roughness={0.9} />
      </mesh>
    </group>
  );
}

// Simple perimeter fence posts + rails around an area.
export function PerimeterFence({
  from,
  to,
  segments = 8,
}: {
  from: [number, number];
  to: [number, number];
  segments?: number;
}) {
  const items = useMemo(() => {
    const list: { p: [number, number, number]; r: number }[] = [];
    for (let i = 0; i <= segments; i++) {
      const t = i / segments;
      const x = from[0] + (to[0] - from[0]) * t;
      const z = from[1] + (to[1] - from[1]) * t;
      list.push({ p: [x, 0.7, z], r: 0 });
    }
    return list;
  }, [from, to, segments]);
  const len = Math.hypot(to[0] - from[0], to[1] - from[1]);
  const ang = Math.atan2(to[1] - from[1], to[0] - from[0]);
  return (
    <group>
      {items.map((it, i) => (
        <mesh key={i} position={it.p} castShadow>
          <cylinderGeometry args={[0.06, 0.08, 1.4, 8]} />
          <meshStandardMaterial color="#6f6a5c" roughness={0.85} />
        </mesh>
      ))}
      <group position={[(from[0] + to[0]) / 2, 1.05, (from[1] + to[1]) / 2]} rotation={[0, -ang, 0]}>
        <mesh position={[0, 0.2, 0]}>
          <boxGeometry args={[len, 0.06, 0.05]} />
          <meshStandardMaterial color="#6f6a5c" roughness={0.85} />
        </mesh>
        <mesh position={[0, -0.2, 0]}>
          <boxGeometry args={[len, 0.06, 0.05]} />
          <meshStandardMaterial color="#6f6a5c" roughness={0.85} />
        </mesh>
      </group>
    </group>
  );
}
