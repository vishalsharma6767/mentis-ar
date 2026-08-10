import { useMemo } from 'react';
import { Text } from '@react-three/drei';
import * as THREE from 'three';

const STEEL = new THREE.Color('#b7bcc2');
const STEEL_D = new THREE.Color('#848b92');
const ROOF = new THREE.Color('#5c636b');
const INTERIOR = new THREE.Color('#3a4046');
const STRIPE = new THREE.Color('#f59e0b');
const SIGN = new THREE.Color('#232a30');

// Curved-shell hangar: a half-cylinder body with an open front bay and a
// flat roof lip. Drawn with cylinders so it needs zero textures.
export function Hangar({
  position = [0, 0, 0] as [number, number, number],
  rotation = 0,
  label = 'HANGAR 01',
}) {
  const W = 16;
  const D = 13;
  const H = 7.5;

  const ribs = useMemo(() => {
    const list: number[] = [];
    for (let i = -5; i <= 5; i++) list.push(i);
    return list;
  }, []);

  return (
    <group position={position} rotation={[0, rotation, 0]}>
      {/* half-cylinder shell */}
      <group position={[0, 0, 0]}>
        {ribs.map((i) => {
          const z = (i / 5.5) * D;
          return (
            <mesh key={i} position={[0, H, z]} rotation-x={Math.PI / 2} castShadow>
              <cylinderGeometry args={[W / 2, W / 2, 0.55, 24, 1, true, 0, Math.PI]} />
              <meshStandardMaterial color={ROOF} roughness={0.6} metalness={0.35} side={THREE.DoubleSide} />
            </mesh>
          );
        })}
      </group>

      {/* closed back wall */}
      <mesh position={[0, H, -D / 2 - 0.15]} castShadow>
        <planeGeometry args={[W, H]} />
        <meshStandardMaterial color={STEEL_D} roughness={0.8} />
      </mesh>

      {/* side walls */}
      {[W / 2, -W / 2].map((x, i) => (
        <group key={i} position={[x, H, 0]} rotation={[0, i === 0 ? -Math.PI / 2 : Math.PI / 2, 0]}>
          <mesh castShadow>
            <planeGeometry args={[D, H]} />
            <meshStandardMaterial color={STEEL} roughness={0.75} />
          </mesh>
          {/* reinforcement strips */}
          <mesh position={[0, -H / 2 + 1.1, 0.02]}>
            <planeGeometry args={[D, 0.5]} />
            <meshStandardMaterial color={STEEL_D} roughness={0.7} />
          </mesh>
        </group>
      ))}

      {/* front lip + corner posts */}
      <mesh position={[0, H - 0.2, D / 2]} castShadow>
        <boxGeometry args={[W + 1, 0.4, 0.5]} />
        <meshStandardMaterial color={STEEL} roughness={0.6} metalness={0.3} />
      </mesh>
      {[-W / 2, W / 2].map((x, i) => (
        <mesh key={i} position={[x, H - 1.2, D / 2]} castShadow>
          <boxGeometry args={[0.5, H - 2.2, 0.5]} />
          <meshStandardMaterial color={STEEL_D} roughness={0.7} />
        </mesh>
      ))}

      {/* door rails on the open bay */}
      <mesh position={[0, 0.6, D / 2 + 0.05]}>
        <boxGeometry args={[W + 1.6, 0.15, 0.5]} />
        <meshStandardMaterial color={INTERIOR} roughness={0.8} />
      </mesh>

      {/* floor hardstand */}
      <mesh position={[0, 0.06, 0]} rotation-x={-Math.PI / 2} receiveShadow>
        <planeGeometry args={[W + 2, D + 4]} />
        <meshStandardMaterial color="#9a8f7b" roughness={1} />
      </mesh>

      {/* hazard stripes on the lip */}
      {[-3, 0, 3].map((x, i) => (
        <mesh key={i} position={[x, 0.35, D / 2 + 0.32]} rotation-z={i % 2 === 0 ? 0 : -Math.PI / 4}>
          <boxGeometry args={[0.5, 0.06, 0.4]} />
          <meshStandardMaterial color={STRIPE} roughness={0.6} />
        </mesh>
      ))}

      {/* sign over the door */}
      <group position={[0, H - 1.6, D / 2 + 0.1]}>
        <mesh>
          <boxGeometry args={[5, 1, 0.2]} />
          <meshStandardMaterial color={SIGN} roughness={0.5} />
        </mesh>
        <Text fontSize={0.5} color="#fbbf24" anchorX="center" anchorY="middle" position={[0, 0, 0.12]}>
          {label}
        </Text>
      </group>
    </group>
  );
}

export function Workshop({
  position = [0, 0, 0] as [number, number, number],
  rotation = 0,
}) {
  const W = 10;
  const D = 8;
  const H = 4.6;
  return (
    <group position={position} rotation={[0, rotation, 0]}>
      {/* main shed */}
      <mesh position={[0, H / 2, 0]} castShadow>
        <boxGeometry args={[W, H, D]} />
        <meshStandardMaterial color={STEEL} roughness={0.85} />
      </mesh>
      {/* gable roof */}
      <mesh position={[0, H + 0.3, 0]} rotation-x={Math.PI / 2} castShadow>
        <coneGeometry args={[Math.max(W, D) * 0.8, 2.2, 4]} />
        <meshStandardMaterial color={ROOF} roughness={0.7} metalness={0.2} />
      </mesh>
      {/* roll-up door */}
      <mesh position={[0, 1.6, D / 2 + 0.05]} castShadow>
        <planeGeometry args={[5, 3.2]} />
        <meshStandardMaterial color={STEEL_D} roughness={0.6} metalness={0.4} />
      </mesh>
      {/* roof vent */}
      <mesh position={[2, H + 1.4, -1]} rotation-z={0.4} castShadow>
        <boxGeometry args={[2.2, 0.35, 1.4]} />
        <meshStandardMaterial color={INTERIOR} roughness={0.8} />
      </mesh>
      {/* sign */}
      <group position={[0, 3.4, D / 2 + 0.3]}>
        <mesh>
          <boxGeometry args={[4.2, 0.85, 0.2]} />
          <meshStandardMaterial color={SIGN} roughness={0.5} />
        </mesh>
        <Text fontSize={0.42} color="#93c5fd" anchorX="center" anchorY="middle" position={[0, 0, 0.12]}>
          WORKSHOP
        </Text>
      </group>
      {/* small benches + tool cart silhouette outside */}
      <mesh position={[3.2, 0.4, -3]} castShadow>
        <boxGeometry args={[1.6, 0.8, 0.8]} />
        <meshStandardMaterial color="#8a7a52" roughness={1} />
      </mesh>
    </group>
  );
}
