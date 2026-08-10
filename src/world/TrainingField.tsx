import { useMemo } from 'react';
import { Text } from '@react-three/drei';
import * as THREE from 'three';

const PAD = new THREE.Color('#24272d');
const PAD_RING = new THREE.Color('#e6e2d8');
const CONE = new THREE.Color('#f97316');
const CONE_WHITE = new THREE.Color('#f8fafc');
const GATE_POST = new THREE.Color('#4b5563');
const GATE_BAR = new THREE.Color('#f59e0b');

export function LandingPad({
  position = [0, 0, 0] as [number, number, number],
  label = 'PAD 01',
  radius = 2.4,
}) {
  return (
    <group position={position}>
      <mesh rotation-x={-Math.PI / 2} receiveShadow>
        <circleGeometry args={[radius, 40]} />
        <meshStandardMaterial color={PAD} roughness={0.95} />
      </mesh>
      <mesh rotation-x={-Math.PI / 2} position-y={0.005}>
        <ringGeometry args={[radius - 0.4, radius, 48]} />
        <meshStandardMaterial color={PAD_RING} roughness={0.8} />
      </mesh>
      <mesh rotation-x={-Math.PI / 2} position-y={0.008}>
        <ringGeometry args={[radius * 0.5 - 0.12, radius * 0.5, 32]} />
        <meshStandardMaterial color={PAD_RING} roughness={0.8} />
      </mesh>
      {/* painted H */}
      <group position={[0, 0.012, 0]}>
        {[-0.34, 0.34].map((x) => (
          <mesh key={x} position={[x, 0, 0]} rotation-x={-Math.PI / 2}>
            <planeGeometry args={[0.18, 1.1]} />
            <meshStandardMaterial color={PAD_RING} roughness={0.8} />
          </mesh>
        ))}
        <mesh rotation-x={-Math.PI / 2}>
          <planeGeometry args={[1.05, 0.18]} />
          <meshStandardMaterial color={PAD_RING} roughness={0.8} />
        </mesh>
      </group>
      <Text position={[0, 0.9, 0]} fontSize={0.28} color={PAD_RING} anchorX="center" anchorY="middle">
        {label}
      </Text>
    </group>
  );
}

export function TrainingCone({ position = [0, 0, 0] as [number, number, number] }) {
  return (
    <group position={position}>
      <mesh castShadow>
        <coneGeometry args={[0.28, 0.75, 16]} />
        <meshStandardMaterial color={CONE} roughness={0.7} />
      </mesh>
      <mesh position={[0, 0.18, 0]}>
        <cylinderGeometry args={[0.13, 0.13, 0.14, 16]} />
        <meshStandardMaterial color={CONE_WHITE} roughness={0.8} />
      </mesh>
      <mesh position={[0, 0.42, 0]}>
        <cylinderGeometry args={[0.11, 0.11, 0.12, 16]} />
        <meshStandardMaterial color={CONE_WHITE} roughness={0.8} />
      </mesh>
      <mesh position={[0, -0.03, 0]}>
        <boxGeometry args={[0.6, 0.06, 0.6]} />
        <meshStandardMaterial color={CONE} roughness={0.7} />
      </mesh>
    </group>
  );
}

export function Gate({
  position = [0, 0, 0] as [number, number, number],
  rotation = 0,
  span = 3.4,
  height = 3,
}) {
  return (
    <group position={position} rotation={[0, rotation, 0]}>
      {[-1, 1].map((s) => (
        <group key={s}>
          <mesh position={[s * (span / 2), height / 2, 0]} castShadow>
            <boxGeometry args={[0.24, height, 0.24]} />
            <meshStandardMaterial color={GATE_POST} roughness={0.7} />
          </mesh>
          <mesh position={[s * (span / 2), height - 0.3, 0]}>
            <boxGeometry args={[0.3, 0.3, 0.3]} />
            <meshStandardMaterial color={GATE_BAR} roughness={0.6} />
          </mesh>
        </group>
      ))}
      <mesh position={[0, height - 0.2, 0]} castShadow>
        <boxGeometry args={[span + 0.4, 0.28, 0.26]} />
        <meshStandardMaterial color={GATE_BAR} roughness={0.6} />
      </mesh>
      {/* hanging banner */}
      <mesh position={[0, height - 0.9, 0.03]}>
        <planeGeometry args={[1.4, 0.8]} />
        <meshStandardMaterial color={PAD_RING} roughness={0.9} />
      </mesh>
    </group>
  );
}

// A full training field: rows of pads, a slalom cone course and a practice gate.
export function TrainingField({ position = [0, 0, 0] as [number, number, number], rotation = 0 }) {
  const cones = useMemo(() => {
    const list: [number, number, number][] = [];
    for (let i = 0; i < 6; i++) {
      list.push([i * 3.4 - 8.5, 0, 6]);
    }
    for (let i = 0; i < 4; i++) {
      list.push([-10 + i * 5, 0, 1]);
    }
    return list;
  }, []);

  return (
    <group position={position} rotation={[0, rotation, 0]}>
      {/* hardstand floor */}
      <mesh position={[0, 0.04, 0]} rotation-x={-Math.PI / 2} receiveShadow>
        <planeGeometry args={[30, 22]} />
        <meshStandardMaterial color="#a89a7d" roughness={1} />
      </mesh>

      {/* pads */}
      <LandingPad position={[-8, 0.05, -5]} label="PAD 01" />
      <LandingPad position={[0, 0.05, -5]} label="PAD 02" />
      <LandingPad position={[8, 0.05, -5]} label="PAD 03" />

      {/* practice gate */}
      <Gate position={[0, 0.05, -10.5]} rotation={Math.PI / 2} />

      {/* slalom cones */}
      {cones.map((c, i) => (
        <TrainingCone key={i} position={c} />
      ))}

      {/* boundary markers */}
      {[
        [-14, -10],
        [14, -10],
        [-14, 10],
        [14, 10],
      ].map((p, i) => (
        <group key={i} position={[p[0], 0.6, p[1]]}>
          <mesh>
            <cylinderGeometry args={[0.08, 0.1, 1.2, 8]} />
            <meshStandardMaterial color="#b7a06e" roughness={0.9} />
          </mesh>
          <mesh position={[0, 0.72, 0]}>
            <cylinderGeometry args={[0.18, 0.18, 0.14, 10]} />
            <meshStandardMaterial color={CONE_WHITE} roughness={0.7} />
          </mesh>
        </group>
      ))}
    </group>
  );
}
