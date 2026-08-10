import { useMemo } from 'react';
import { Text } from '@react-three/drei';
import * as THREE from 'three';

const CONCRETE = new THREE.Color('#cfc6b4');
const CONCRETE_D = new THREE.Color('#a89d88');
const GLASS = new THREE.Color('#7fb2c9');
const FRAME = new THREE.Color('#3b444c');
const ROOF = new THREE.Color('#2f3338');
const SOLAR = new THREE.Color('#274a63');
const SOLAR_LINE = new THREE.Color('#3d6d8f');
const SIGN = new THREE.Color('#1b2a38');

// Repetitive facade windows generated once per size.
function windowGrid({
  origin,
  columns,
  rows,
  spacingX,
  spacingY,
  width,
  height,
  depth,
}: {
  origin: [number, number, number];
  columns: number;
  rows: number;
  spacingX: number;
  spacingY: number;
  width: number;
  height: number;
  depth: number;
}) {
  const meshes: { p: [number, number, number]; s: [number, number, number] }[] = [];
  for (let c = 0; c < columns; c++) {
    for (let r = 0; r < rows; r++) {
      meshes.push({
        p: [
          origin[0] + (c - (columns - 1) / 2) * spacingX,
          origin[1] + r * spacingY,
          origin[2],
        ],
        s: [width, height, depth],
      });
    }
  }
  return meshes;
}

export function AcademyHQ({ position = [0, 0, 0] as [number, number, number], rotation = 0 }) {
  const w = 16;
  const d = 11;
  const h = 8;

  const northWindows = useMemo(
    () =>
      windowGrid({
        origin: [0, 2.6, d / 2 + 0.02],
        columns: 6,
        rows: 2,
        spacingX: 2.3,
        spacingY: 2.9,
        width: 1.5,
        height: 1.8,
        depth: 0.06,
      }),
    [d]
  );
  const southWindows = useMemo(
    () =>
      windowGrid({
        origin: [0, 2.6, -d / 2 - 0.02],
        columns: 6,
        rows: 2,
        spacingX: 2.3,
        spacingY: 2.9,
        width: 1.5,
        height: 1.8,
        depth: 0.06,
      }),
    [d]
  );
  const westWindows = useMemo(
    () =>
      windowGrid({
        origin: [-w / 2 - 0.02, 2.6, 0],
        columns: 3,
        rows: 2,
        spacingX: 2.3,
        spacingY: 2.9,
        width: 1.5,
        height: 1.8,
        depth: 0.06,
      }),
    [w]
  );

  const solarPanels = useMemo(() => {
    const panels: { p: [number, number, number]; r: [number, number, number] }[] = [];
    const cols = 4;
    const rows = 2;
    for (let c = 0; c < cols; c++) {
      for (let r = 0; r < rows; r++) {
        panels.push({
          p: [
            (c - (cols - 1) / 2) * 3.6,
            h + 0.12,
            (r - (rows - 1) / 2) * 4.4 + 0.5,
          ],
          r: [-0.22, 0, 0],
        });
      }
    }
    return panels;
  }, [h]);

  return (
    <group position={position} rotation={[0, rotation, 0]}>
      {/* Concrete volume */}
      <mesh position={[0, h / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[w, h, d]} />
        <meshStandardMaterial color={CONCRETE} roughness={0.92} />
      </mesh>
      {/* Roof slab */}
      <mesh position={[0, h + 0.15, 0]} castShadow>
        <boxGeometry args={[w + 1.4, 0.3, d + 1.4]} />
        <meshStandardMaterial color={ROOF} roughness={0.7} />
      </mesh>

      {/* Solar panels on the roof */}
      {solarPanels.map((p, i) => (
        <group key={i} position={p.p} rotation={p.r}>
          <mesh>
            <boxGeometry args={[3.1, 0.08, 1.7]} />
            <meshStandardMaterial color={SOLAR} roughness={0.35} metalness={0.4} />
          </mesh>
          <mesh position={[0, 0.02, 0]}>
            <boxGeometry args={[3.1, 0.06, 0.06]} />
            <meshStandardMaterial color={SOLAR_LINE} roughness={0.3} />
          </mesh>
        </group>
      ))}

      {/* Glass ribbon on the north facade */}
      <mesh position={[0, 2.6, d / 2 + 0.05]} castShadow>
        <boxGeometry args={[w - 2.4, 6, 0.1]} />
        <meshStandardMaterial color={GLASS} roughness={0.25} metalness={0.2} />
      </mesh>
      {northWindows.map((win, i) => (
        <mesh key={i} position={win.p} castShadow>
          <boxGeometry args={win.s} />
          <meshStandardMaterial color={FRAME} roughness={0.6} />
        </mesh>
      ))}

      {/* South windows */}
      {southWindows.map((win, i) => (
        <mesh key={i} position={win.p} castShadow>
          <boxGeometry args={win.s} />
          <meshStandardMaterial color={GLASS} roughness={0.3} metalness={0.1} />
        </mesh>
      ))}

      {/* West windows */}
      {westWindows.map((win, i) => (
        <mesh key={i} position={win.p} castShadow>
          <boxGeometry args={win.s} />
          <meshStandardMaterial color={GLASS} roughness={0.3} metalness={0.1} />
        </mesh>
      ))}

      {/* Entrance canopy + glass door on the south side */}
      <group position={[0, 0, -d / 2]}>
        <mesh position={[0, 2.35, 0.1]} castShadow>
          <boxGeometry args={[4, 0.2, 2.4]} />
          <meshStandardMaterial color={CONCRETE_D} roughness={0.9} />
        </mesh>
        {[-1.2, 0, 1.2].map((x, i) => (
          <mesh key={i} position={[x, 1.25, 0.12]}>
            <boxGeometry args={[1, 2.5, 0.08]} />
            <meshStandardMaterial color={GLASS} roughness={0.2} metalness={0.3} />
          </mesh>
        ))}
      </group>

      {/* MENTIS sign above the entrance */}
      <group position={[0, 7.1, -d / 2 - 0.4]}>
        <mesh position={[0, 0.3, 0]}>
          <boxGeometry args={[7, 1.1, 0.25]} />
          <meshStandardMaterial color={SIGN} roughness={0.4} metalness={0.2} />
        </mesh>
        <Text fontSize={0.75} color="#ffffff" anchorX="center" anchorY="middle" position={[0, 0.3, 0.2]}>
          MENTIS ACADEMY
        </Text>
      </group>

      {/* Corner flag */}
      <group position={[w / 2 - 0.4, 0, d / 2 - 0.4]}>
        <mesh position={[0, 4.2, 0]} castShadow>
          <cylinderGeometry args={[0.06, 0.08, 8.4, 6]} />
          <meshStandardMaterial color="#8a9299" metalness={0.5} roughness={0.4} />
        </mesh>
        <mesh position={[0, 8.1, 0]}>
          <boxGeometry args={[1.6, 0.7, 0.04]} />
          <meshStandardMaterial color="#f97316" roughness={0.6} />
        </mesh>
      </group>

      {/* Entrance path marker */}
      <mesh position={[0, 0.05, -d / 2 - 1.6]} rotation-x={-Math.PI / 2}>
        <planeGeometry args={[5, 3.4]} />
        <meshStandardMaterial color={CONCRETE_D} roughness={1} />
      </mesh>
    </group>
  );
}
