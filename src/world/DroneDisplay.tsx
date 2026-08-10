import { useMemo } from 'react';
import { Text } from '@react-three/drei';
import * as THREE from 'three';

const BASE = new THREE.Color('#9a8f7b');
const BASE_D = new THREE.Color('#6f6a5c');
const PANEL = new THREE.Color('#274a63');
const PANEL_LINE = new THREE.Color('#3d6d8f');
const FRAME = new THREE.Color('#3b444c');
const GLASS = new THREE.Color('#8ec3d8');

// Public display pedestals — each carries a "drone" made of simple shapes and
// a plaque, like a museum wing for the academy's drones.
export function DroneDisplay({ position = [0, 0, 0] as [number, number, number], rotation = 0 }) {
  const pedestals = useMemo(() => {
    const list: { p: [number, number, number]; c: string; n: string }[] = [
      { p: [-4.5, 0, 0], c: '#38bdf8', n: 'SCOUT X1' },
      { p: [0, 0, 0], c: '#f97316', n: 'CARGO C2' },
      { p: [4.5, 0, 0], c: '#a3e635', n: 'RACER R9' },
    ];
    return list;
  }, []);

  return (
    <group position={position} rotation={[0, rotation, 0]}>
      <mesh position={[0, 0.03, 0]} rotation-x={-Math.PI / 2} receiveShadow>
        <planeGeometry args={[16, 8]} />
        <meshStandardMaterial color={BASE} roughness={1} />
      </mesh>
      {pedestals.map((pd, i) => (
        <group key={i} position={pd.p}>
          <mesh position={[0, 0.5, 0]} castShadow>
            <cylinderGeometry args={[0.5, 0.8, 1, 12]} />
            <meshStandardMaterial color={BASE_D} roughness={0.9} />
          </mesh>
          <mesh position={[0, 1.05, 0]}>
            <boxGeometry args={[1.7, 0.12, 1.7]} />
            <meshStandardMaterial color={FRAME} roughness={0.6} />
          </mesh>
          {/* display drone */}
          <group position={[0, 1.45, 0]}>
            <mesh scale={[1.1, 0.16, 1.1]}>
              <boxGeometry args={[1, 1, 1]} />
              <meshStandardMaterial color={pd.c} roughness={0.5} metalness={0.2} />
            </mesh>
            {[[-0.5, -0.5], [0.5, -0.5], [-0.5, 0.5], [0.5, 0.5]].map(([x, z], j) => (
              <group key={j} position={[x, -0.04, z]}>
                <mesh>
                  <cylinderGeometry args={[0.06, 0.06, 0.5, 6]} />
                  <meshStandardMaterial color="#3b444c" roughness={0.6} />
                </mesh>
                <mesh position={[0, 0.3, 0]}>
                  <cylinderGeometry args={[0.26, 0.26, 0.05, 12]} />
                  <meshStandardMaterial color="#334155" roughness={0.4} metalness={0.3} />
                </mesh>
              </group>
            ))}
          </group>
          {/* plaque */}
          <mesh position={[0, 0.06, 0.62]}>
            <boxGeometry args={[1.2, 0.34, 0.06]} />
            <meshStandardMaterial color="#e8e3d8" roughness={0.8} />
          </mesh>
          <Text position={[0, 0.08, 0.68]} fontSize={0.14} color="#232a30" anchorX="center" anchorY="middle">
            {pd.n}
          </Text>
        </group>
      ))}
      {/* canopy */}
      <mesh position={[0, 2.4, 0]} rotation-z={Math.PI} castShadow>
        <cylinderGeometry args={[4, 4, 0.3, 24, 1, true, 0, Math.PI]} />
        <meshStandardMaterial color={GLASS} roughness={0.15} metalness={0.3} side={THREE.DoubleSide} />
      </mesh>
      {[-5, -2.5, 2.5, 5].map((x, i) => (
        <mesh key={i} position={[x, 2.2, 0]} castShadow>
          <cylinderGeometry args={[0.08, 0.1, 2.2, 8]} />
          <meshStandardMaterial color={BASE_D} roughness={0.8} />
        </mesh>
      ))}
      {/* sign */}
      <group position={[0, 0.5, -5]}>
        <mesh>
          <boxGeometry args={[7, 0.9, 0.2]} />
          <meshStandardMaterial color="#232a30" roughness={0.5} />
        </mesh>
        <Text fontSize={0.45} color="#7dd3fc" anchorX="center" anchorY="middle" position={[0, 0, 0.12]}>
          DRONE DISPLAY
        </Text>
      </group>
    </group>
  );
}

export function SolarPanel({ position = [0, 0, 0] as [number, number, number], rotation = 0 }) {
  return (
    <group position={position} rotation={[0, rotation, 0]}>
      <group rotation-x={-0.35}>
        <mesh position={[0, 1.2, 0]} castShadow>
          <boxGeometry args={[3, 0.08, 1.6]} />
          <meshStandardMaterial color={PANEL} roughness={0.3} metalness={0.4} />
        </mesh>
        {[-0.8, 0, 0.8].map((x, i) => (
          <mesh key={i} position={[x, 1.23, 0]}>
            <boxGeometry args={[0.06, 0.06, 1.6]} />
            <meshStandardMaterial color={PANEL_LINE} roughness={0.3} />
          </mesh>
        ))}
      </group>
      {/* support legs */}
      <mesh position={[-0.7, 0.5, 0.2]} rotation-z={0.3} castShadow>
        <boxGeometry args={[0.08, 1, 0.08]} />
        <meshStandardMaterial color={FRAME} roughness={0.6} />
      </mesh>
      <mesh position={[0.7, 0.5, 0.2]} rotation-z={-0.3} castShadow>
        <boxGeometry args={[0.08, 1, 0.08]} />
        <meshStandardMaterial color={FRAME} roughness={0.6} />
      </mesh>
      <mesh position={[-0.7, 0.5, -0.2]} rotation-z={-0.3} castShadow>
        <boxGeometry args={[0.08, 1, 0.08]} />
        <meshStandardMaterial color={FRAME} roughness={0.6} />
      </mesh>
      <mesh position={[0.7, 0.5, -0.2]} rotation-z={0.3} castShadow>
        <boxGeometry args={[0.08, 1, 0.08]} />
        <meshStandardMaterial color={FRAME} roughness={0.6} />
      </mesh>
    </group>
  );
}

export function SolarFarm({ position = [0, 0, 0] as [number, number, number], rotation = 0 }) {
  const panels = useMemo(() => {
    const list: { p: [number, number]; r: number }[] = [];
    let s = 7;
    for (let r = 0; r < 3; r++) {
      for (let c = 0; c < 4; c++) {
        list.push({ p: [c * 4 - 6, r * 4 - 4], r: s * 0.05 });
        s++;
      }
    }
    return list;
  }, []);
  return (
    <group position={position} rotation={[0, rotation, 0]}>
      <mesh position={[0, 0.03, 0]} rotation-x={-Math.PI / 2} receiveShadow>
        <planeGeometry args={[20, 14]} />
        <meshStandardMaterial color="#a89a7d" roughness={1} />
      </mesh>
      {panels.map((p, i) => (
        <SolarPanel key={i} position={[p.p[0], 0, p.p[1]]} rotation={p.r} />
      ))}
      {/* perimeter fence posts */}
      {[
        [-10, -7],
        [10, -7],
        [-10, 7],
        [10, 7],
      ].map((p, i) => (
        <mesh key={i} position={[p[0], 1.4, p[1]]} castShadow>
          <cylinderGeometry args={[0.07, 0.09, 1.6, 8]} />
          <meshStandardMaterial color="#6f6a5c" roughness={0.8} />
        </mesh>
      ))}
    </group>
  );
}
