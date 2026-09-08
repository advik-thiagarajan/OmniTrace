import React, { useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Stars } from '@react-three/drei';
import * as THREE from 'three';
import { GraphNodes } from './GraphNodes';
import { GraphEdges } from './GraphEdges';
import { ParticleStream } from './ParticleStream';
import { useOmniStore } from '../../store/useOmniStore';

const CameraController: React.FC = () => {
  const { cameraFocusPosition } = useOmniStore();
  const controlsRef = useRef<any>(null);

  useFrame((state) => {
    if (cameraFocusPosition && controlsRef.current) {
      const targetVec = new THREE.Vector3(...cameraFocusPosition);
      controlsRef.current.target.lerp(targetVec, 0.05);
      controlsRef.current.update();
    }
  });

  return (
    <OrbitControls
      ref={controlsRef}
      enableDamping
      dampingFactor={0.05}
      minDistance={10}
      maxDistance={250}
      rotateSpeed={0.7}
      zoomSpeed={1.2}
      panSpeed={0.8}
    />
  );
};

export const ConstellationCanvas: React.FC = () => {
  const { setSelectedNode, setHoveredNode } = useOmniStore();

  return (
    <div className="w-full h-full relative bg-command-950">
      <Canvas
        camera={{ position: [0, 45, 110], fov: 50 }}
        onPointerMissed={() => {
          setSelectedNode(null);
          setHoveredNode(null);
        }}
        gl={{ antialias: true, alpha: false }}
      >
        <color attach="background" args={['#07090e']} />

        {/* Ambient & Directional Lighting */}
        <ambientLight intensity={0.4} />
        <pointLight position={[100, 100, 100]} intensity={1.5} color="#00f2fe" />
        <pointLight position={[-100, -100, -100]} intensity={1.2} color="#a855f7" />
        <pointLight position={[0, 0, 0]} intensity={0.8} color="#ffffff" />

        {/* Constellation Starfield */}
        <Stars
          radius={160}
          depth={60}
          count={3500}
          factor={4}
          saturation={0.5}
          fade
          speed={1}
        />

        {/* 3D Knowledge Graph Elements */}
        <GraphNodes />
        <GraphEdges />
        <ParticleStream />

        {/* Camera & Orbit Controls */}
        <CameraController />
      </Canvas>

      {/* Floating Canvas Controls / Legend */}
      <div className="absolute top-4 left-4 pointer-events-none z-10 space-y-2">
        <div className="px-3 py-2 rounded-xl bg-command-950/80 backdrop-blur-md border border-white/10 text-[11px] font-mono space-y-1.5 shadow-xl">
          <div className="text-slate-400 font-bold uppercase tracking-wider text-[10px]">
            Constellation Legend
          </div>
          <div className="flex items-center space-x-2">
            <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 shadow-glow-cyan" />
            <span className="text-slate-300">File Modules</span>
          </div>
          <div className="flex items-center space-x-2">
            <span className="w-2.5 h-2.5 rounded-full bg-purple-400 shadow-glow-purple" />
            <span className="text-slate-300">Functions / Methods</span>
          </div>
          <div className="flex items-center space-x-2">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
            <span className="text-slate-300">Classes & Structs</span>
          </div>
          <div className="flex items-center space-x-2">
            <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse shadow-glow-danger" />
            <span className="text-red-400 font-semibold">Blast Radius Risk</span>
          </div>
        </div>
      </div>
    </div>
  );
};
