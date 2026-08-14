import { useEffect, useRef, useSyncExternalStore } from 'react';
import { Box, Text } from '@react-three/drei';
import { segmentNav, WallSegmentItem } from '../gamepad/segmentNav';

export type { WallSegmentItem };

// One wall-mounted control segment (a framed board with a title bar and a grid
// of item pills). Each wall of the lab hosts its own segment(s) so the racks
// and actions are spread across the room instead of one tiny screen.
//
// Interaction:
//   - Pointer / WebXR ray select -> activates the segment + runs the pill.
//   - Gamepad: Left/Right switches segment, Up/Down picks a pill, A activates.

const FONT =
  'https://fonts.gstatic.com/s/inter/v12/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuLyeMZhrib2Bg-4.ttf';

interface Props {
  id: string;
  position: [number, number, number];
  rotation?: [number, number, number];
  title: string;
  accent: string;
  items: WallSegmentItem[];
}

const COLS = 2;
const BOARD_W = 3.1;
const BOARD_H = 2.2;

export function LabWallSegment({ id, position, rotation, title, accent, items }: Props) {
  const itemsRef = useRef(items);
  itemsRef.current = items;

  // Register with the gamepad nav hub (fresh items via accessor).
  useEffect(() => {
    segmentNav.register({ id, items: () => itemsRef.current });
    return () => segmentNav.unregister(id);
  }, [id]);

  const version = useSyncExternalStore(segmentNav.subscribe, () => segmentNav.version);
  const isActive = segmentNav.activeId === id;
  const focusHere = isActive ? segmentNav.focusIndex : -1;
  void version;

  const rows = Math.max(1, Math.ceil(items.length / COLS));

  const rowY = (row: number) => 0.42 - row * 0.62;
  const colX = (col: number) => -0.85 + col * 1.7;

  return (
    <group position={position} rotation={rotation}>
      {/* Back plate */}
      <Box args={[BOARD_W, BOARD_H, 0.12]}>
        <meshStandardMaterial color="#0b1520" roughness={0.4} metalness={0.35} />
      </Box>

      {/* Accent frame (glows when this wall segment is active) */}
      <Box args={[BOARD_W + 0.12, BOARD_H + 0.12, 0.05]} position={[0, 0, -0.07]}>
        <meshStandardMaterial
          color={isActive ? accent : '#1e293b'}
          emissive={accent}
          emissiveIntensity={isActive ? 0.55 : 0.15}
          toneMapped={false}
        />
      </Box>

      {/* Title bar */}
      <mesh position={[0, BOARD_H / 2 - 0.18, 0.07]}>
        <planeGeometry args={[BOARD_W - 0.2, 0.34]} />
        <meshStandardMaterial color={accent} emissive={accent} emissiveIntensity={0.4} toneMapped={false} />
      </mesh>
      <Text
        position={[0, BOARD_H / 2 - 0.18, 0.09]}
        fontSize={0.24}
        color="#ffffff"
        anchorX="center"
        anchorY="middle"
        font={FONT}
        outlineWidth={0.002}
        outlineColor="#000000"
      >
        {title}
      </Text>

      {/* Pills */}
      {items.map((item, idx) => {
        const row = Math.floor(idx / COLS);
        const col = idx % COLS;
        const x = colX(col);
        const y = rowY(row);
        const isFocus = isActive && focusHere === idx;
        return (
          <group key={item.id} position={[x, y, 0.09]}>
            {isFocus && (
              <Box args={[1.62, 0.46, 0.03]} position={[0, 0, 0.01]}>
                <meshStandardMaterial
                  color="#ffffff"
                  emissive="#22d3ee"
                  emissiveIntensity={1.4}
                  toneMapped={false}
                />
              </Box>
            )}
            <mesh
              onClick={(e) => {
                e.stopPropagation();
                segmentNav.setPointer(id, idx, true);
              }}
              onPointerOver={() => segmentNav.setPointer(id, idx, false)}
            >
              <planeGeometry args={[1.5, 0.4]} />
              <meshStandardMaterial
                color={item.color}
                emissive={item.color}
                emissiveIntensity={isFocus ? 1 : 0.4}
                toneMapped={false}
              />
            </mesh>
            <Text
              position={[0, item.sub ? 0.08 : 0, 0.01]}
              fontSize={item.sub ? 0.14 : 0.17}
              color="#ffffff"
              anchorX="center"
              anchorY="middle"
              maxWidth={1.34}
              font={FONT}
            >
              {item.label}
            </Text>
            {item.sub && (
              <Text
                position={[0, -0.1, 0.01]}
                fontSize={0.11}
                color="#cbd5e1"
                anchorX="center"
                anchorY="middle"
                font={FONT}
              >
                {item.sub}
              </Text>
            )}
          </group>
        );
      })}
    </group>
  );
}