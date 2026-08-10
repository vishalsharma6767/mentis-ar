import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { dronePose, droneState } from './droneState';

// Realistic-style quadcopter — position/quaternion driven by the physics loop in DroneSim.
export function Drone({ resetId }: { resetId: number }) {
  const groupRef = useRef<THREE.Group>(null);
  const rotors = useRef<(THREE.Group | null)[]>([]);
  const prevReset = useRef(resetId);

  useFrame((_, delta) => {
    const dt = Math.min(delta, 0.05);
    if (prevReset.current !== resetId) {
      prevReset.current = resetId;
      rotors.current.forEach((r) => {
        if (r) r.rotation.y = 0;
      });
    }
    if (groupRef.current) {
      groupRef.current.position.copy(dronePose.position);
      groupRef.current.quaternion.copy(dronePose.quaternion);
    }
    const spin =
      (droneState.status === 'flying' ? droneState.throttle * 260 + 40 : droneState.status === 'idle' || droneState.status === 'landed' ? 12 : 0) * dt;
    rotors.current.forEach((r) => {
      if (r) r.rotation.y += spin;
    });
  });

  const carbon = '#14161b';
  const arm = '#1d2128';
  const motor = '#3a3f47';
  const accent = '#22d3ee';
  const prop = '#23272e';

  const ARM_POS: [number, number][] = [
    [-1, 1],
    [1, 1],
    [-1, -1],
    [1, -1],
  ];

  return (
    <group ref={groupRef}>
      {/* Central chassis */}
      <mesh castShadow>
        <boxGeometry args={[0.34, 0.14, 0.52]} />
        <meshStandardMaterial color={carbon} metalness={0.75} roughness={0.32} />
      </mesh>
      <mesh position={[0, 0.05, 0]}>
        <boxGeometry args={[0.3, 0.03, 0.36]} />
        <meshStandardMaterial color={accent} emissive={accent} emissiveIntensity={0.25} metalness={0.6} roughness={0.3} />
      </mesh>
      {/* GPS / control stack */}
      <mesh position={[0, 0.1, -0.05]}>
        <boxGeometry args={[0.16, 0.05, 0.22]} />
        <meshStandardMaterial color="#0c0e12" metalness={0.6} roughness={0.4} />
      </mesh>
      {/* Antenna */}
      <mesh position={[0.1, 0.16, -0.1]}>
        <cylinderGeometry args={[0.006, 0.006, 0.16, 6]} />
        <meshStandardMaterial color="#0c0e12" metalness={0.8} roughness={0.3} />
      </mesh>

      {/* Camera gimbal (nose) */}
      <group position={[0, 0.01, -0.3]}>
        <mesh castShadow>
          <boxGeometry args={[0.12, 0.1, 0.1]} />
          <meshStandardMaterial color="#0c0e12" metalness={0.7} roughness={0.35} />
        </mesh>
        <mesh position={[0, 0, -0.05]} rotation-x={Math.PI / 2}>
          <cylinderGeometry args={[0.045, 0.045, 0.04, 18]} />
          <meshStandardMaterial color="#2b2f36" metalness={0.8} roughness={0.2} />
        </mesh>
        <mesh position={[0, 0, -0.075]} rotation-x={Math.PI / 2}>
          <cylinderGeometry args={[0.024, 0.024, 0.03, 16]} />
          <meshStandardMaterial color="#0a0b0d" metalness={0.4} roughness={0.05} />
        </mesh>
      </group>

      {/* Skids */}
      {[-0.14, 0.14].map((x, i) => (
        <group key={i} position={[x, -0.12, 0]}>
          <mesh position={[0, -0.02, 0.1]} rotation-x={Math.PI / 2}>
            <cylinderGeometry args={[0.012, 0.012, 0.22, 8]} />
            <meshStandardMaterial color={arm} metalness={0.6} roughness={0.5} />
          </mesh>
          <mesh position={[0, -0.05, 0]}>
            <boxGeometry args={[0.02, 0.02, 0.3]} />
            <meshStandardMaterial color="#0c0e12" metalness={0.5} roughness={0.6} />
          </mesh>
        </group>
      ))}

      {/* Four arms + motors + propellers */}
      {ARM_POS.map(([sx, sz], i) => {
        const mx = sx * 0.36;
        const mz = sz * 0.36;
        const ang = Math.atan2(sx, sz);
        return (
          <group key={i}>
            {/* Arm */}
            <mesh position={[sx * 0.18, 0.02, sz * 0.18]} rotation-y={ang} castShadow>
              <boxGeometry args={[0.22, 0.035, 0.06]} />
              <meshStandardMaterial color={arm} metalness={0.55} roughness={0.4} />
            </mesh>
            {/* Motor */}
            <mesh position={[mx, 0.05, mz]}>
              <cylinderGeometry args={[0.045, 0.05, 0.05, 14]} />
              <meshStandardMaterial color={motor} metalness={0.85} roughness={0.25} />
            </mesh>
            {/* Propeller (two crossed blades, spins fast) */}
            <group
              ref={(el) => {
                rotors.current[i] = el;
              }}
              position={[mx, 0.09, mz]}
            >
              <mesh rotation-y={Math.PI / 4}>
                <boxGeometry args={[0.4, 0.006, 0.045]} />
                <meshStandardMaterial color={prop} roughness={0.5} metalness={0.4} transparent opacity={0.92} />
              </mesh>
              <mesh rotation-y={-Math.PI / 4}>
                <boxGeometry args={[0.4, 0.006, 0.045]} />
                <meshStandardMaterial color={prop} roughness={0.5} metalness={0.4} transparent opacity={0.92} />
              </mesh>
              <mesh>
                <cylinderGeometry args={[0.012, 0.012, 0.02, 8]} />
                <meshStandardMaterial color="#0c0e12" metalness={0.7} roughness={0.3} />
              </mesh>
            </group>
          </group>
        );
      })}

      {/* Orientation LEDs */}
      <mesh position={[0.06, 0.02, 0.27]}>
        <sphereGeometry args={[0.018, 10, 10]} />
        <meshStandardMaterial
          color="#ef4444"
          emissive="#ef4444"
          emissiveIntensity={droneState.status === 'flying' ? 1.6 : 0.6}
        />
      </mesh>
      <mesh position={[-0.06, 0.02, 0.27]}>
        <sphereGeometry args={[0.018, 10, 10]} />
        <meshStandardMaterial
          color="#ef4444"
          emissive="#ef4444"
          emissiveIntensity={droneState.status === 'flying' ? 1.6 : 0.6}
        />
      </mesh>
      {/* Status LED (bottom) */}
      <mesh position={[0, -0.08, 0]}>
        <sphereGeometry args={[0.03, 12, 12]} />
        <meshStandardMaterial
          color={droneState.status === 'crashed' ? '#ef4444' : droneState.status === 'flying' ? '#22c55e' : '#38bdf8'}
          emissive={droneState.status === 'crashed' ? '#ef4444' : droneState.status === 'flying' ? '#22c55e' : '#38bdf8'}
          emissiveIntensity={1.4}
        />
      </mesh>
    </group>
  );
}
