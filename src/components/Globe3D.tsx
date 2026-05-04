import React, { useRef, useMemo, Suspense } from 'react';
import { Canvas, useFrame, useLoader } from '@react-three/fiber';
import { OrbitControls, Html } from '@react-three/drei';
import { RefreshCw } from 'lucide-react';
import * as THREE from 'three';

interface MarkerProps {
  lat: number;
  lng: number;
  label: string;
}

const Marker = ({ lat, lng, label }: MarkerProps) => {
  const position = useMemo(() => {
    const phi = (90 - lat) * (Math.PI / 180);
    const theta = (lng + 180) * (Math.PI / 180);
    const radius = 2.05;
    return new THREE.Vector3(
      -radius * Math.sin(phi) * Math.cos(theta),
      radius * Math.cos(phi),
      radius * Math.sin(phi) * Math.sin(theta)
    );
  }, [lat, lng]);

  return (
    <group position={position}>
      <mesh>
        <sphereGeometry args={[0.04, 16, 16]} />
        <meshStandardMaterial color="#ef4444" emissive="#ef4444" emissiveIntensity={2} />
      </mesh>
      <mesh position={[0, 0.1, 0]}>
        <sphereGeometry args={[0.015, 8, 8]} />
        <meshStandardMaterial color="#f87171" transparent opacity={0.6} />
      </mesh>
    </group>
  );
};

import earthTextureUrl from '../assets/earth-texture.jpg';

const Globe = ({ itineraries }: { itineraries: any[] }) => {
  const globeRef = useRef<THREE.Group>(null);
  const colorMap = useLoader(THREE.TextureLoader, earthTextureUrl);

  useFrame((state, delta) => {
    if (globeRef.current) {
      globeRef.current.rotation.y += delta * 0.15;
    }
  });

  return (
    <group ref={globeRef}>
      {/* Atmosphere Glow */}
      <mesh>
        <sphereGeometry args={[2.1, 32, 32]} />
        <meshStandardMaterial
          color="#3b82f6"
          transparent
          opacity={0.1}
          side={THREE.BackSide}
        />
      </mesh>

      {/* Main Globe */}
      <mesh>
        <sphereGeometry args={[2, 64, 64]} />
        <meshStandardMaterial
          map={colorMap}
          roughness={0.8}
          metalness={0.1}
        />
      </mesh>

      {/* Grid/Wireframe for a technical look */}
      <mesh>
        <sphereGeometry args={[2.01, 16, 16]} />
        <meshStandardMaterial
          color="#3b82f6"
          wireframe
          transparent
          opacity={0.1}
        />
      </mesh>

      {/* Itinerary Markers */}
      {itineraries.map((it) => (
        <Marker key={it.id} lat={it.lat} lng={it.lng} label={it.city} />
      ))}
    </group>
  );
};

export const Globe3D = ({ itineraries, className }: { itineraries: any[], className?: string }) => {
  return (
    <div className={className || "w-full h-[300px] sm:h-[400px] relative cursor-grab active:cursor-grabbing"}>
      <Canvas camera={{ position: [0, 0, 6], fov: 45 }} dpr={[1, 2]}>
        <ambientLight intensity={0.5} />
        <pointLight position={[10, 10, 10]} intensity={1.5} color="#3b82f6" />
        <pointLight position={[-10, -10, -10]} intensity={0.5} color="#6366f1" />
        
        <Suspense fallback={
          <Html center>
            <div className="flex flex-col items-center gap-2">
              <RefreshCw className="w-8 h-8 text-emerald-500 animate-spin" />
              <p className="text-[10px] font-black text-emerald-500 uppercase tracking-widest">Caricamento...</p>
            </div>
          </Html>
        }>
          <Globe itineraries={itineraries} />
        </Suspense>
        
        <OrbitControls 
          enableZoom={false} 
          enablePan={false} 
          rotateSpeed={0.5}
          autoRotate={false}
        />
      </Canvas>
      <div className="absolute inset-0 pointer-events-none bg-gradient-to-b from-transparent via-transparent to-[var(--bg)] opacity-60" />
    </div>
  );
};
