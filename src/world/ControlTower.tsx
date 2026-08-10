import { useMemo } from 'react';
import * as THREE from 'three';

const CONCRETE = new THREE.Color('#d8d2c2');
const GLASS = new THREE.Color('#8ec3d8');
const FRAME = new THREE.Color('#c23a2a');
const ROOF = new THREE.Color('#3a4046');

export function ControlTower({ position = [0, 0, 0] as [number, number, number], rotation = 0 }) {
  const cabH = 12;
  const panels = useMemo(() => {
    const list: { p: [number, number, number]; r: [number, number, number] }[] = [];
    const n = 8;
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2;
      list.push({
        p: [Math.cos(a) * 3.3, cabH, Math.sin(a) * 3.3],
        r: [0, a + Math.PI / 2, 0],
      });
    }
    return list;
  }, [cabH]);

  return (
    <group position={position} rotation={[0, rotation, 0]}>
      {/* tapered shaft */}
      <mesh position={[0, 5, 0]} castShadow>
        <cylinderGeometry args={[1.6, 2.4, 10, 8]} />
        <meshStandardMaterial color={CONCRETE} roughness={0.9} />
      </mesh>

      {/* stair balcony ring */}
      <mesh position={[0, 7.4, 0]}>
        <cylinderGeometry args={[2.9, 2.5, 0.5, 12]} />
        <meshStandardMaterial color={ROOF} roughness={0.8} />
      </mesh>
      {/* railing */}
      <mesh position={[0, 7.9, 0]}>
        <cylinderGeometry args={[2.9, 2.9, 0.08, 12]} />
        <meshStandardMaterial color="#7f8790" metalness={0.4} roughness={0.5} />
      </mesh>

      {/* glazed cab */}
      <mesh position={[0, cabH + 0.9, 0]} castShadow>
        <cylinderGeometry args={[3.3, 3.3, 3.4, 12]} />
        <meshStandardMaterial color={GLASS} roughness={0.2} metalness={0.3} />
      </mesh>
      {/* vertical mullions */}
      {panels.map((p, i) => (
        <mesh key={i} position={p.p} rotation={p.r}>
          <boxGeometry args={[3.4, 0.18, 0.1]} />
          <meshStandardMaterial color={FRAME} roughness={0.5} />
        </mesh>
      ))}
      {/* cab roof */}
      <mesh position={[0, cabH + 2.75, 0]} castShadow>
        <cylinderGeometry args={[3.5, 3.5, 0.4, 12]} />
        <meshStandardMaterial color={ROOF} roughness={0.7} />
      </mesh>

      {/* beacon on top */}
      <mesh position={[0, cabH + 3.2, 0]}>
        <cylinderGeometry args={[0.2, 0.3, 1, 8]} />
        <meshStandardMaterial color={FRAME} roughness={0.5} />
      </mesh>
      <mesh position={[0, cabH + 3.8, 0]}>
        <sphereGeometry args={[0.35, 12, 12]} />
        <meshStandardMaterial color="#ff3b30" emissive="#ff3b30" emissiveIntensity={1.2} />
      </mesh>

      {/* antennas */}
      <mesh position={[1.2, cabH + 4.1, 0.8]} rotation-x={0.25}>
        <cylinderGeometry args={[0.02, 0.02, 3.2, 4]} />
        <meshStandardMaterial color="#7f8790" metalness={0.6} roughness={0.4} />
      </mesh>

      {/* entrance on ground */}
      <mesh position={[0, 1.2, -3.6]}>
        <boxGeometry args={[2.4, 2.4, 0.2]} />
        <meshStandardMaterial color="#5b646e" roughness={0.6} />
      </mesh>
    </group>
  );
}
