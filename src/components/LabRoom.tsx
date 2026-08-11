import { useState, useRef, useEffect } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { useXR } from '@react-three/xr';
import { Box, Sphere, Cylinder, Text, Float, Environment, Lightformer } from '@react-three/drei';
import * as THREE from 'three';
import { TableItem, Experiment, fillPercent } from '../types';
import { remoteControl } from '../remote/RemoteBridge';
import { headState } from '../headset/headRig';

interface LabRoomProps {
  labMode: 'guided' | 'sandbox';
  selectedExperiment: Experiment | null;
  tableItems: TableItem[];
  selectedTableItemId: string | null;
  onSelectTableItem: (id: string | null) => void;
  onOpenRackMenu: (category: 'glassware' | 'chemicals' | 'equipment') => void;
  isHeating: boolean;
  pourState?: {
    sourceId: string;
    targetId: string;
    progress: number;
  } | null;
}

// WASD WALKING CONTROLS & MOUSE HEAD LOOK FOR 3D NAVIGATION
function WASDPlayerControls() {
  const { camera, gl } = useThree();
  const presenting = useXR((s) => s.isPresenting);
  const keys = useRef<{ [key: string]: boolean }>({});
  const isDragging = useRef(false);
  const previousMouse = useRef({ x: 0, y: 0 });
  const euler = useRef(new THREE.Euler(0, 0, 0, 'YXZ'));

  useEffect(() => {
    euler.current.setFromQuaternion(camera.quaternion, 'YXZ');

    const handlePointerDown = (e: PointerEvent) => {
      const target = e.target as HTMLElement;
      if (target?.tagName === 'BUTTON' || target?.tagName === 'INPUT' || target?.tagName === 'SELECT') return;
      isDragging.current = true;
      previousMouse.current = { x: e.clientX, y: e.clientY };
    };

    const handlePointerMove = (e: PointerEvent) => {
      if (!isDragging.current) return;

      const deltaX = e.clientX - previousMouse.current.x;
      const deltaY = e.clientY - previousMouse.current.y;
      previousMouse.current = { x: e.clientX, y: e.clientY };

      const sensitivity = 0.0035;
      euler.current.y -= deltaX * sensitivity; // Yaw (Left/Right look)
      euler.current.x -= deltaY * sensitivity; // Pitch (Up/Down look)

      // Clamp pitch so camera view doesn't invert
      euler.current.x = Math.max(-Math.PI / 2.8, Math.min(Math.PI / 2.8, euler.current.x));

      camera.quaternion.setFromEuler(euler.current);
    };

    const handlePointerUp = () => {
      isDragging.current = false;
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement)?.tagName === 'INPUT' || (e.target as HTMLElement)?.tagName === 'SELECT') return;
      keys.current[e.code] = true;
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      keys.current[e.code] = false;
    };

    const domElement = gl.domElement;
    domElement.addEventListener('pointerdown', handlePointerDown);
    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      domElement.removeEventListener('pointerdown', handlePointerDown);
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [camera, gl]);

  useFrame((_, delta) => {
    // In an immersive VR session the headset tracks the head and XRWalk moves
    // the player, so desktop look/walk must not touch the camera here.
    // In split-screen stereo the StereoRig owns the cameras instead.
    if (presenting || headState.splitActive) return;

    const speed = 3.6 * delta;
    const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion);
    forward.y = 0;
    if (forward.lengthSq() > 0) forward.normalize();

    const right = new THREE.Vector3(1, 0, 0).applyQuaternion(camera.quaternion);
    right.y = 0;
    if (right.lengthSq() > 0) right.normalize();

    if (keys.current['KeyW'] || keys.current['ArrowUp']) {
      camera.position.addScaledVector(forward, speed);
    }
    if (keys.current['KeyS'] || keys.current['ArrowDown']) {
      camera.position.addScaledVector(forward, -speed);
    }
    if (keys.current['KeyA'] || keys.current['ArrowLeft']) {
      camera.position.addScaledVector(right, -speed);
    }
    if (keys.current['KeyD'] || keys.current['ArrowRight']) {
      camera.position.addScaledVector(right, speed);
    }

    camera.position.x = Math.max(-5.0, Math.min(5.0, camera.position.x));
    camera.position.z = Math.max(0.6, Math.min(7.0, camera.position.z));

    // Phone controller look: absolute gyro tilt takes precedence over drag deltas.
    if (remoteControl.tilt) {
      euler.current.y = remoteControl.tilt.yaw;
      euler.current.x = Math.max(-Math.PI / 2.8, Math.min(Math.PI / 2.8, remoteControl.tilt.pitch));
      euler.current.z = 0;
      camera.quaternion.setFromEuler(euler.current);
    } else if (remoteControl.lookDx !== 0 || remoteControl.lookDy !== 0) {
      const sensitivity = 0.0035;
      euler.current.y -= remoteControl.lookDx * sensitivity;
      euler.current.x -= remoteControl.lookDy * sensitivity;
      euler.current.x = Math.max(-Math.PI / 2.8, Math.min(Math.PI / 2.8, euler.current.x));
      camera.quaternion.setFromEuler(euler.current);
      remoteControl.lookDx = 0;
      remoteControl.lookDy = 0;
    }
  });

  return null;
}

// Shared radial-gradient texture for cheap soft contact shadows (no shadow maps = fast).
const blobShadowTexture = (() => {
  if (typeof document === 'undefined') return undefined;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 128;
  const ctx = canvas.getContext('2d');
  if (!ctx) return undefined;
  const g = ctx.createRadialGradient(64, 64, 4, 64, 64, 62);
  g.addColorStop(0, 'rgba(0,0,0,0.55)');
  g.addColorStop(0.55, 'rgba(0,0,0,0.28)');
  g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 128, 128);
  return new THREE.CanvasTexture(canvas);
})();

function BlobShadow({
  position,
  size = 0.8,
  opacity = 0.34,
}: {
  position: [number, number, number];
  size?: number;
  opacity?: number;
}) {
  return (
    <mesh position={position} rotation-x={-Math.PI / 2}>
      <planeGeometry args={[size, size]} />
      <meshBasicMaterial map={blobShadowTexture} transparent opacity={opacity} depthWrite={false} />
    </mesh>
  );
}

// 3D BLACKBOARD MOUNTED ON LAB WALL WITH CHALK STEPS & AIM
function LabWallBlackboard({
  selectedExperiment,
  labMode,
}: {
  selectedExperiment: Experiment | null;
  labMode: 'guided' | 'sandbox';
}) {
  return (
    <group position={[0, 2.35, -2.85]}>
      {/* Wooden Frame */}
      <Box args={[5.6, 2.7, 0.08]} castShadow>
        <meshStandardMaterial color="#78350f" roughness={0.6} />
      </Box>

      {/* Blackboard Surface */}
      <mesh position={[0, 0, 0.045]}>
        <planeGeometry args={[5.4, 2.5]} />
        <meshStandardMaterial color="#0c2018" roughness={0.92} />
      </mesh>

      {/* Chalk Tray at bottom */}
      <Box args={[5.2, 0.06, 0.12]} position={[0, -1.22, 0.08]}>
        <meshStandardMaterial color="#92400e" roughness={0.7} />
      </Box>
      <Cylinder args={[0.012, 0.012, 0.12, 12]} position={[-1.4, -1.18, 0.09]} rotation={[0, 0, Math.PI / 2]}>
        <meshStandardMaterial color="#f8fafc" />
      </Cylinder>
      <Cylinder args={[0.012, 0.012, 0.09, 12]} position={[-1.1, -1.18, 0.09]} rotation={[0, 0, Math.PI / 2.2]}>
        <meshStandardMaterial color="#fef08a" />
      </Cylinder>

      {/* Chalk Text Content */}
      {labMode === 'guided' && selectedExperiment ? (
        <group position={[0, 0, 0.05]}>
          <Text position={[0, 1.0, 0]} fontSize={0.16} color="#fef08a" anchorX="center" fontWeight="bold">
            {selectedExperiment.name.toUpperCase()}
          </Text>

          <Text position={[-2.5, 0.72, 0]} fontSize={0.10} color="#7dd3fc" anchorX="left" fontWeight="bold">
            AIM OF EXPERIMENT:
          </Text>
          <Text
            position={[-2.5, 0.52, 0]}
            fontSize={0.082}
            color="#ffffff"
            anchorX="left"
            maxWidth={5.0}
            lineHeight={1.2}
          >
            {selectedExperiment.aim}
          </Text>

          <Text position={[-2.5, 0.22, 0]} fontSize={0.10} color="#7dd3fc" anchorX="left" fontWeight="bold">
            PROCEDURE STEPS:
          </Text>

          {selectedExperiment.steps.map((step, idx) => (
            <Text
              key={idx}
              position={[-2.5, 0.0 - idx * 0.22, 0]}
              fontSize={0.075}
              color="#f8fafc"
              anchorX="left"
              maxWidth={5.0}
              lineHeight={1.15}
            >
              {`${idx + 1}. ${step}`}
            </Text>
          ))}
        </group>
      ) : (
        <group position={[0, 0, 0.05]}>
          <Text position={[0, 0.95, 0]} fontSize={0.18} color="#fef08a" anchorX="center" fontWeight="bold">
            CHEMISTRY SANDBOX WORKBENCH
          </Text>
          <Text position={[-2.5, 0.6, 0]} fontSize={0.10} color="#7dd3fc" anchorX="left" fontWeight="bold">
            LABORATORY GUIDELINES:
          </Text>
          <Text position={[-2.5, 0.35, 0]} fontSize={0.08} color="#ffffff" anchorX="left" maxWidth={5.0}>
            1. Press [1] for Glassware, [2] for Chemicals, or [3] for Fire & Tools.
          </Text>
          <Text position={[-2.5, 0.1, 0]} fontSize={0.08} color="#ffffff" anchorX="left" maxWidth={5.0}>
            2. Select container & press [P] to pour/mix chemical reagents.
          </Text>
          <Text position={[-2.5, -0.15, 0]} fontSize={0.08} color="#ffffff" anchorX="left" maxWidth={5.0}>
            3. Press [F] to ignite Bunsen Burner to heat containers and observe reactions.
          </Text>
          <Text position={[-2.5, -0.4, 0]} fontSize={0.08} color="#ffffff" anchorX="left" maxWidth={5.0}>
            4. Drag mouse on screen to look around in 3D; use WASD to walk around the lab.
          </Text>
        </group>
      )}
    </group>
  );
}

export function LabRoom({
  labMode,
  selectedExperiment,
  tableItems,
  selectedTableItemId,
  onSelectTableItem,
  onOpenRackMenu,
  isHeating,
  pourState,
}: LabRoomProps) {
  return (
    <group>
      {/* Light room palette + distance fading for depth */}
      <color attach="background" args={['#eef2f6']} />
      <fog attach="fog" args={['#eef2f6', 9, 27]} />

      {/* WASD Walking Navigation */}
      <WASDPlayerControls />

      {/* Photorealistic Clean Hexagonal Tiled Epoxy Floor */}
      <mesh rotation-x={-Math.PI / 2} position-y={-0.5} receiveShadow>
        <planeGeometry args={[24, 24]} />
        <meshStandardMaterial color="#f1f5f9" roughness={0.15} metalness={0.2} />
      </mesh>
      <gridHelper args={[24, 24, '#cbd5e1', '#e2e8f0']} position={[0, -0.49, 0]} />

      {/* SOLID ENCLOSED ROOM WALLS & WINDOWS */}
      <group position={[0, 0, -10]}>
        <mesh position={[-7, 4.5, 0]}>
          <boxGeometry args={[10, 10, 0.4]} />
          <meshStandardMaterial color="#e2e8f0" roughness={0.4} />
        </mesh>
        <mesh position={[7, 4.5, 0]}>
          <boxGeometry args={[10, 10, 0.4]} />
          <meshStandardMaterial color="#e2e8f0" roughness={0.4} />
        </mesh>
        <mesh position={[0, 8.5, 0]}>
          <boxGeometry args={[24, 2, 0.4]} />
          <meshStandardMaterial color="#e2e8f0" roughness={0.4} />
        </mesh>
        <mesh position={[0, 0.5, 0]}>
          <boxGeometry args={[24, 2, 0.4]} />
          <meshStandardMaterial color="#e2e8f0" roughness={0.4} />
        </mesh>

        <Box args={[0.15, 6, 0.5]} position={[-2, 4.5, 0]}>
          <meshStandardMaterial color="#0284c7" metalness={0.8} />
        </Box>
        <Box args={[0.15, 6, 0.5]} position={[2, 4.5, 0]}>
          <meshStandardMaterial color="#0284c7" metalness={0.8} />
        </Box>
        <mesh position={[0, 4.5, -0.1]}>
          <planeGeometry args={[8, 6]} />
          <meshStandardMaterial color="#bae6fd" roughness={0.05} opacity={0.5} transparent />
        </mesh>
      </group>

      {/* LEFT CORNER 1: PROFESSIONAL TOXIC FUME HOOD (FLOOR LEVEL Y = -0.5) */}
      <group position={[-4.2, -0.5, -2.2]} rotation={[0, Math.PI / 5, 0]}>
        {/* Base Storage Cabinet */}
        <Box args={[1.8, 0.9, 1.2]} position={[0, 0.45, 0]} castShadow receiveShadow>
          <meshStandardMaterial color="#1e293b" roughness={0.5} metalness={0.7} />
        </Box>
        {/* Stainless Steel Work Chamber */}
        <Box args={[1.8, 1.4, 1.2]} position={[0, 1.6, 0]} castShadow receiveShadow>
          <meshStandardMaterial color="#cbd5e1" roughness={0.2} metalness={0.8} />
        </Box>
        {/* Inner Chamber Hood Hollow Interior */}
        <Box args={[1.5, 1.1, 1.0]} position={[0, 1.5, 0.08]}>
          <meshStandardMaterial color="#0f172a" roughness={0.3} />
        </Box>
        {/* Bright Interior Yellow Light */}
        <pointLight position={[0, 1.8, 0]} intensity={2.5} color="#fef08a" distance={3.5} />
        {/* Glass Sliding Sash Window */}
        <Box args={[1.6, 0.6, 0.04]} position={[0, 1.6, 0.52]}>
          <meshStandardMaterial color="#38bdf8" roughness={0.1} transparent opacity={0.35} />
        </Box>
        {/* Overhead Exhaust Ventilation Duct to Ceiling */}
        <Cylinder args={[0.18, 0.18, 2.5, 32]} position={[0, 3.4, 0]}>
          <meshStandardMaterial color="#64748b" metalness={0.9} roughness={0.2} />
        </Cylinder>
        {/* Warning Chemical Label on Hood */}
        <Text position={[0, 2.15, 0.61]} fontSize={0.08} color="#ef4444" anchorX="center">
          DANGER • TOXIC FUME HOOD
        </Text>
      </group>

      {/* LEFT CORNER 2: SIDE BENCH WITH CENTRIFUGE & ANALYTICAL SCALE */}
      <group position={[-4.0, -0.5, 0.5]} rotation={[0, Math.PI / 2, 0]}>
        {/* Side Bench Desk */}
        <Box args={[1.4, 0.75, 2.8]} position={[0, 0.375, 0]} castShadow receiveShadow>
          <meshStandardMaterial color="#334155" roughness={0.4} />
        </Box>
        <Box args={[1.5, 0.06, 2.9]} position={[0, 0.78, 0]} castShadow receiveShadow>
          <meshStandardMaterial color="#f1f5f9" roughness={0.2} />
        </Box>

        {/* HIGH-SPEED DIGITAL CENTRIFUGE MACHINE */}
        <group position={[0, 0.81, -0.7]}>
          <Box args={[0.55, 0.32, 0.55]} position={[0, 0.16, 0]} castShadow>
            <meshStandardMaterial color="#e2e8f0" roughness={0.3} metalness={0.6} />
          </Box>
          <Cylinder args={[0.22, 0.24, 0.06, 32]} position={[0, 0.35, 0]}>
            <meshStandardMaterial color="#0284c7" metalness={0.8} roughness={0.2} />
          </Cylinder>
          <Box args={[0.18, 0.06, 0.02]} position={[0, 0.22, 0.28]}>
            <meshStandardMaterial color="#0284c7" emissive="#0284c7" emissiveIntensity={0.9} />
          </Box>
          <Text position={[0, 0.22, 0.295]} fontSize={0.038} color="#ffffff" anchorX="center">
            4500 RPM
          </Text>
        </group>

        {/* PRECISION DIGITAL ANALYTICAL SCALE / BALANCE */}
        <group position={[0, 0.81, 0.5]}>
          <Box args={[0.42, 0.08, 0.5]} position={[0, 0.04, 0]}>
            <meshStandardMaterial color="#0f172a" roughness={0.2} />
          </Box>
          <Box args={[0.36, 0.3, 0.36]} position={[0, 0.23, 0]}>
            <meshStandardMaterial color="#38bdf8" transparent opacity={0.3} roughness={0.05} />
          </Box>
          <Cylinder args={[0.1, 0.1, 0.015, 32]} position={[0, 0.11, 0]}>
            <meshStandardMaterial color="#f8fafc" metalness={0.95} />
          </Cylinder>
          <Box args={[0.16, 0.04, 0.02]} position={[0, 0.04, 0.26]}>
            <meshStandardMaterial color="#16a34a" emissive="#16a34a" emissiveIntensity={0.8} />
          </Box>
          <Text position={[0, 0.04, 0.275]} fontSize={0.032} color="#ffffff" anchorX="center">
            25.040 g
          </Text>
        </group>
      </group>

      {/* RIGHT CORNER 3: SIDE COUNTER WITH SPECTROPHOTOMETER, MICROSCOPE & LAB ROBOT */}
      <group position={[4.0, -0.5, -0.8]}>
        <Box args={[1.4, 0.75, 4.2]} position={[0, 0.375, 0]} castShadow receiveShadow>
          <meshStandardMaterial color="#b45309" roughness={0.6} />
        </Box>
        <Box args={[1.5, 0.06, 4.3]} position={[0, 0.78, 0]} castShadow receiveShadow>
          <meshStandardMaterial color="#fef3c7" roughness={0.3} />
        </Box>

        {/* BLUE LAB ASSISTANT ROBOT STANDING ON SIDE COUNTER */}
        <group position={[-0.1, 1.15, -1.4]} rotation={[0, -Math.PI / 4, 0]}>
          <Sphere args={[0.18, 32, 32]} position={[0, 0.28, 0]}>
            <meshStandardMaterial color="#38bdf8" metalness={0.5} roughness={0.2} />
          </Sphere>
          <Box args={[0.2, 0.1, 0.03]} position={[0, 0.3, 0.16]}>
            <meshStandardMaterial color="#0284c7" emissive="#0284c7" emissiveIntensity={0.8} />
          </Box>
          <Cylinder args={[0.015, 0.015, 0.12, 16]} position={[-0.18, 0.42, 0]} rotation={[0, 0, 0.4]}>
            <meshStandardMaterial color="#38bdf8" />
          </Cylinder>
          <Cylinder args={[0.015, 0.015, 0.12, 16]} position={[0.18, 0.42, 0]} rotation={[0, 0, -0.4]}>
            <meshStandardMaterial color="#38bdf8" />
          </Cylinder>
          <Cylinder args={[0.14, 0.18, 0.32, 32]} position={[0, 0, 0]}>
            <meshStandardMaterial color="#0284c7" metalness={0.6} roughness={0.2} />
          </Cylinder>
        </group>

        {/* WOODEN TEST TUBE RACK WITH COLORFUL LIQUIDS */}
        <group position={[0, 0.81, -0.4]}>
          <Box args={[0.18, 0.02, 0.7]} position={[0, 0.01, 0]}>
            <meshStandardMaterial color="#92400e" roughness={0.6} />
          </Box>
          <Box args={[0.18, 0.02, 0.7]} position={[0, 0.22, 0]}>
            <meshStandardMaterial color="#92400e" roughness={0.6} />
          </Box>
          {[
            { pos: -0.24, color: '#ef4444' },
            { pos: -0.12, color: '#22c55e' },
            { pos: 0, color: '#3b82f6' },
            { pos: 0.12, color: '#ec4899' },
            { pos: 0.24, color: '#eab308' },
          ].map((tube, idx) => (
            <group key={idx} position={[0, 0.16, tube.pos]}>
              <Cylinder args={[0.028, 0.028, 0.32, 16]}>
                <meshStandardMaterial color="#ffffff" transparent opacity={0.6} />
              </Cylinder>
              <Cylinder args={[0.024, 0.024, 0.2, 16]} position={[0, -0.04, 0]}>
                <meshStandardMaterial color={tube.color} emissive={tube.color} emissiveIntensity={0.4} />
              </Cylinder>
            </group>
          ))}
        </group>

        {/* SPECTROPHOTOMETER & RESEARCH MICROSCOPE */}
        <group position={[0, 0.81, 1.2]} rotation={[0, -Math.PI / 6, 0]}>
          <group position={[-0.2, 0, 0]}>
            <Box args={[0.6, 0.26, 0.45]} position={[0, 0.13, 0]} castShadow>
              <meshStandardMaterial color="#f8fafc" roughness={0.3} metalness={0.7} />
            </Box>
            <Box args={[0.18, 0.04, 0.18]} position={[-0.14, 0.27, 0]}>
              <meshStandardMaterial color="#0f172a" roughness={0.4} />
            </Box>
            <Box args={[0.2, 0.08, 0.02]} position={[0.14, 0.18, 0.23]}>
              <meshStandardMaterial color="#0284c7" emissive="#0284c7" emissiveIntensity={0.8} />
            </Box>
            <Text position={[0.14, 0.18, 0.245]} fontSize={0.035} color="#ffffff" anchorX="center">
              540 nm • A=0.42
            </Text>
          </group>

          <group position={[0.2, 0, -0.6]}>
            <Box args={[0.28, 0.06, 0.36]} position={[0, 0.03, 0]}>
              <meshStandardMaterial color="#0f172a" metalness={0.8} />
            </Box>
            <Cylinder args={[0.03, 0.04, 0.45, 16]} position={[-0.06, 0.25, -0.08]} rotation={[0.2, 0, 0]}>
              <meshStandardMaterial color="#cbd5e1" metalness={0.9} />
            </Cylinder>
            <Box args={[0.22, 0.02, 0.22]} position={[0, 0.18, 0.02]}>
              <meshStandardMaterial color="#1e293b" roughness={0.2} />
            </Box>
            <Cylinder args={[0.045, 0.045, 0.1, 16]} position={[0, 0.3, 0]}>
              <meshStandardMaterial color="#e2e8f0" metalness={0.95} />
            </Cylinder>
            <Cylinder args={[0.016, 0.016, 0.14, 16]} position={[-0.03, 0.46, -0.04]} rotation={[-0.4, 0, 0]}>
              <meshStandardMaterial color="#0f172a" />
            </Cylinder>
            <Cylinder args={[0.016, 0.016, 0.14, 16]} position={[0.03, 0.46, -0.04]} rotation={[-0.4, 0, 0]}>
              <meshStandardMaterial color="#0f172a" />
            </Cylinder>
          </group>
        </group>

        {/* LARGE FRAMED "CHEMISTRY" POSTER ON WALL ABOVE SIDE COUNTER */}
        <group position={[0.65, 2.4, 0]} rotation={[0, -Math.PI / 2, 0]}>
          <Box args={[2.5, 1.5, 0.05]} position={[0, 0, 0]}>
            <meshStandardMaterial color="#78350f" roughness={0.5} />
          </Box>
          <mesh position={[0, 0, 0.028]}>
            <planeGeometry args={[2.3, 1.3]} />
            <meshStandardMaterial color="#ffffff" roughness={0.2} />
          </mesh>
          <Text position={[0, -0.35, 0.032]} fontSize={0.28} color="#0284c7" anchorX="center">
            CHEMISTRY
          </Text>
          <Text position={[0, 0.3, 0.032]} fontSize={0.10} color="#0f172a" anchorX="center">
            VIRTUAL LABORATORY SIMULATION
          </Text>
        </group>
      </group>

      {/* 3D CHALKBOARD BLACKBOARD MOUNTED ON BACK WALL FOR AIM AND STEPS */}
      <LabWallBlackboard selectedExperiment={selectedExperiment} labMode={labMode} />

      {/* BACK WALL DECOR & PERIODIC TABLE CHART */}
      <group position={[0, -0.5, -3.0]}>
        <PeriodicTableWallChart position={[0, 4.0, 0]} />

        {/* Upper Wall Shelf */}
        <Box args={[5.2, 0.05, 0.4]} position={[0, 1.6, 0.15]}>
          <meshStandardMaterial color="#334155" roughness={0.3} metalness={0.8} />
        </Box>
        {/* Dummy Lab Reagent Bottles & Molecular Models on Wall Shelf */}
        <ShelfReagentBottle position={[-2.1, 1.63, 0.15]} name="CuSO4" color="#ffffff" liquidColor="#0284c7" />
        <ShelfReagentBottle position={[-1.6, 1.63, 0.15]} name="KMnO4" color="#ffffff" liquidColor="#7e22ce" />
        <ShelfReagentBottle position={[-1.1, 1.63, 0.15]} name="K2Cr2O7" color="#ffffff" liquidColor="#ea580c" />
        <ShelfReagentBottle position={[-0.6, 1.63, 0.15]} name="NiCl2" color="#ffffff" liquidColor="#16a34a" />
        <ShelfReagentBottle position={[-0.1, 1.63, 0.15]} name="I2 Sol" color="#ffffff" liquidColor="#a16207" />
        <MolecularModel position={[0.6, 1.74, 0.15]} name="water" />
        <MolecularModel position={[1.3, 1.74, 0.15]} name="methane" />
        <ShelfReagentBottle position={[2.0, 1.63, 0.15]} name="AgNO3" color="#ffffff" liquidColor="#f8fafc" />
      </group>

      {/* Side Walls */}
      <mesh position={[-12, 4.5, 0]} rotation-y={Math.PI / 2} receiveShadow>
        <boxGeometry args={[24, 10, 0.4]} />
        <meshStandardMaterial color="#f8fafc" roughness={0.4} />
      </mesh>
      <mesh position={[12, 4.5, 0]} rotation-y={-Math.PI / 2} receiveShadow>
        <boxGeometry args={[24, 10, 0.4]} />
        <meshStandardMaterial color="#f8fafc" roughness={0.4} />
      </mesh>
      <mesh position={[0, 9.5, 0]} rotation-x={Math.PI / 2}>
        <planeGeometry args={[24, 24]} />
        <meshStandardMaterial color="#f1f5f9" roughness={0.8} />
      </mesh>

      {/* Ceiling Fluorescent Light Strips */}
      <group position={[0, 9.4, 0]}>
        <Box args={[10, 0.05, 0.4]} position={[-3, 0, -2]}>
          <meshBasicMaterial color="#ffffff" />
        </Box>
        <Box args={[10, 0.05, 0.4]} position={[3, 0, -2]}>
          <meshBasicMaterial color="#ffffff" />
        </Box>
      </group>

      {/* THREE SIDE WALL RACKS FOR EXTRA CATALOG SELECTION */}
      <WallRack
        position={[-10.5, 1.2, -1]}
        rotation={[0, Math.PI / 2, 0]}
        title="GLASSWARE SHELF"
        keyHint="[1]"
        color="#0284c7"
        category="glassware"
        onOpenRackMenu={onOpenRackMenu}
      />
      <WallRack
        position={[10.5, 1.2, -1]}
        rotation={[0, -Math.PI / 2, 0]}
        title="CHEMICAL SHELF"
        keyHint="[2]"
        color="#a855f7"
        category="chemicals"
        onOpenRackMenu={onOpenRackMenu}
      />

      {/* MAIN EXPERIMENT WORKBENCH TABLE WITH OVERHEAD REAGENT RACK */}
      <MainWorkbenchTable
        position={[0, 0, 0]}
        selectedExperiment={selectedExperiment}
        tableItems={tableItems}
        selectedTableItemId={selectedTableItemId}
        onSelectTableItem={onSelectTableItem}
        isHeating={isHeating}
        pourState={pourState}
      />

      {/* Photorealistic Lighting Setup */}
      <ambientLight intensity={0.55} color="#ffffff" />
      <hemisphereLight args={['#f8fafc', '#94a3b8', 0.5]} />
      <directionalLight position={[5, 12, 6]} intensity={1.5} />
      {/* Warm pendant light over the central workbench so glass pops */}
      <pointLight position={[0, 3.0, 0.25]} intensity={1.2} color="#fff7ed" distance={7} />
      <pointLight position={[0, 4, 0]} intensity={0.5} color="#f8fafc" distance={9} />

      {/* Offline environment map (PMREM) for subtle steel/glass reflections */}
      <Environment resolution={64} frames={1}>
        <Lightformer intensity={1.2} color="#e0f2fe" position={[0, 5, -9]} scale={[7, 3, 1]} />
        <Lightformer intensity={0.7} color="#bae6fd" position={[-6, 3, -2]} rotation={[0, Math.PI / 2, 0]} scale={[4, 2, 1]} />
        <Lightformer intensity={0.7} color="#fde68a" position={[6, 3, 3]} rotation={[0, -Math.PI / 2, 0]} scale={[4, 2, 1]} />
        <Lightformer intensity={0.3} color="#cffafe" position={[0, 8, 0]} rotation-x={Math.PI / 2} scale={[3, 10, 1]} />
      </Environment>
    </group>
  );
}

// Side Wall Rack
function WallRack({
  position,
  rotation,
  title,
  keyHint,
  color,
  category,
  onOpenRackMenu,
}: {
  position: [number, number, number];
  rotation: [number, number, number];
  title: string;
  keyHint: string;
  color: string;
  category: 'glassware' | 'chemicals' | 'equipment';
  onOpenRackMenu: (cat: 'glassware' | 'chemicals' | 'equipment') => void;
}) {
  const [hovered, setHovered] = useState(false);

  return (
    <group
      position={position}
      rotation={rotation as any}
      onClick={() => onOpenRackMenu(category)}
      onPointerOver={() => setHovered(true)}
      onPointerOut={() => setHovered(false)}
    >
      <Box args={[4.5, 4.5, 0.8]} position={[0, 2.5, 0]} castShadow>
        <meshStandardMaterial color="#334155" roughness={0.3} metalness={0.7} />
      </Box>
      <Box args={[4.3, 0.08, 0.7]} position={[0, 1.5, 0]}>
        <meshStandardMaterial color="#64748b" metalness={0.9} />
      </Box>
      <Box args={[4.3, 0.08, 0.7]} position={[0, 3.0, 0]}>
        <meshStandardMaterial color="#64748b" metalness={0.9} />
      </Box>

      {/* Header Label */}
      <group position={[0, 5.0, 0.45]}>
        <mesh>
          <boxGeometry args={[3.8, 0.6, 0.08]} />
          <meshStandardMaterial color={hovered ? '#0284c7' : '#0f172a'} />
        </mesh>
        <Text position={[0, 0.08, 0.05]} fontSize={0.2} color={color} anchorX="center">
          {title} {keyHint}
        </Text>
        <Text position={[0, -0.12, 0.05]} fontSize={0.12} color="#94a3b8" anchorX="center">
          CLICK TO OPEN CATALOG
        </Text>
      </group>
    </group>
  );
}

// MAIN EXPERIMENT WORKBENCH TABLE WITH INTEGRATED TABLETOP RACK
function MainWorkbenchTable({
  position,
  selectedExperiment,
  tableItems,
  selectedTableItemId,
  onSelectTableItem,
  isHeating,
  pourState,
}: {
  position: [number, number, number];
  selectedExperiment: Experiment | null;
  tableItems: TableItem[];
  selectedTableItemId: string | null;
  onSelectTableItem: (id: string | null) => void;
  isHeating: boolean;
  pourState?: {
    sourceId: string;
    targetId: string;
    progress: number;
  } | null;
}) {
  const sourceItem = tableItems.find((i) => i.instanceId === pourState?.sourceId);
  const targetItem = tableItems.find((i) => i.instanceId === pourState?.targetId);

  return (
    <group position={position}>
      {/* Sleek Modern Light-Grey Lab Desk */}
      <Box args={[6.2, 0.22, 2.4]} position={[0, 0.9, 0]} castShadow receiveShadow>
        <meshStandardMaterial color="#e2e8f0" roughness={0.2} metalness={0.1} />
      </Box>
      {/* Desk Metallic Bezel Frame */}
      <Box args={[6.25, 0.07, 2.45]} position={[0, 0.79, 0]}>
        <meshStandardMaterial color="#0284c7" metalness={0.8} />
      </Box>

      {/* Heavy Steel Desk Legs */}
      <Box args={[0.18, 0.9, 0.18]} position={[-2.9, 0.45, -1.0]}>
        <meshStandardMaterial color="#64748b" metalness={0.9} />
      </Box>
      <Box args={[0.18, 0.9, 0.18]} position={[2.9, 0.45, -1.0]}>
        <meshStandardMaterial color="#64748b" metalness={0.9} />
      </Box>
      <Box args={[0.18, 0.9, 0.18]} position={[-2.9, 0.45, 1.0]}>
        <meshStandardMaterial color="#64748b" metalness={0.9} />
      </Box>
      <Box args={[0.18, 0.9, 0.18]} position={[2.9, 0.45, 1.0]}>
        <meshStandardMaterial color="#64748b" metalness={0.9} />
      </Box>

      {/* DYNAMIC 3D POURING ANIMATION STREAM */}
      {pourState && sourceItem && targetItem && (
        <PouringStreamEffect
          sourcePos={[sourceItem.position[0], 1.05, sourceItem.position[2] + 0.35]}
          targetPos={[targetItem.position[0], 1.05, targetItem.position[2] + 0.35]}
          progress={pourState.progress}
          color={sourceItem.contents?.color || '#38bdf8'}
        />
      )}

      {/* RENDER PLACED WORKSTATION ITEMS (LARGER & MORE DETAILED) */}
      {tableItems.map((item) => {
        const isSelected = selectedTableItemId === item.instanceId;
        const isSourcePouring = pourState?.sourceId === item.instanceId;
        const isTargetPouring = pourState?.targetId === item.instanceId;

        let xPos = item.position[0];
        let yPos = 1.01;
        let zPos = item.position[2] + 0.35;
        let rotZ = 0;

        // Animate source item lifting and tilting towards target during pour
        if (isSourcePouring && pourState && targetItem) {
          const tx = targetItem.position[0];
          const tz = targetItem.position[2] + 0.35;
          const p = pourState.progress;

          // Lift up and move towards target spout
          xPos = xPos + (tx - 0.35 - xPos) * p;
          yPos = 1.01 + Math.sin(p * Math.PI) * 0.6;
          zPos = zPos + (tz - zPos) * p;

          // Tilt beaker 65 degrees over target spout mid-way
          rotZ = -1.1 * Math.sin(p * Math.PI);
        }

        const heatActive = isHeating && isSelected;

        return (
          <group key={item.instanceId}>
            {/* Cheap soft contact shadow on the desk surface */}
            <BlobShadow
              position={[item.position[0], 1.0105, item.position[2] + 0.35]}
              size={item.type === 'test-tube' ? 0.55 : 0.85}
              opacity={item.category === 'glassware' ? 0.3 : 0.38}
            />

            <group position={[xPos, yPos, zPos]} rotation-z={rotZ}>
              {isSelected && (
                <Cylinder args={[0.32, 0.32, 0.01, 32]} position={[0, -0.01, 0]}>
                  <meshBasicMaterial color="#38bdf8" transparent opacity={0.6} />
                </Cylinder>
              )}

              <group onClick={() => onSelectTableItem(isSelected ? null : item.instanceId)}>
                {item.catalogId === 'flask' ? (
                  <RenderFlask
                    item={item}
                    isHeating={heatActive}
                    isBubbling={isTargetPouring || heatActive}
                    temperature={item.contents?.temperature ?? 22}
                  />
                ) : item.catalogId === 'test-tube' ? (
                  <RenderTestTube
                    item={item}
                    isHeating={heatActive}
                    isBubbling={isTargetPouring || heatActive}
                    temperature={item.contents?.temperature ?? 22}
                  />
                ) : item.catalogId === 'burette' ? (
                  <RenderBurette
                    item={item}
                    isHeating={heatActive}
                    isBubbling={isTargetPouring || heatActive}
                    temperature={item.contents?.temperature ?? 22}
                  />
                ) : item.catalogId === 'cylinder' ? (
                  <RenderCylinder
                    item={item}
                    isHeating={heatActive}
                    isBubbling={isTargetPouring || heatActive}
                    temperature={item.contents?.temperature ?? 22}
                  />
                ) : item.catalogId === 'dropper' ? (
                  <RenderDropper
                    item={item}
                    isHeating={heatActive}
                    isBubbling={isTargetPouring || heatActive}
                    temperature={item.contents?.temperature ?? 22}
                  />
                ) : item.catalogId === 'thermometer' ? (
                  <RenderThermometer item={item} />
                ) : item.catalogId === 'tripod' ? (
                  <RenderTripod />
                ) : item.catalogId === 'burner' ? (
                  <RenderBunsenBurner isHeating={isHeating} />
                ) : (
                  <RenderBeaker
                    item={item}
                    isHeating={heatActive}
                    isBubbling={isTargetPouring || heatActive}
                    temperature={item.contents?.temperature ?? 22}
                  />
                )}
              </group>
            </group>
          </group>
        );
      })}
    </group>
  );
}

// 3D ANIMATED POURING STREAM EFFECT WITH DYNAMIC FLUID ARC & SPLASH RIPPLES
function PouringStreamEffect({
  sourcePos,
  targetPos,
  progress,
  color,
}: {
  sourcePos: [number, number, number];
  targetPos: [number, number, number];
  progress: number;
  color: string;
}) {
  const isPouringActive = progress > 0.10 && progress < 0.90;
  if (!isPouringActive) return null;

  const startX = sourcePos[0];
  const startY = sourcePos[1] + 0.25;
  const startZ = sourcePos[2];

  const endX = targetPos[0];
  const endY = targetPos[1] + 0.15;
  const endZ = targetPos[2];

  const midX = (startX + endX) / 2;
  const midY = Math.max(startY, endY) + 0.15;
  const midZ = (startZ + endZ) / 2;

  const streamHeight = Math.sqrt(Math.pow(endX - startX, 2) + Math.pow(endY - startY, 2) + Math.pow(endZ - startZ, 2));

  return (
    <group position={[midX, midY, midZ]}>
      {/* Curved Glowing Liquid Jet */}
      <Cylinder args={[0.035, 0.02, streamHeight, 16]}>
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={0.6}
          roughness={0.1}
          transparent
          opacity={0.95}
        />
      </Cylinder>

      {/* Dynamic Animated Splash Droplets at Target Opening */}
      <Float speed={20} floatIntensity={1.2}>
        <Sphere args={[0.07, 16, 16]} position={[0, -streamHeight / 2, 0]}>
          <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.8} />
        </Sphere>
        <Sphere args={[0.04, 12, 12]} position={[0.05, -streamHeight / 2 + 0.06, 0.04]}>
          <meshStandardMaterial color="#ffffff" transparent opacity={0.9} />
        </Sphere>
        <Sphere args={[0.04, 12, 12]} position={[-0.05, -streamHeight / 2 + 0.08, -0.04]}>
          <meshStandardMaterial color={color} transparent opacity={0.8} />
        </Sphere>
      </Float>
    </group>
  );
}

// Shelf Reagent Bottle
function ShelfReagentBottle({
  position,
  name,
  color,
  liquidColor,
}: {
  position: [number, number, number];
  name: string;
  color: string;
  liquidColor: string;
}) {
  return (
    <group position={position}>
      <Cylinder args={[0.16, 0.16, 0.45, 32]} position={[0, 0.22, 0]}>
        <meshStandardMaterial color="#ffffff" roughness={0.1} transparent opacity={0.65} />
      </Cylinder>
      <Cylinder args={[0.14, 0.14, 0.26, 32]} position={[0, 0.15, 0]}>
        <meshStandardMaterial color={liquidColor} roughness={0.2} transparent opacity={0.9} />
      </Cylinder>
      <Cylinder args={[0.08, 0.08, 0.12, 32]} position={[0, 0.48, 0]}>
        <meshStandardMaterial color="#0f172a" roughness={0.3} />
      </Cylinder>
      <group position={[0, 0.22, 0.165]}>
        <mesh>
          <planeGeometry args={[0.2, 0.125]} />
          <meshStandardMaterial color="#0f172a" />
        </mesh>
        <mesh>
          <planeGeometry args={[0.18, 0.105]} />
          <meshStandardMaterial color="#ffffff" />
        </mesh>
        <Text position={[0, 0, 0.011]} fontSize={0.064} color="#000000" anchorX="center" fontWeight="bold">
          {name}
        </Text>
      </group>
    </group>
  );
}

// Dropper Indicator Bottle
function DropperBottle({
  position,
  name,
  color,
  tagColor,
}: {
  position: [number, number, number];
  name: string;
  color: string;
  tagColor: string;
}) {
  return (
    <group position={position}>
      <Cylinder args={[0.08, 0.08, 0.28, 32]} position={[0, 0.14, 0]}>
        <meshStandardMaterial color={color} roughness={0.3} />
      </Cylinder>
      <Cylinder args={[0.03, 0.03, 0.12, 32]} position={[0, 0.34, 0]}>
        <meshStandardMaterial color="#38bdf8" />
      </Cylinder>
      <group position={[0, 0.52, 0]}>
        <mesh>
          <boxGeometry args={[0.4, 0.1, 0.02]} />
          <meshStandardMaterial color="#0284c7" />
        </mesh>
        <Text position={[0, 0, 0.025]} fontSize={0.058} color="#ffffff" anchorX="center" anchorY="middle" fontWeight="bold">
          {name}
        </Text>
      </group>
    </group>
  );
}

// Magnetic Heating Stirrer Plate
function MagneticStirrer({
  position,
  label,
  isHeating,
}: {
  position: [number, number, number];
  label: string;
  isHeating: boolean;
}) {
  return (
    <group position={position}>
      <Box args={[0.95, 0.12, 0.95]} position={[0, 0.06, 0]}>
        <meshStandardMaterial color="#f8fafc" roughness={0.2} />
      </Box>
      <Cylinder args={[0.38, 0.38, 0.03, 32]} position={[0, 0.13, 0]}>
        <meshStandardMaterial color={isHeating ? '#ef4444' : '#1e293b'} roughness={0.2} />
      </Cylinder>
      <Box args={[0.95, 0.08, 0.03]} position={[0, 0.06, 0.48]}>
        <meshStandardMaterial color="#0284c7" emissive={isHeating ? '#ef4444' : '#0284c7'} emissiveIntensity={0.8} />
      </Box>
      <Text position={[0, 0.06, 0.5]} fontSize={0.05} color="#ffffff">
        {label}: {isHeating ? '85.0 °C' : '25.0 °C'}
      </Text>
    </group>
  );
}

// PERIODIC TABLE WALL POSTER FOR CHEMISTRY LAB ATMOSPHERE
function PeriodicTableWallChart({ position }: { position: [number, number, number] }) {
  const elements = [
    { symbol: 'H', name: 'Hydrogen', color: '#fef08a', pos: [0, 6] },
    { symbol: 'He', name: 'Helium', color: '#e9d5ff', pos: [17, 6] },
    { symbol: 'Li', name: 'Lithium', color: '#fef08a', pos: [0, 5] },
    { symbol: 'Be', name: 'Beryllium', color: '#fed7aa', pos: [1, 5] },
    { symbol: 'B', name: 'Boron', color: '#bbf7d0', pos: [12, 5] },
    { symbol: 'C', name: 'Carbon', color: '#bbf7d0', pos: [13, 5] },
    { symbol: 'N', name: 'Nitrogen', color: '#bbf7d0', pos: [14, 5] },
    { symbol: 'O', name: 'Oxygen', color: '#bbf7d0', pos: [15, 5] },
    { symbol: 'F', name: 'Fluorine', color: '#bbf7d0', pos: [16, 5] },
    { symbol: 'Ne', name: 'Neon', color: '#e9d5ff', pos: [17, 5] },
    { symbol: 'Na', name: 'Sodium', color: '#fef08a', pos: [0, 4] },
    { symbol: 'Mg', name: 'Magnesium', color: '#fed7aa', pos: [1, 4] },
    { symbol: 'Al', name: 'Aluminum', color: '#cbd5e1', pos: [12, 4] },
    { symbol: 'Si', name: 'Silicon', color: '#bbf7d0', pos: [13, 4] },
    { symbol: 'P', name: 'Phosphorus', color: '#bbf7d0', pos: [14, 4] },
    { symbol: 'S', name: 'Sulfur', color: '#bbf7d0', pos: [15, 4] },
    { symbol: 'Cl', name: 'Chlorine', color: '#bbf7d0', pos: [16, 4] },
    { symbol: 'Ar', name: 'Argon', color: '#e9d5ff', pos: [17, 4] },
    { symbol: 'K', name: 'Potassium', color: '#fef08a', pos: [0, 3] },
    { symbol: 'Ca', name: 'Calcium', color: '#fed7aa', pos: [1, 3] },
    { symbol: 'Fe', name: 'Iron', color: '#bae6fd', pos: [7, 3] },
    { symbol: 'Cu', name: 'Copper', color: '#bae6fd', pos: [10, 3] },
    { symbol: 'Zn', name: 'Zinc', color: '#bae6fd', pos: [11, 3] },
    { symbol: 'Ag', name: 'Silver', color: '#bae6fd', pos: [10, 2] },
    { symbol: 'Au', name: 'Gold', color: '#bae6fd', pos: [10, 1] },
    { symbol: 'Pb', name: 'Lead', color: '#cbd5e1', pos: [13, 1] },
  ];

  return (
    <group position={position}>
      <Box args={[6.8, 3.4, 0.08]} position={[0, 0, 0]}>
        <meshStandardMaterial color="#78350f" roughness={0.6} />
      </Box>
      <mesh position={[0, 0, 0.045]}>
        <planeGeometry args={[6.6, 3.2]} />
        <meshStandardMaterial color="#ffffff" roughness={0.1} />
      </mesh>
      <Text position={[0, 1.3, 0.05]} fontSize={0.24} color="#0284c7" anchorX="center">
        PERIODIC TABLE OF THE ELEMENTS
      </Text>
      {elements.map((el, i) => {
        const x = -3.0 + el.pos[0] * 0.35;
        const y = -1.1 + el.pos[1] * 0.35;
        return (
          <group key={i} position={[x, y, 0.052]}>
            <mesh>
              <planeGeometry args={[0.32, 0.32]} />
              <meshBasicMaterial color={el.color} />
            </mesh>
            <Text position={[0, 0.02, 0.01]} fontSize={0.11} color="#0f172a" anchorX="center">
              {el.symbol}
            </Text>
            <Text position={[0, -0.1, 0.01]} fontSize={0.045} color="#475569" anchorX="center">
              {el.name}
            </Text>
          </group>
        );
      })}
    </group>
  );
}

// 3D BALL-AND-STICK MOLECULAR MODEL FOR WALL SHELVES
function MolecularModel({ position, name }: { position: [number, number, number]; name: string }) {
  return (
    <group position={position}>
      {name === 'water' ? (
        <group>
          <Sphere args={[0.1, 16, 16]} position={[0, 0, 0]}>
            <meshStandardMaterial color="#ef4444" />
          </Sphere>
          <Cylinder args={[0.015, 0.015, 0.16, 8]} position={[-0.08, 0.08, 0]} rotation={[0, 0, -0.6]}>
            <meshStandardMaterial color="#cbd5e1" />
          </Cylinder>
          <Cylinder args={[0.015, 0.015, 0.16, 8]} position={[0.08, 0.08, 0]} rotation={[0, 0, 0.6]}>
            <meshStandardMaterial color="#cbd5e1" />
          </Cylinder>
          <Sphere args={[0.05, 16, 16]} position={[-0.14, 0.14, 0]}>
            <meshStandardMaterial color="#ffffff" />
          </Sphere>
          <Sphere args={[0.05, 16, 16]} position={[0.14, 0.14, 0]}>
            <meshStandardMaterial color="#ffffff" />
          </Sphere>
        </group>
      ) : (
        <group>
          <Sphere args={[0.11, 16, 16]} position={[0, 0, 0]}>
            <meshStandardMaterial color="#334155" />
          </Sphere>
          {[-0.1, 0.1].map((dx, i) =>
            [-0.1, 0.1].map((dy, j) => (
              <Sphere key={`${i}-${j}`} args={[0.05, 16, 16]} position={[dx, dy, i === j ? 0.08 : -0.08]}>
                <meshStandardMaterial color="#ffffff" />
              </Sphere>
            ))
          )}
        </group>
      )}
    </group>
  );
}

// REALISTIC 3D FIZZING BUBBLES PARTICLE SYSTEM INSIDE LIQUID
function FizzingBubblesSystem({
  color,
  active,
  height = 0.28,
  radius = 0.16,
}: {
  color: string;
  active: boolean;
  height?: number;
  radius?: number;
}) {
  const count = 30;
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const dummy = useRef(new THREE.Object3D());
  const particles = useRef<
    { x: number; y: number; z: number; speed: number; scale: number; baseRadius: number; phase: number }[]
  >([]);

  useEffect(() => {
    particles.current = Array.from({ length: count }, () => ({
      x: (Math.random() - 0.5) * radius * 1.4,
      y: Math.random() * height,
      z: (Math.random() - 0.5) * radius * 1.4,
      speed: 0.18 + Math.random() * 0.35,
      scale: 0.007 + Math.random() * 0.014,
      baseRadius: radius,
      phase: Math.random() * Math.PI * 2,
    }));
  }, [height, radius]);

  useFrame((_, delta) => {
    if (!meshRef.current || !active) return;

    particles.current.forEach((p, i) => {
      p.y += p.speed * delta;
      if (p.y > height) {
        p.y = 0;
        p.x = (Math.random() - 0.5) * radius * 1.4;
        p.z = (Math.random() - 0.5) * radius * 1.4;
      }
      p.phase += delta * 5;
      const wobbleX = Math.sin(p.phase) * 0.012;
      const wobbleZ = Math.cos(p.phase) * 0.012;

      dummy.current.position.set(p.x + wobbleX, p.y, p.z + wobbleZ);
      const pulse = p.scale * (0.85 + 0.35 * Math.sin(p.y * 12));
      dummy.current.scale.set(pulse, pulse, pulse);
      dummy.current.updateMatrix();

      meshRef.current!.setMatrixAt(i, dummy.current.matrix);
    });
    meshRef.current.instanceMatrix.needsUpdate = true;
  });

  if (!active) return null;

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, count]} position={[0, 0, 0]}>
      <sphereGeometry args={[1, 12, 12]} />
      <meshStandardMaterial
        color="#ffffff"
        emissive={color}
        emissiveIntensity={0.8}
        roughness={0.1}
        transparent
        opacity={0.8}
      />
    </instancedMesh>
  );
}

// REALISTIC 3D RISING SMOKE / STEAM / FUMES PARTICLE SYSTEM
function SmokeFumesSystem({
  active,
  color = '#ffffff',
  height = 0.45,
}: {
  active: boolean;
  color?: string;
  height?: number;
}) {
  const count = 24;
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const dummy = useRef(new THREE.Object3D());
  const particles = useRef<
    {
      x: number;
      y: number;
      z: number;
      vx: number;
      vy: number;
      vz: number;
      life: number;
      maxLife: number;
      scale: number;
    }[]
  >([]);

  useEffect(() => {
    particles.current = Array.from({ length: count }, () => ({
      x: (Math.random() - 0.5) * 0.08,
      y: Math.random() * 0.1,
      z: (Math.random() - 0.5) * 0.08,
      vx: (Math.random() - 0.5) * 0.06,
      vy: 0.18 + Math.random() * 0.28,
      vz: (Math.random() - 0.5) * 0.06,
      life: Math.random(),
      maxLife: 1.1 + Math.random() * 0.9,
      scale: 0.02 + Math.random() * 0.035,
    }));
  }, []);

  useFrame((_, delta) => {
    if (!meshRef.current || !active) return;

    particles.current.forEach((p, i) => {
      p.life += delta;
      if (p.life > p.maxLife) {
        p.life = 0;
        p.x = (Math.random() - 0.5) * 0.08;
        p.y = 0;
        p.z = (Math.random() - 0.5) * 0.08;
        p.vx = (Math.random() - 0.5) * 0.05;
        p.vy = 0.2 + Math.random() * 0.3;
        p.vz = (Math.random() - 0.5) * 0.05;
      }

      p.x += p.vx * delta;
      p.y += p.vy * delta;
      p.z += p.vz * delta;

      const progress = p.life / p.maxLife;
      const curScale = p.scale * (1 + progress * 2.8);

      dummy.current.position.set(p.x, p.y, p.z);
      dummy.current.scale.set(curScale, curScale, curScale);
      dummy.current.updateMatrix();

      meshRef.current!.setMatrixAt(i, dummy.current.matrix);
    });

    meshRef.current.instanceMatrix.needsUpdate = true;
  });

  if (!active) return null;

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, count]} position={[0, height, 0]}>
      <sphereGeometry args={[1, 12, 12]} />
      <meshStandardMaterial
        color={color}
        emissive={color}
        emissiveIntensity={0.25}
        roughness={0.95}
        transparent
        opacity={0.35}
      />
    </instancedMesh>
  );
}

// GELATINOUS PRECIPITATE SEDIMENT that settles at the bottom of a reacting liquid
function PrecipitateLayer({
  color = '#bfdbfe',
  radius = 0.17,
  y = 0.02,
  height = 0.05,
}: {
  color?: string;
  radius?: number;
  y?: number;
  height?: number;
}) {
  return (
    <group>
      <Cylinder args={[radius, radius * 1.08, height, 24]} position={[0, y, 0]}>
        <meshStandardMaterial color={color} roughness={0.9} transparent opacity={0.85} />
      </Cylinder>
      <Cylinder args={[radius * 0.55, radius * 0.68, height * 0.45, 20]} position={[0, y + height * 0.28, 0]}>
        <meshStandardMaterial color={color} roughness={0.95} transparent opacity={0.45} />
      </Cylinder>
    </group>
  );
}

// SUBTLE LIQUID MENISCUS — gently curved surface of a real liquid in glassware
function LiquidMeniscus({ color, radius, y }: { color: string; radius: number; y: number }) {
  return (
    <Sphere args={[radius, 24, 12]} position={[0, y, 0]} scale={[1, 0.09, 1]}>
      <meshStandardMaterial color={color} roughness={0.05} transparent opacity={0.9} />
    </Sphere>
  );
}

// REALISTIC PROPORTIONATED GLASSWARE RENDER FUNCTIONS
function RenderBeaker({
  item,
  isHeating,
  isBubbling,
  temperature = 22,
}: {
  item: TableItem;
  isHeating: boolean;
  isBubbling?: boolean;
  temperature?: number;
}) {
  const liquidColor = item.contents?.color || '#38bdf8';
  const hasLiquid = (item.contents?.chemicals?.length ?? 0) > 0;
  const isReacting = isHeating || isBubbling || temperature >= 100 || Boolean(item.contents?.gasEvolved);
  const fill = hasLiquid ? fillPercent(item) : 0;

  // Liquid column scales with the volume inside (max fill = 0.30 tall).
  const liqMax = 0.30;
  const liqBottom = 0.03;
  const liqHeight = hasLiquid ? Math.max(0.02, liqMax * Math.min(1, fill)) : 0;
  const liqCenter = liqBottom + liqHeight / 2;
  const liqTop = liqBottom + liqHeight;

  return (
    <group>
      {/* Outer Clear Glass Beaker Body */}
      <Cylinder args={[0.22, 0.20, 0.46, 32]} position={[0, 0.23, 0]}>
        <meshPhysicalMaterial
          color="#ffffff"
          roughness={0.05}
          clearcoat={0.7}
          clearcoatRoughness={0.12}
          transparent
          opacity={0.45}
        />
      </Cylinder>

      {/* Top Glass Lip Rim */}
      <Cylinder args={[0.24, 0.22, 0.03, 32]} position={[0, 0.46, 0]}>
        <meshPhysicalMaterial
          color="#ffffff"
          roughness={0.05}
          clearcoat={0.7}
          clearcoatRoughness={0.1}
          transparent
          opacity={0.75}
        />
      </Cylinder>

      {/* Pouring Spout on the rim */}
      <Cylinder args={[0.05, 0.035, 0.07, 16]} position={[0.155, 0.455, 0]} rotation-z={-0.5}>
        <meshPhysicalMaterial color="#ffffff" roughness={0.05} clearcoat={0.7} transparent opacity={0.6} />
      </Cylinder>

      {/* Vertical glass highlight (specular streak) */}
      <Box args={[0.035, 0.4, 0.006]} position={[-0.1, 0.22, 0.2]}>
        <meshBasicMaterial color="#ffffff" transparent opacity={0.18} />
      </Box>

      {/* Graduation Markings on Front Glass Face */}
      {[-0.12, -0.04, 0.04, 0.12].map((y, idx) => (
        <group key={idx} position={[0, 0.23 + y, 0.21]}>
          <Box args={[0.08, 0.005, 0.01]}>
            <meshBasicMaterial color="#ffffff" />
          </Box>
        </group>
      ))}

      {/* Labeled Chemical Paper Badge on Front Glass Face */}
      <group position={[0, 0.28, 0.215]}>
        <Box args={[0.28, 0.15, 0.012]}>
          <meshStandardMaterial color="#0f172a" roughness={0.3} />
        </Box>
        <Box args={[0.26, 0.13, 0.013]}>
          <meshStandardMaterial color="#ffffff" roughness={0.2} />
        </Box>
        <Text
          position={[0, 0, 0.015]}
          fontSize={0.045}
          color="#0f172a"
          anchorX="center"
          anchorY="middle"
          fontWeight="bold"
          maxWidth={0.24}
          textAlign="center"
        >
          {item.name.replace(' Beaker', '')}
        </Text>
      </group>

      {/* Realistic Liquid Volume inside Beaker */}
      {hasLiquid && liqHeight > 0 && (
        <group>
          <Cylinder args={[0.19, 0.18, liqHeight, 32]} position={[0, liqCenter, 0]}>
            <meshStandardMaterial
              color={liquidColor}
              emissive={liquidColor}
              emissiveIntensity={0.35}
              roughness={0.1}
              transparent
              opacity={0.92}
            />
          </Cylinder>
          <Cylinder args={[0.19, 0.19, 0.01, 32]} position={[0, liqTop, 0]}>
            <meshStandardMaterial color="#ffffff" transparent opacity={0.5} />
          </Cylinder>

          {/* Curved liquid meniscus surface */}
          <LiquidMeniscus color={liquidColor} radius={0.19} y={liqTop - 0.002} />

          {/* Precipitate sediment settled at the bottom */}
          {item.contents?.precipitate && <PrecipitateLayer color="#bfdbfe" radius={0.16} y={0.045} height={0.05} />}

          {/* 3D Fizzing Bubbles inside liquid during reaction/heating */}
          <FizzingBubblesSystem color={liquidColor} active={isReacting} height={Math.max(0.05, liqHeight * 0.85)} radius={0.16} />
        </group>
      )}

      {/* 3D Smoke & Gas Fumes rising from beaker top */}
      <SmokeFumesSystem active={isReacting} color="#f8fafc" height={0.46} />
    </group>
  );
}

function RenderFlask({
  item,
  isHeating,
  isBubbling,
  temperature = 22,
}: {
  item: TableItem;
  isHeating: boolean;
  isBubbling?: boolean;
  temperature?: number;
}) {
  const liquidColor = item.contents?.color || '#38bdf8';
  const hasLiquid = (item.contents?.chemicals?.length ?? 0) > 0;
  const isReacting = isHeating || isBubbling || temperature >= 100 || Boolean(item.contents?.gasEvolved);
  const fill = hasLiquid ? fillPercent(item) : 0;
  const liqRadius = 0.22 * (0.45 + 0.55 * Math.min(1, fill));

  return (
    <group>
      {/* Erlenmeyer Flask Neck */}
      <Cylinder args={[0.07, 0.07, 0.32, 32]} position={[0, 0.36, 0]}>
        <meshPhysicalMaterial color="#ffffff" roughness={0.05} clearcoat={0.7} transparent opacity={0.55} />
      </Cylinder>

      {/* Flask Neck Rim */}
      <Cylinder args={[0.078, 0.078, 0.025, 32]} position={[0, 0.525, 0]}>
        <meshPhysicalMaterial color="#ffffff" roughness={0.05} clearcoat={0.7} transparent opacity={0.8} />
      </Cylinder>

      {/* Flask Body Sphere/Cone */}
      <Sphere args={[0.25, 32, 32]} position={[0, 0.14, 0]}>
        <meshPhysicalMaterial color="#ffffff" roughness={0.05} clearcoat={0.7} transparent opacity={0.55} />
      </Sphere>

      {/* Liquid Mesh inside Flask (scales with volume) */}
      {hasLiquid && liqRadius > 0.02 && (
        <group position={[0, 0.12, 0]}>
          <Sphere args={[liqRadius, 32, 32]}>
            <meshStandardMaterial
              color={liquidColor}
              emissive={liquidColor}
              emissiveIntensity={0.35}
              roughness={0.1}
              transparent
              opacity={0.92}
            />
          </Sphere>
          {item.contents?.precipitate && <PrecipitateLayer color="#bfdbfe" radius={liqRadius * 0.8} y={-0.1} height={0.08} />}
          <FizzingBubblesSystem color={liquidColor} active={isReacting} height={liqRadius * 1.15} radius={liqRadius * 0.8} />
        </group>
      )}

      {/* Smoke fumes rising out of flask neck */}
      <SmokeFumesSystem active={isReacting} color="#f8fafc" height={0.52} />
    </group>
  );
}

function RenderTestTube({
  item,
  isHeating,
  isBubbling,
  temperature = 22,
}: {
  item: TableItem;
  isHeating: boolean;
  isBubbling?: boolean;
  temperature?: number;
}) {
  const liquidColor = item.contents?.color || '#38bdf8';
  const hasLiquid = (item.contents?.chemicals?.length ?? 0) > 0;
  const isReacting = isHeating || isBubbling || temperature >= 100 || Boolean(item.contents?.gasEvolved);
  const fill = hasLiquid ? fillPercent(item) : 0;

  const liqMax = 0.24;
  const liqBottom = 0.08;
  const liqHeight = hasLiquid ? Math.max(0.02, liqMax * Math.min(1, fill)) : 0;
  const liqCenter = liqBottom + liqHeight / 2;
  const liqTop = liqBottom + liqHeight;

  return (
    <group>
      {/* Wooden Test Tube Stand */}
      <Box args={[0.22, 0.03, 0.22]} position={[0, 0.015, 0]}>
        <meshStandardMaterial color="#b45309" roughness={0.6} />
      </Box>
      <Box args={[0.02, 0.45, 0.02]} position={[-0.09, 0.22, 0]}>
        <meshStandardMaterial color="#b45309" roughness={0.6} />
      </Box>
      <Box args={[0.02, 0.45, 0.02]} position={[0.09, 0.22, 0]}>
        <meshStandardMaterial color="#b45309" roughness={0.6} />
      </Box>

      {/* Test Tube Glass */}
      <Cylinder args={[0.055, 0.055, 0.42, 32]} position={[0, 0.25, 0]}>
        <meshPhysicalMaterial color="#ffffff" roughness={0.05} clearcoat={0.7} transparent opacity={0.6} />
      </Cylinder>

      {/* Rolled glass rim at the tube mouth */}
      <Cylinder args={[0.06, 0.06, 0.02, 24]} position={[0, 0.465, 0]}>
        <meshPhysicalMaterial color="#ffffff" roughness={0.05} clearcoat={0.7} transparent opacity={0.85} />
      </Cylinder>

      {hasLiquid && liqHeight > 0 && (
        <group>
          <Cylinder args={[0.048, 0.048, liqHeight, 32]} position={[0, liqCenter, 0]}>
            <meshStandardMaterial
              color={liquidColor}
              emissive={liquidColor}
              emissiveIntensity={0.35}
              transparent
              opacity={0.92}
            />
          </Cylinder>
          <Cylinder args={[0.048, 0.048, 0.01, 32]} position={[0, liqTop, 0]}>
            <meshStandardMaterial color="#ffffff" transparent opacity={0.5} />
          </Cylinder>

          <LiquidMeniscus color={liquidColor} radius={0.048} y={liqTop - 0.002} />

          {item.contents?.precipitate && <PrecipitateLayer color="#bfdbfe" radius={0.04} y={liqBottom + 0.015} height={0.04} />}

          <FizzingBubblesSystem color={liquidColor} active={isReacting} height={Math.max(0.04, liqHeight * 0.85)} radius={0.04} />
        </group>
      )}

      <SmokeFumesSystem active={isReacting} color={liquidColor} height={0.46} />
    </group>
  );
}

function RenderChemicalBottle({ item }: { item: TableItem }) {
  const bottleColor = item.contents?.color || '#3b82f6';

  return (
    <group>
      <Cylinder args={[0.14, 0.14, 0.36, 32]} position={[0, 0.18, 0]}>
        <meshStandardMaterial color={bottleColor} roughness={0.2} />
      </Cylinder>
      <Cylinder args={[0.06, 0.06, 0.10, 32]} position={[0, 0.38, 0]}>
        <meshStandardMaterial color="#0f172a" />
      </Cylinder>
      <group position={[0, 0.18, 0.143]}>
        <mesh>
          <planeGeometry args={[0.26, 0.15]} />
          <meshStandardMaterial color="#0f172a" />
        </mesh>
        <mesh>
          <planeGeometry args={[0.24, 0.13]} />
          <meshStandardMaterial color="#ffffff" />
        </mesh>
        <Text
          position={[0, 0, 0.005]}
          fontSize={0.045}
          color="#0f172a"
          anchorX="center"
          anchorY="middle"
          fontWeight="bold"
          maxWidth={0.22}
          textAlign="center"
        >
          {item.name}
        </Text>
      </group>
    </group>
  );
}

function RenderBunsenBurner({ isHeating }: { isHeating: boolean }) {
  return (
    <group>
      {/* Heavy Iron Base */}
      <Cylinder args={[0.18, 0.20, 0.05, 32]} position={[0, 0.025, 0]}>
        <meshStandardMaterial color="#1e293b" metalness={0.9} />
      </Cylinder>
      {/* Metallic Brass Burner Barrel Tube */}
      <Cylinder args={[0.04, 0.04, 0.38, 32]} position={[0, 0.22, 0]}>
        <meshStandardMaterial color="#cbd5e1" metalness={0.95} roughness={0.1} />
      </Cylinder>
      {/* Air Intake Valve Knob */}
      <Cylinder args={[0.06, 0.06, 0.04, 32]} position={[0, 0.10, 0]}>
        <meshStandardMaterial color="#0284c7" metalness={0.8} />
      </Cylinder>
      {/* Air collar ring around the barrel */}
      <Cylinder args={[0.05, 0.05, 0.035, 24]} position={[0, 0.14, 0]}>
        <meshStandardMaterial color="#94a3b8" metalness={0.9} roughness={0.3} />
      </Cylinder>
      {/* Rubber gas inlet hose from the base */}
      <Cylinder args={[0.014, 0.014, 0.24, 12]} position={[0.12, 0.06, 0]} rotation-z={Math.PI / 2}>
        <meshStandardMaterial color="#1e293b" roughness={0.9} />
      </Cylinder>

        {/* Realistic Flame Cone & Light */}
      {isHeating && (
        <group position={[0, 0.44, 0]}>
          <Float speed={18} floatIntensity={0.6}>
            <Cylinder args={[0, 0.08, 0.24, 16]} position={[0, 0.10, 0]}>
              <meshBasicMaterial color="#38bdf8" transparent opacity={0.95} />
            </Cylinder>
            <Cylinder args={[0, 0.04, 0.14, 16]} position={[0, 0.07, 0]}>
              <meshBasicMaterial color="#3b82f6" />
            </Cylinder>
            <pointLight position={[0, 0.15, 0]} intensity={4.5} color="#38bdf8" distance={3.5} />
          </Float>
        </group>
      )}
    </group>
  );
}

// BURETTE CLAMPED ON A RETORT STAND (used for precise titration)
function RenderBurette({
  item,
  isHeating,
  isBubbling,
  temperature = 22,
}: {
  item: TableItem;
  isHeating: boolean;
  isBubbling?: boolean;
  temperature?: number;
}) {
  const liquidColor = item.contents?.color || '#38bdf8';
  const hasLiquid = (item.contents?.chemicals?.length ?? 0) > 0;
  const isReacting = isHeating || isBubbling || temperature >= 100 || Boolean(item.contents?.gasEvolved);
  const fill = hasLiquid ? fillPercent(item) : 0;
  const liqMax = 0.5;
  const liqHeight = hasLiquid ? Math.max(0.03, liqMax * Math.min(1, fill)) : 0;

  return (
    <group>
      {/* Heavy cast-iron base */}
      <Cylinder args={[0.22, 0.24, 0.06, 32]} position={[0, 0.03, 0]}>
        <meshStandardMaterial color="#1e293b" roughness={0.35} metalness={0.8} />
      </Cylinder>
      {/* Vertical retort rod */}
      <Cylinder args={[0.02, 0.02, 0.95, 16]} position={[0, 0.5, 0]}>
        <meshStandardMaterial color="#94a3b8" roughness={0.3} metalness={0.95} />
      </Cylinder>
      {/* Clamp arm holding the burette */}
      <Cylinder args={[0.015, 0.015, 0.36, 12]} position={[0.14, 0.8, 0]} rotation-z={Math.PI / 2}>
        <meshStandardMaterial color="#cbd5e1" roughness={0.3} metalness={0.9} />
      </Cylinder>

      {/* Burette glass tube beside the rod */}
      <group position={[0.3, 0, 0]}>
        <Cylinder args={[0.06, 0.06, 0.72, 32]} position={[0, 0.6, 0]}>
          <meshPhysicalMaterial color="#ffffff" roughness={0.05} clearcoat={0.7} transparent opacity={0.5} />
        </Cylinder>
        {/* Graduation marks */}
        {Array.from({ length: 10 }).map((_, i) => (
          <Box key={i} args={[0.028, 0.004, 0.01]} position={[0.008, 0.3 + i * 0.06, 0.058]}>
            <meshBasicMaterial color="#ffffff" />
          </Box>
        ))}
        {/* Glass stopcock */}
        <Cylinder args={[0.05, 0.05, 0.09, 24]} position={[0, 0.2, 0]} rotation-z={Math.PI / 2}>
          <meshStandardMaterial color="#b45309" roughness={0.4} metalness={0.7} />
        </Cylinder>
        {/* Tapered delivery tip */}
        <Cylinder args={[0.03, 0.015, 0.13, 24]} position={[0, 0.07, 0]}>
          <meshPhysicalMaterial color="#ffffff" roughness={0.05} transparent opacity={0.5} />
        </Cylinder>
        {/* Liquid column in the upper tube */}
        {hasLiquid && (
          <Cylinder args={[0.052, 0.052, liqHeight, 24]} position={[0, 0.6 - liqHeight / 2, 0]}>
            <meshStandardMaterial
              color={liquidColor}
              emissive={liquidColor}
              emissiveIntensity={0.3}
              transparent
              opacity={0.92}
            />
          </Cylinder>
        )}
        {hasLiquid && <LiquidMeniscus color={liquidColor} radius={0.052} y={0.6} />}
        <SmokeFumesSystem active={isReacting} color="#f8fafc" height={0.8} />
      </group>
    </group>
  );
}

// MEASURING / GRADUATED CYLINDER
function RenderCylinder({
  item,
  isHeating,
  isBubbling,
  temperature = 22,
}: {
  item: TableItem;
  isHeating: boolean;
  isBubbling?: boolean;
  temperature?: number;
}) {
  const liquidColor = item.contents?.color || '#38bdf8';
  const hasLiquid = (item.contents?.chemicals?.length ?? 0) > 0;
  const isReacting = isHeating || isBubbling || temperature >= 100 || Boolean(item.contents?.gasEvolved);
  const fill = hasLiquid ? fillPercent(item) : 0;
  const liqMax = 0.5;
  const liqHeight = hasLiquid ? Math.max(0.03, liqMax * Math.min(1, fill)) : 0;

  return (
    <group>
      {/* Glass body */}
      <Cylinder args={[0.14, 0.13, 0.6, 32]} position={[0, 0.3, 0]}>
        <meshPhysicalMaterial color="#ffffff" roughness={0.05} clearcoat={0.7} transparent opacity={0.5} />
      </Cylinder>
      {/* Flared base */}
      <Cylinder args={[0.19, 0.14, 0.035, 32]} position={[0, 0.017, 0]}>
        <meshPhysicalMaterial color="#ffffff" roughness={0.05} transparent opacity={0.6} />
      </Cylinder>
      {/* Graduation marks */}
      {Array.from({ length: 10 }).map((_, i) => (
        <Box key={i} args={[0.05, 0.004, 0.01]} position={[0.015, 0.05 + i * 0.05, 0.134]}>
          <meshBasicMaterial color="#ffffff" />
        </Box>
      ))}
      {/* Liquid column */}
      {hasLiquid && (
        <Cylinder args={[0.125, 0.12, liqHeight, 32]} position={[0, liqHeight / 2 + 0.03, 0]}>
          <meshStandardMaterial
            color={liquidColor}
            emissive={liquidColor}
            emissiveIntensity={0.3}
            transparent
            opacity={0.92}
          />
        </Cylinder>
      )}
      {hasLiquid && <LiquidMeniscus color={liquidColor} radius={0.12} y={liqHeight + 0.028} />}
      <SmokeFumesSystem active={isReacting} color="#f8fafc" height={0.7} />
    </group>
  );
}

// EYE DROPPER / PIPETTE
function RenderDropper({
  item,
  isHeating,
  isBubbling,
  temperature = 22,
}: {
  item: TableItem;
  isHeating: boolean;
  isBubbling?: boolean;
  temperature?: number;
}) {
  const liquidColor = item.contents?.color || '#38bdf8';
  const hasLiquid = (item.contents?.chemicals?.length ?? 0) > 0;
  const isReacting = isHeating || isBubbling || temperature >= 100 || Boolean(item.contents?.gasEvolved);
  const fill = hasLiquid ? fillPercent(item) : 0;
  const liqHeight = hasLiquid ? Math.max(0.02, 0.2 * Math.min(1, fill)) : 0;

  return (
    <group>
      {/* Rubber bulb */}
      <Sphere args={[0.075, 24, 24]} position={[0, 0.4, 0]}>
        <meshStandardMaterial color="#dc2626" roughness={0.7} />
      </Sphere>
      {/* Glass pipette body */}
      <Cylinder args={[0.022, 0.018, 0.42, 24]} position={[0, 0.16, 0]}>
        <meshPhysicalMaterial color="#ffffff" roughness={0.05} clearcoat={0.7} transparent opacity={0.55} />
      </Cylinder>
      {/* Liquid inside */}
      {hasLiquid && (
        <Cylinder args={[0.016, 0.014, liqHeight, 16]} position={[0, liqHeight / 2 + 0.05, 0]}>
          <meshStandardMaterial
            color={liquidColor}
            emissive={liquidColor}
            emissiveIntensity={0.3}
            transparent
            opacity={0.92}
          />
        </Cylinder>
      )}
      {/* Tapered glass tip */}
      <Cylinder args={[0.014, 0.006, 0.07, 16]} position={[0, -0.055, 0]}>
        <meshPhysicalMaterial color="#ffffff" roughness={0.05} transparent opacity={0.55} />
      </Cylinder>
      <SmokeFumesSystem active={isReacting} color="#f8fafc" height={0.5} />
    </group>
  );
}

// DIGITAL THERMOMETER PROBE WITH LCD READOUT
function RenderThermometer({ item }: { item: TableItem }) {
  const temp = item.contents?.temperature ?? 22;
  return (
    <group>
      {/* Stainless steel probe */}
      <Cylinder args={[0.025, 0.025, 0.5, 24]} position={[0, 0.25, 0]}>
        <meshStandardMaterial color="#cbd5e1" roughness={0.15} metalness={0.95} />
      </Cylinder>
      {/* Probe tip */}
      <Cylinder args={[0.02, 0.02, 0.09, 16]} position={[0, 0.54, 0]}>
        <meshStandardMaterial color="#94a3b8" roughness={0.2} metalness={0.95} />
      </Cylinder>
      {/* Digital display body */}
      <Box args={[0.2, 0.1, 0.05]} position={[0, 0.07, 0]}>
        <meshStandardMaterial color="#0f172a" roughness={0.2} metalness={0.6} />
      </Box>
      {/* Green LCD backlight */}
      <Box args={[0.165, 0.06, 0.02]} position={[0, 0.07, 0.035]}>
        <meshStandardMaterial color="#052e16" emissive="#22c55e" emissiveIntensity={0.9} />
      </Box>
      <Text position={[0, 0.07, 0.05]} fontSize={0.045} color="#a7f3d0" anchorX="center" anchorY="middle">
        {temp.toFixed(0)}°C
      </Text>
    </group>
  );
}

// TRIPOD STAND + WIRE GAUZE (for heating flasks)
function RenderTripod() {
  return (
    <group>
      {/* Three angled legs */}
      {[0, 120, 240].map((deg) => (
        <group key={deg} rotation-y={(deg * Math.PI) / 180}>
          <Box args={[0.035, 0.42, 0.035]} position={[0, 0.21, 0.13]} rotation-x={-0.32}>
            <meshStandardMaterial color="#334155" roughness={0.4} metalness={0.7} />
          </Box>
        </group>
      ))}
      {/* Support ring */}
      <Cylinder args={[0.17, 0.17, 0.02, 32]} position={[0, 0.42, 0]}>
        <meshStandardMaterial color="#475569" roughness={0.3} metalness={0.8} />
      </Cylinder>
      {/* Wire gauze mesh */}
      <Cylinder args={[0.16, 0.16, 0.008, 32]} position={[0, 0.425, 0]}>
        <meshStandardMaterial color="#94a3b8" roughness={0.6} metalness={0.9} />
      </Cylinder>
    </group>
  );
}

