import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useOmniStore, GraphNode } from '../../store/useOmniStore';

export const ParticleStream: React.FC = () => {
  const { nodes, edges, impactedEdgeIdSet } = useOmniStore();
  const pointsRef = useRef<THREE.Points>(null);

  const nodeMap = useMemo(() => {
    const map = new Map<string, GraphNode>();
    nodes.forEach((n) => map.set(n.id, n));
    return map;
  }, [nodes]);

  // Filter relevant edges for particle streams (CALLS, IMPORTS, and any impacted edges)
  const activeEdges = useMemo(() => {
    return edges.filter(
      (e) => e.type === 'CALLS' || e.type === 'IMPORTS' || impactedEdgeIdSet.has(e.id)
    );
  }, [edges, impactedEdgeIdSet]);

  const particleCount = Math.min(150, Math.max(20, activeEdges.length * 3));

  // Initialize particle offsets and assignments
  const { positions, speeds, edgeIndices, progress } = useMemo(() => {
    const pos = new Float32Array(particleCount * 3);
    const spd = new Float32Array(particleCount);
    const edgeIdx = new Uint16Array(particleCount);
    const prog = new Float32Array(particleCount);

    for (let i = 0; i < particleCount; i++) {
      spd[i] = 0.25 + Math.random() * 0.45;
      edgeIdx[i] = i % (activeEdges.length || 1);
      prog[i] = Math.random();
    }

    return { positions: pos, speeds: spd, edgeIndices: edgeIdx, progress: prog };
  }, [particleCount, activeEdges]);

  useFrame((_, delta) => {
    if (!pointsRef.current || activeEdges.length === 0) return;

    const posAttr = pointsRef.current.geometry.attributes.position as THREE.BufferAttribute;

    for (let i = 0; i < particleCount; i++) {
      progress[i] += delta * speeds[i];
      if (progress[i] >= 1.0) progress[i] = 0.0;

      const edge = activeEdges[edgeIndices[i] % activeEdges.length];
      if (!edge) continue;

      const src = nodeMap.get(edge.source);
      const tgt = nodeMap.get(edge.target);

      if (src && tgt && src.position && tgt.position) {
        const t = progress[i];
        posAttr.setXYZ(
          i,
          src.position[0] + (tgt.position[0] - src.position[0]) * t,
          src.position[1] + (tgt.position[1] - src.position[1]) * t,
          src.position[2] + (tgt.position[2] - src.position[2]) * t
        );
      }
    }

    posAttr.needsUpdate = true;
  });

  if (activeEdges.length === 0) return null;

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={particleCount}
          array={positions}
          itemSize={3}
        />
      </bufferGeometry>
      <pointsMaterial
        size={1.6}
        color="#00f2fe"
        transparent
        opacity={0.85}
        blending={THREE.AdditiveBlending}
        depthWrite={false}
      />
    </points>
  );
};
