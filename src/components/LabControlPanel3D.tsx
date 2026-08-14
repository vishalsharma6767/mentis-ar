import { useEffect, useMemo, useRef, useState } from 'react';
import { Box, Text } from '@react-three/drei';
import { onGamepadUi } from '../gamepad/gamepadInput';
import { LAB_CATALOG, InventoryItem, TableItem } from '../types';

// In-scene control screen inside the 3D lab. This is the primary way to run the
// lab while inside VR (the 2D browser UI is not visible through the headset):
// pick a rack category, select/gaze an item to place it on the bench, then use
// the action buttons to pour, heat, clear, remove or ask Nova.
//
// Works three ways:
//   1. Pointer / ray — WebXR Controller (and Hands pinch) raycast select.
//   2. Mouse click on desktop.
//   3. Gamepad — D-pad moves an emissive focus frame, A activates, B goes back.

interface LabControlPanel3DProps {
  tableItems: TableItem[];
  isHeating: boolean;
  selectedTableItemId: string | null;
  onSelectTableItem: (id: string | null) => void;
  onAddItemToTable: (item: InventoryItem) => void;
  onRemoveTableItem: (id: string) => void;
  onClearTable: () => void;
  onMixChemicals: (sourceId: string, targetId: string) => void;
  onToggleHeating: () => void;
  onAskNovaAboutTable: () => void;
  speak: (text: string) => void;
}

type Cat = 'glassware' | 'chemicals' | 'equipment';

interface Control {
  id: string;
  label: string;
  sub?: string;
  color: string;
  action: () => void;
}

const CATS: Array<{ id: Cat; label: string; color: string }> = [
  { id: 'glassware', label: 'GLASS', color: '#0284c7' },
  { id: 'chemicals', label: 'CHEMS', color: '#a855f7' },
  { id: 'equipment', label: 'TOOLS', color: '#f59e0b' },
];

const COLS = 4;

export function LabControlPanel3D(props: LabControlPanel3DProps) {
  const [cat, setCat] = useState<Cat | null>(null);
  const [focus, setFocus] = useState(0);

  const controls = useMemo<Control[]>(() => {
    const out: Control[] = [];
    for (const c of CATS) {
      out.push({
        id: `cat:${c.id}`,
        label: c.label,
        color: c.color,
        action: () => {
          setCat(c.id);
          props.speak(`${c.label} rack open. Pick any item.`);
        },
      });
    }
    if (cat) {
      const items = LAB_CATALOG.filter((i) => i.category === cat);
      items.forEach((item, idx) => {
        out.push({
          id: `item:${item.id}`,
          label: item.name,
          sub: item.formula,
          color: item.color || '#38bdf8',
          action: () => {
            props.onAddItemToTable(item);
            props.speak(`Added ${item.name}.`);
          },
        });
      });
    }
    out.push(
      {
        id: 'act:pour',
        label: 'POUR',
        color: '#22c55e',
        action: () => {
          if (props.tableItems.length >= 2) {
            props.onMixChemicals(props.tableItems[0].instanceId, props.tableItems[1].instanceId);
          } else {
            props.speak('Need at least two items on the table to pour between.');
          }
        },
      },
      {
        id: 'act:heat',
        label: props.isHeating ? 'HEAT ON' : 'HEAT',
        color: props.isHeating ? '#b91c1c' : '#ef4444',
        action: () => {
          props.onToggleHeating();
          props.speak(props.isHeating ? 'Heater off.' : 'Heater on.');
        },
      },
      {
        id: 'act:clear',
        label: 'CLEAR',
        color: '#e11d48',
        action: () => {
          props.onClearTable();
          props.speak('Table cleared.');
        },
      },
      {
        id: 'act:remove',
        label: 'REMOVE',
        color: '#f97316',
        action: () => {
          if (props.selectedTableItemId) {
            props.onRemoveTableItem(props.selectedTableItemId);
            props.onSelectTableItem(null);
            props.speak('Item removed.');
          } else {
            props.speak('Select an item on the table first.');
          }
        },
      },
      {
        id: 'act:nova',
        label: 'NOVA',
        color: '#8b5cf6',
        action: () => props.onAskNovaAboutTable(),
      },
    );
    return out;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cat, props.isHeating, props.tableItems.length, props.selectedTableItemId]);

  // Keep the focus highlight in range whenever the layout changes.
  useEffect(() => {
    setFocus((f) => Math.min(f, Math.max(0, controls.length - 1)));
  }, [controls.length, cat]);

  const activate = () => {
    const c = controls[focus];
    if (!c) return;
    c.action();
  };

  const move = (dir: 'up' | 'down' | 'left' | 'right') => {
    setFocus((f) => {
      const step = dir === 'up' || dir === 'right' ? 1 : -1;
      return (f + step + controls.length) % controls.length;
    });
  };

  const back = () => {
    if (cat) {
      setCat(null);
      setFocus(0);
      props.speak('Rack closed.');
    } else {
      setCat('equipment');
      setFocus(0);
      props.speak('Tools rack open.');
    }
  };

  const api = useRef({ move, activate, back });
  api.current = { move, activate, back };
  useEffect(() => {
    onGamepadUi(() => api.current);
    return () => onGamepadUi(null);
  }, []);

  const totalRows = Math.max(1, Math.ceil(controls.length / COLS));
  const screenW = 3.7;
  const screenH = 0.78 + totalRows * 0.56;

  return (
    <group position={[2.9, 1.9, -1.35]} rotation-x={-0.05}>
      {/* Pedestal stand down to the floor (floor surface sits at y = -0.5). */}
      <Box args={[0.52, 2.4, 0.36]} position={[0, -1.2, -0.12]}>
        <meshStandardMaterial color="#1e293b" roughness={0.5} metalness={0.6} />
      </Box>
      <Box args={[0.44, 0.16, 0.52]} position={[0, -2.42, -0.12]}>
        <meshStandardMaterial color="#0f172a" roughness={0.6} />
      </Box>

      {/* Console frame */}
      <Box args={[screenW, screenH, 0.14]}>
        <meshStandardMaterial color="#0f172a" roughness={0.35} metalness={0.4} />
      </Box>

      {/* Screen surface */}
      <mesh position={[0, 0, 0.075]}>
        <planeGeometry args={[screenW - 0.26, screenH - 0.26]} />
        <meshStandardMaterial color="#020617" roughness={0.25} metalness={0.3} />
      </mesh>

      {/* Header */}
      <Text position={[0, screenH / 2 - 0.19, 0.085]} fontSize={0.2} color="#7dd3fc" anchorX="center">
        LAB SCREEN · ALL FUNCTIONS
      </Text>
      <Text position={[0, -screenH / 2 + 0.15, 0.085]} fontSize={0.1} color="#64748b" anchorX="center">
        D-pad move · A select · B back · ray/pointer to press
      </Text>

      {/* Controls grid */}
      {controls.map((c, idx) => {
        const col = idx % COLS;
        const row = Math.floor(idx / COLS);
        const btnW = c.sub ? 1.34 : 0.84;
        const btnH = c.sub ? 0.4 : 0.46;
        const x = -screenW / 2 + 0.48 + col * ((screenW - 0.96) / COLS);
        const y = screenH / 2 - 0.5 - (totalRows - 1 - row) * 0.56;
        const isFocus = idx === focus;
        return (
          <group key={c.id} position={[x, y, 0.085]}>
            {isFocus && (
              <Box args={[btnW + 0.08, btnH + 0.1, 0.02]} position={[0, 0, 0.005]}>
                <meshStandardMaterial
                  color="#cffafe"
                  emissive="#22d3ee"
                  emissiveIntensity={1.5}
                  toneMapped={false}
                />
              </Box>
            )}
            <mesh
              onClick={(e) => {
                e.stopPropagation();
                c.action();
              }}
              onPointerOver={() => setFocus(idx)}
            >
              <planeGeometry args={[btnW, btnH]} />
              <meshStandardMaterial
                color={c.color}
                emissive={c.color}
                emissiveIntensity={isFocus ? 0.9 : 0.4}
                toneMapped={false}
              />
            </mesh>
            <Text
              position={[0, c.sub ? 0.09 : 0, 0.01]}
              fontSize={c.sub ? 0.15 : 0.2}
              color="#ffffff"
              anchorX="center"
              anchorY="middle"
              maxWidth={btnW - 0.1}
              letterSpacing={0.6}
            >
              {c.label}
            </Text>
            {c.sub && (
              <Text
                position={[0, -0.12, 0.01]}
                fontSize={0.11}
                color="#cbd5e1"
                anchorX="center"
                anchorY="middle"
              >
                {c.sub}
              </Text>
            )}
          </group>
        );
      })}

      {/* Heating status glow */}
      {props.isHeating && (
        <mesh position={[0, -screenH / 2 + 0.18, 0.085]}>
          <planeGeometry args={[0.6, 0.13]} />
          <meshBasicMaterial color="#f87171" transparent opacity={0.9} />
        </mesh>
      )}
    </group>
  );
}