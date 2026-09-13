import React, { useMemo, useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Float, Stars } from '@react-three/drei';
import * as THREE from 'three';

// Interactive Node Matrix with connecting lines and mouse reactivity
const NodeMatrix: React.FC = () => {
  const groupRef = useRef<THREE.Group>(null);
  const nodesCount = 60;

  // Generate deterministic random node positions and velocities
  const nodesData = useMemo(() => {
    const nodes: { pos: THREE.Vector3; basePos: THREE.Vector3; speed: number; phase: number; color: string }[] = [];
    const colors = ['#00f2fe', '#4facfe', '#38bdf8', '#818cf8', '#a855f7'];

    for (let i = 0; i < nodesCount; i++) {
      const radius = 18 + Math.random() * 32;
      const theta = Math.random() * Math.PI * 2;
      const phi = (Math.random() - 0.5) * Math.PI * 0.9;

      const x = radius * Math.cos(phi) * Math.cos(theta);
      const y = radius * Math.sin(phi) + (Math.random() - 0.5) * 8;
      const z = radius * Math.cos(phi) * Math.sin(theta) - 10;

      const vec = new THREE.Vector3(x, y, z);
      nodes.push({
        pos: vec.clone(),
        basePos: vec.clone(),
        speed: 0.3 + Math.random() * 0.5,
        phase: Math.random() * Math.PI * 2,
        color: colors[i % colors.length],
      });
    }
    return nodes;
  }, []);

  // Line segments connecting nearby nodes
  const lineGeometry = useMemo(() => {
    const geom = new THREE.BufferGeometry();
    const positions: number[] = [];
    const maxDistance = 14;

    for (let i = 0; i < nodesData.length; i++) {
      for (let j = i + 1; j < nodesData.length; j++) {
        const dist = nodesData[i].basePos.distanceTo(nodesData[j].basePos);
        if (dist < maxDistance) {
          positions.push(
            nodesData[i].basePos.x, nodesData[i].basePos.y, nodesData[i].basePos.z,
            nodesData[j].basePos.x, nodesData[j].basePos.y, nodesData[j].basePos.z
          );
        }
      }
    }

    geom.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    return geom;
  }, [nodesData]);

  // Points particle cloud
  const particles = useMemo(() => {
    const count = 1200;
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    const c1 = new THREE.Color('#00f2fe');
    const c2 = new THREE.Color('#4facfe');
    const c3 = new THREE.Color('#a855f7');

    for (let i = 0; i < count; i++) {
      const idx = i * 3;
      positions[idx] = (Math.random() - 0.5) * 120;
      positions[idx + 1] = (Math.random() - 0.5) * 100;
      positions[idx + 2] = (Math.random() - 0.5) * 100 - 15;

      const mixFactor = Math.random();
      const chosenColor = mixFactor < 0.45 ? c1 : mixFactor < 0.8 ? c2 : c3;
      colors[idx] = chosenColor.r;
      colors[idx + 1] = chosenColor.g;
      colors[idx + 2] = chosenColor.b;
    }

    const geom = new THREE.BufferGeometry();
    geom.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geom.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    return geom;
  }, []);

  useFrame((state, delta) => {
    if (groupRef.current) {
      // Gentle constant rotation
      groupRef.current.rotation.y += delta * 0.08;
      groupRef.current.rotation.x += delta * 0.02;

      // Mouse reactivity parallax
      const targetRotationY = state.pointer.x * 0.35;
      const targetRotationX = -state.pointer.y * 0.25;

      groupRef.current.rotation.y = THREE.MathUtils.lerp(groupRef.current.rotation.y, targetRotationY + state.clock.elapsedTime * 0.04, delta * 2.5);
      groupRef.current.rotation.x = THREE.MathUtils.lerp(groupRef.current.rotation.x, targetRotationX, delta * 2.5);
    }
  });

  return (
    <group ref={groupRef}>
      {/* Background Particle Cloud */}
      <points geometry={particles}>
        <pointsMaterial
          size={0.7}
          vertexColors
          transparent
          opacity={0.6}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </points>

      {/* Constellation Edge Lines */}
      <lineSegments geometry={lineGeometry}>
        <lineBasicMaterial
          color="#00f2fe"
          transparent
          opacity={0.18}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </lineSegments>

      {/* Main Node Spheres with subtle float */}
      {nodesData.map((node, i) => (
        <Float
          key={i}
          speed={node.speed * 1.5}
          rotationIntensity={0.4}
          floatIntensity={0.8}
        >
          <mesh position={node.pos}>
            <sphereGeometry args={[0.55 + (i % 3) * 0.25, 16, 16]} />
            <meshStandardMaterial
              color={node.color}
              emissive={node.color}
              emissiveIntensity={1.2}
              roughness={0.2}
              metalness={0.8}
            />
          </mesh>
        </Float>
      ))}
    </group>
  );
};

// Orbital Rings representing multi-layered lineage
const OrbitalRings: React.FC = () => {
  const ringRef = useRef<THREE.Group>(null);

  useFrame((state, delta) => {
    if (ringRef.current) {
      ringRef.current.rotation.z += delta * 0.05;
      ringRef.current.rotation.x = Math.sin(state.clock.elapsedTime * 0.2) * 0.2;
    }
  });

  return (
    <group ref={ringRef} position={[0, 0, -5]}>
      <mesh rotation={[Math.PI / 3, 0, 0]}>
        <torusGeometry args={[36, 0.12, 16, 100]} />
        <meshBasicMaterial color="#00f2fe" transparent opacity={0.25} />
      </mesh>
      <mesh rotation={[-Math.PI / 4, Math.PI / 6, 0]}>
        <torusGeometry args={[44, 0.08, 16, 100]} />
        <meshBasicMaterial color="#a855f7" transparent opacity={0.2} />
      </mesh>
    </group>
  );
};

export const LandingConstellation: React.FC = () => {
  return (
    <div className="absolute inset-0 pointer-events-none z-0 overflow-hidden">
      <Canvas
        camera={{ position: [0, 0, 48], fov: 60 }}
        gl={{ antialias: true, alpha: true }}
      >
        {/* Deep Lighting */}
        <ambientLight intensity={0.4} />
        <pointLight position={[60, 40, 40]} intensity={2.2} color="#00f2fe" />
        <pointLight position={[-60, -40, -20]} intensity={1.8} color="#a855f7" />
        <pointLight position={[0, 50, 0]} intensity={1.2} color="#3b82f6" />

        {/* Distant Stars */}
        <Stars
          radius={120}
          depth={50}
          count={2500}
          factor={3.5}
          saturation={0.5}
          fade
          speed={0.8}
        />

        {/* Node Matrix and Geometry */}
        <NodeMatrix />
        <OrbitalRings />
      </Canvas>
    </div>
  );
};

export default LandingConstellation;
