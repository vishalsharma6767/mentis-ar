import { useEffect, useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { Sky, Text } from '@react-three/drei';
import * as THREE from 'three';
import { DesertTerrain, Road } from './DesertTerrain';
import { AcademyHQ } from './AcademyHQ';
import { Hangar, Workshop } from './Hangar';
import { ControlTower } from './ControlTower';
import { TrainingField } from './TrainingField';
import { DroneDisplay, SolarFarm } from './DroneDisplay';
import { WaterTower, Windmill, FlagPole, Bench, PerimeterFence } from './Landmarks';
import { campusHeight } from './terrainUtil';
import { remoteControl } from '../remote/RemoteBridge';
import { campusBridge } from './campusState';

// Spawn point at the academy main gate, facing the HQ.
export const CAMPUS_SPAWN = new THREE.Vector3(0, 0, 46);
export const CAMPUS_BOUNDS = 120;

// Walk / mouse-look controller — mirrors the LabRoom pattern so it feels the
// same (drag to look, WASD to walk) and also honors the phone controller.
export function CampusController({ launch }: { launch: () => void }) {
  const { camera, gl } = useThree();
  const keys = useRef<{ [key: string]: boolean }>({});
  const isDragging = useRef(false);
  const previousMouse = useRef({ x: 0, y: 0 });
  const euler = useRef(new THREE.Euler(0, 0, 0, 'YXZ'));
  const wantLaunch = useRef(false);

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
      const dx = e.clientX - previousMouse.current.x;
      const dy = e.clientY - previousMouse.current.y;
      previousMouse.current = { x: e.clientX, y: e.clientY };
      const sens = 0.0035;
      euler.current.y -= dx * sens;
      euler.current.x -= dy * sens;
      euler.current.x = Math.max(-Math.PI / 2.8, Math.min(Math.PI / 2.8, euler.current.x));
      camera.quaternion.setFromEuler(euler.current);
    };
    const handlePointerUp = () => {
      isDragging.current = false;
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement)?.tagName === 'INPUT' || (e.target as HTMLElement)?.tagName === 'SELECT') return;
      keys.current[e.code] = true;
      if (e.code === 'KeyE') wantLaunch.current = true;
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      keys.current[e.code] = false;
    };

    const handleRespawn = (e: Event) => {
      const d = (e as CustomEvent).detail;
      if (d && typeof d.x === 'number') {
        camera.position.set(d.x, d.y, d.z);
        // Face the campus (north) from the entrance.
        euler.current.set(0, 0, 0);
        camera.quaternion.setFromEuler(euler.current);
      }
    };

    const domElement = gl.domElement;
    domElement.addEventListener('pointerdown', handlePointerDown);
    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('campus-respawn', handleRespawn);

    return () => {
      domElement.removeEventListener('pointerdown', handlePointerDown);
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('campus-respawn', handleRespawn);
    };
  }, [camera, gl]);

  useFrame((_, delta) => {
    // Walk WASD / phone joystick.
    let moveX = (keys.current['KeyA'] || keys.current['ArrowLeft'] ? -1 : 0) + (keys.current['KeyD'] || keys.current['ArrowRight'] ? 1 : 0);
    let moveZ = (keys.current['KeyW'] || keys.current['ArrowUp'] ? -1 : 0) + (keys.current['KeyS'] || keys.current['ArrowDown'] ? 1 : 0);
    if (remoteControl.moveX !== 0 || remoteControl.moveZ !== 0) {
      moveX = remoteControl.moveX;
      moveZ = remoteControl.moveZ;
    }

    // Mouse / phone look.
    if (remoteControl.tilt) {
      euler.current.y = remoteControl.tilt.yaw;
      euler.current.x = Math.max(-Math.PI / 2.8, Math.min(Math.PI / 2.8, remoteControl.tilt.pitch));
      euler.current.z = 0;
      camera.quaternion.setFromEuler(euler.current);
    } else if (remoteControl.lookDx !== 0 || remoteControl.lookDy !== 0) {
      const sens = 0.0035;
      euler.current.y -= remoteControl.lookDx * sens;
      euler.current.x -= remoteControl.lookDy * sens;
      euler.current.x = Math.max(-Math.PI / 2.8, Math.min(Math.PI / 2.8, euler.current.x));
      camera.quaternion.setFromEuler(euler.current);
      remoteControl.lookDx = 0;
      remoteControl.lookDy = 0;
    }

    const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion);
    forward.y = 0;
    if (forward.lengthSq() > 0) forward.normalize();
    const right = new THREE.Vector3(1, 0, 0).applyQuaternion(camera.quaternion);
    right.y = 0;
    if (right.lengthSq() > 0) right.normalize();

    const speed = 4.2 * delta;
    camera.position.addScaledVector(forward, moveZ * speed);
    camera.position.addScaledVector(right, moveX * speed);

    // Keep the player on campus terrain (follows the gentle ground) and inside
    // the boundary. Near buildings the ground is effectively flat.
    camera.position.y = campusHeight(camera.position.x, camera.position.z) + 1.7;
    camera.position.x = Math.max(-CAMPUS_BOUNDS, Math.min(CAMPUS_BOUNDS, camera.position.x));
    camera.position.z = Math.max(-CAMPUS_BOUNDS, Math.min(CAMPUS_BOUNDS, camera.position.z));

    // Flight terminal launch proximity check (also usable from HUD button).
    const dTerm = Math.hypot(camera.position.x - 26, camera.position.z - 8);
    campusBridge.nearTerminal = dTerm < 3.6;

    if (wantLaunch.current) {
      wantLaunch.current = false;
      if (campusBridge.nearTerminal) launch();
    }
  });

  return null;
}

export function DroneCampus({ walk, onLaunch }: { walk: boolean; onLaunch: () => void }) {
  // Site layout: HQ + entrance at the south edge, hangar/workshop to the west,
  // control tower + training field to the north, display + solar to the east.
  const layout = useMemo(
    () => ({
      hq: [0, 0, 12] as [number, number, number],
      hangar: [-52, 0, -6] as [number, number, number],
      workshop: [-44, 0, 14] as [number, number, number],
      tower: [26, 0, -30] as [number, number, number],
      field: [12, 0, -44] as [number, number, number],
      display: [58, 0, 6] as [number, number, number],
      solar: [46, 0, 44] as [number, number, number],
      waterTower: [-40, 0, -34] as [number, number, number],
      windmill: [64, 0, -22] as [number, number, number],
      terminal: [26, 0, 8] as [number, number, number],
    }),
    []
  );

  useEffect(() => {
    campusBridge.nearTerminal = false;
    return () => {
      campusBridge.nearTerminal = false;
    };
  }, []);

  return (
    <group>
      <color attach="background" args={['#b7c9de']} />
      <fog attach="fog" args={['#e4d2b0', 70, 300]} />
      <Sky distance={450000} sunPosition={[100, 55, -90]} turbidity={6} rayleigh={1} mieCoefficient={0.005} mieDirectionalG={0.8} />

      <ambientLight intensity={0.45} />
      <hemisphereLight args={['#dce8ff', '#9a7a4a', 0.5]} />
      <directionalLight position={[80, 90, 30]} intensity={2.4} color="#ffe0b3" castShadow />

      <DesertTerrain />

      {/* Dirt road ring connecting the zones */}
      <Road from={[0, 12]} to={[-52, -6]} />
      <Road from={[-52, -6]} to={[-40, -34]} />
      <Road from={[-40, -34]} to={[12, -44]} />
      <Road from={[12, -44]} to={[26, -30]} />
      <Road from={[26, -30]} to={[26, 8]} />
      <Road from={[26, 8]} to={[0, 12]} />
      <Road from={[26, -30]} to={[58, 6]} />
      <Road from={[58, 6]} to={[46, 44]} />
      <Road from={[26, 8]} to={[46, 44]} />
      <Road from={[0, 12]} to={[58, 6]} />

      {/* Buildings */}
      <AcademyHQ position={layout.hq} rotation={0} />
      <Hangar position={layout.hangar} rotation={Math.PI / 2} label="HANGAR 01" />
      <Workshop position={layout.workshop} rotation={0.2} />
      <ControlTower position={layout.tower} rotation={0.6} />

      <TrainingField position={layout.field} rotation={0} />
      <DroneDisplay position={layout.display} rotation={Math.PI / 2} />
      <SolarFarm position={layout.solar} rotation={0.4} />

      <WaterTower position={layout.waterTower} />
      <Windmill position={layout.windmill} />

      {/* Flags around the campus */}
      <FlagPole position={[-3, 0, 16]} />
      <FlagPole position={[3, 0, 16]} color="#93c5fd" />
      <FlagPole position={[12, 0, -36]} />

      {/* Benches along the plaza */}
      <Bench position={[-6, 0, 9]} rotation={0.2} />
      <Bench position={[6, 0, 9]} rotation={-0.2} />
      <Bench position={[22, 0, 4]} rotation={0.3} />

      {/* Perimeter fence along the south edge near the entrance */}
      <PerimeterFence from={[-12, 40]} to={[12, 40]} segments={6} />
      <PerimeterFence from={[-30, 24]} to={[-14, 34]} segments={4} />
      <PerimeterFence from={[14, 34]} to={[30, 24]} segments={4} />

      {/* Flight terminal at the north edge of the plaza, looking at the tower */}
      <group position={layout.terminal}>
        <mesh position={[0, 0.08, 0]} rotation-x={-Math.PI / 2} receiveShadow>
          <planeGeometry args={[5, 5]} />
          <meshStandardMaterial color="#3b444c" roughness={0.9} />
        </mesh>
        <mesh position={[0, 0, 1.6]}>
          <boxGeometry args={[4.4, 0.3, 0.3]} />
          <meshStandardMaterial color="#f59e0b" roughness={0.6} />
        </mesh>
        {/* launch pad circle */}
        <mesh position={[0, 0.1, -0.8]} rotation-x={-Math.PI / 2}>
          <ringGeometry args={[1.7, 2.2, 32]} />
          <meshStandardMaterial color="#f59e0b" roughness={0.7} />
        </mesh>
        <mesh position={[0, 0.12, -0.8]} rotation-x={-Math.PI / 2}>
          <circleGeometry args={[0.4, 24]} />
          <meshStandardMaterial color="#fef3c7" roughness={0.7} />
        </mesh>
        {/* sign */}
        <group position={[0, 2.2, -1.2]}>
          <mesh>
            <boxGeometry args={[5, 1, 0.2]} />
            <meshStandardMaterial color="#232a30" roughness={0.5} />
          </mesh>
          <Text fontSize={0.4} color="#fbbf24" anchorX="center" anchorY="middle" position={[0, 0, 0.12]}>
            FLIGHT TERMINAL · E TO LAUNCH
          </Text>
        </group>
        <mesh position={[0, 3.4, -1.2]} castShadow>
          <cylinderGeometry args={[0.08, 0.1, 2.4, 8]} />
          <meshStandardMaterial color="#8a9299" metalness={0.5} roughness={0.4} />
        </mesh>
      </group>

      {walk && <CampusController launch={onLaunch} />}
    </group>
  );
}
