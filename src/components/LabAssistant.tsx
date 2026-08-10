import { Float, Sphere, Cylinder, Box, Ring, Text } from '@react-three/drei';
import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

export function NovaAssistant({ message }: { message?: string }) {
  const headRef = useRef<THREE.Group>(null);
  const ringRef = useRef<THREE.Mesh>(null);
  const ringRef2 = useRef<THREE.Mesh>(null);

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    if (headRef.current) {
      headRef.current.rotation.y = Math.sin(t * 0.8) * 0.15;
    }
    if (ringRef.current) {
      ringRef.current.rotation.z = t * 1.5;
    }
    if (ringRef2.current) {
      ringRef2.current.rotation.x = t * -1.2;
    }
  });

  return (
    <group position={[2.4, 0, 0.4]}>
      {/* Sleek Blue Metallic Tripod Base */}
      <group position={[0, 0, 0]}>
        {/* Feet */}
        <Cylinder args={[0.35, 0.4, 0.08, 32]} position={[0, -0.45, 0]}>
          <meshStandardMaterial color="#0f172a" roughness={0.2} metalness={0.9} />
        </Cylinder>
        {/* Blue Base Ring */}
        <Cylinder args={[0.3, 0.3, 0.04, 32]} position={[0, -0.4, 0]}>
          <meshStandardMaterial color="#2563eb" emissive="#1d4ed8" emissiveIntensity={0.8} />
        </Cylinder>

        {/* Telescopic Carbon Fiber Shaft */}
        <Cylinder args={[0.035, 0.045, 1.4, 32]} position={[0, 0.3, 0]}>
          <meshStandardMaterial color="#1e293b" roughness={0.1} metalness={0.9} />
        </Cylinder>
        {/* Metallic Joint Collar */}
        <Cylinder args={[0.06, 0.06, 0.15, 32]} position={[0, 0.7, 0]}>
          <meshStandardMaterial color="#3b82f6" roughness={0.2} metalness={0.8} />
        </Cylinder>
        <Cylinder args={[0.028, 0.028, 0.6, 32]} position={[0, 1.0, 0]}>
          <meshStandardMaterial color="#0284c7" roughness={0.1} metalness={0.9} />
        </Cylinder>
      </group>

      {/* Floating Articulated AI Head Unit */}
      <group position={[0, 1.45, 0]}>
        <Float speed={2.5} rotationIntensity={0.2} floatIntensity={0.4}>
          <group ref={headRef}>
            {/* White/Sleek Ceramic Robot Head Shell */}
            <Cylinder args={[0.12, 0.08, 0.28, 32]} position={[0, 0, 0]}>
              <meshStandardMaterial color="#f8fafc" roughness={0.15} metalness={0.3} />
            </Cylinder>

            {/* Dark Visor Facemask */}
            <Cylinder args={[0.122, 0.082, 0.18, 32, 1, false, -Math.PI / 2.5, Math.PI / 1.25]} position={[0, 0.02, 0.001]}>
              <meshStandardMaterial color="#020617" roughness={0.1} metalness={0.9} />
            </Cylinder>

            {/* Glowing Blue Camera Lens Eye */}
            <Cylinder args={[0.045, 0.045, 0.04, 32]} rotation={[Math.PI / 2, 0, 0]} position={[0, 0.04, 0.11]}>
              <meshStandardMaterial color="#0f172a" roughness={0.1} metalness={0.9} />
            </Cylinder>
            <Sphere args={[0.032, 32, 32]} position={[0, 0.04, 0.125]}>
              <meshStandardMaterial color="#38bdf8" emissive="#0284c7" emissiveIntensity={1.2} />
            </Sphere>

            {/* Holographic Gyro Scope Rings around AI Head */}
            <mesh ref={ringRef} position={[0, 0, 0]}>
              <torusGeometry args={[0.2, 0.006, 16, 64]} />
              <meshBasicMaterial color="#38bdf8" transparent opacity={0.7} />
            </mesh>
            <mesh ref={ringRef2} position={[0, 0, 0]}>
              <torusGeometry args={[0.24, 0.004, 16, 64]} />
              <meshBasicMaterial color="#60a5fa" transparent opacity={0.5} />
            </mesh>

            {/* AI Status Holographic Tag */}
            <group position={[0, 0.28, 0]}>
              <Text fontSize={0.07} color="#38bdf8" anchorX="center" font="https://fonts.gstatic.com/s/inter/v12/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuLyeMZhrib2Bg-4.ttf">
                NOVA AI BOT
              </Text>
            </group>
          </group>

          <pointLight position={[0, 0.1, 0.15]} intensity={2.5} color="#38bdf8" distance={2} />
        </Float>
      </group>
    </group>
  );
}
