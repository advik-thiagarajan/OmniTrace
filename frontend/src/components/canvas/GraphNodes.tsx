import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import * as THREE from 'three';
import { useGraphStore, GraphNode } from '../../store/useGraphStore';

interface NodeMeshProps {
  node: GraphNode;
  position: [number, number, number];
  isSelected: boolean;
  isHovered: boolean;
  isPulsing: boolean;
  isBlastTarget: boolean;
  isImpacted: boolean;
  nodeColor: string;
  highlightColor: string;
  onSelect: () => void;
  onHover: (hover: boolean) => void;
}

const NodeMesh: React.FC<NodeMeshProps> = ({
  node,
  position,
  isSelected,
  isHovered,
  isPulsing,
  isBlastTarget,
  isImpacted,
  nodeColor,
  highlightColor,
  onSelect,
  onHover,
}) => {
  const meshRef = useRef<THREE.Mesh>(null);
  const ringRef = useRef<THREE.Mesh>(null);

  const isHighRisk = (node.risk_score !== undefined && node.risk_score > 70) || false;

  // Determine active color based on state, risk, selection, and store customization
  const getColor = () => {
    if (isBlastTarget || isSelected || isHighRisk) return highlightColor;
    if (isImpacted) return '#f97316';   // Orange
    if (isPulsing) return '#f43f5e';    // Rose pulse
    return nodeColor;
  };

  const currentColor = getColor();
  const radius = isBlastTarget
    ? 2.6
    : isSelected
    ? 2.2
    : node.type === 'FILE'
    ? 1.8
    : node.type === 'CLASS'
    ? 1.5
    : 1.2;

  useFrame((state, delta) => {
    if (meshRef.current) {
      if (isPulsing || isBlastTarget) {
        const scale = 1 + Math.sin(state.clock.elapsedTime * 8) * 0.25;
        meshRef.current.scale.set(scale, scale, scale);
      } else if (isSelected || isHovered) {
        meshRef.current.scale.lerp(new THREE.Vector3(1.3, 1.3, 1.3), delta * 10);
      } else {
        meshRef.current.scale.lerp(new THREE.Vector3(1, 1, 1), delta * 10);
      }
    }

    if (ringRef.current && (isBlastTarget || isImpacted)) {
      ringRef.current.rotation.z += delta * 1.5;
      ringRef.current.rotation.x += delta * 0.8;
    }
  });

  return (
    <group position={position}>
      {/* Central Node Sphere */}
      <mesh
        ref={meshRef}
        onClick={(e) => {
          e.stopPropagation();
          onSelect();
        }}
        onPointerOver={(e) => {
          e.stopPropagation();
          onHover(true);
        }}
        onPointerOut={(e) => {
          e.stopPropagation();
          onHover(false);
        }}
      >
        <sphereGeometry args={[radius, 32, 32]} />
        <meshStandardMaterial
          color={currentColor}
          emissive={currentColor}
          emissiveIntensity={
            isBlastTarget
              ? 1.8
              : isImpacted
              ? 1.2
              : isSelected
              ? 1.5
              : isHovered
              ? 0.9
              : 0.45
          }
          roughness={0.3}
          metalness={0.8}
        />
      </mesh>

      {/* Blast Radius Shockwave Ring */}
      {(isBlastTarget || isImpacted) && (
        <mesh ref={ringRef}>
          <ringGeometry args={[radius * 1.4, radius * 1.65, 32]} />
          <meshBasicMaterial
            color={isBlastTarget ? highlightColor : '#f97316'}
            side={THREE.DoubleSide}
            transparent
            opacity={0.8}
          />
        </mesh>
      )}

      {/* Hover & Selection 3D Billboard Label */}
      {(isHovered || isSelected || isBlastTarget) && (
        <Html distanceFactor={45} position={[0, radius + 1.2, 0]} center>
          <div className="pointer-events-none whitespace-nowrap px-2.5 py-1 rounded-lg bg-command-950/95 border border-white/20 shadow-2xl backdrop-blur-md text-[11px] font-mono select-none">
            <div className="flex items-center space-x-1.5">
              <span
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: currentColor }}
              />
              <span className="font-bold text-white">{node.label}</span>
              <span className="text-[9px] uppercase px-1 rounded bg-white/10 text-slate-300">
                {node.type}
              </span>
            </div>
            {node.file_path && (
              <div className="text-[9px] text-slate-400 mt-0.5">{node.file_path}</div>
            )}
          </div>
        </Html>
      )}
    </group>
  );
};

export const GraphNodes: React.FC = () => {
  const {
    nodes,
    selectedNode,
    hoveredNode,
    setSelectedNode,
    setHoveredNode,
    pulsingNodeIds,
    blastRadiusResult,
    impactedNodeIdSet,
    nodeColor,
    highlightColor,
  } = useGraphStore();

  return (
    <group>
      {nodes.map((node) => {
        const pos: [number, number, number] = node.position || [0, 0, 0];
        const isSelected = selectedNode?.id === node.id;
        const isHovered = hoveredNode?.id === node.id;
        const isPulsing = pulsingNodeIds.has(node.id);
        const isBlastTarget = blastRadiusResult?.target_node.id === node.id;
        const isImpacted = impactedNodeIdSet.has(node.id) && !isBlastTarget;

        return (
          <NodeMesh
            key={node.id}
            node={node}
            position={pos}
            isSelected={isSelected}
            isHovered={isHovered}
            isPulsing={isPulsing}
            isBlastTarget={isBlastTarget}
            isImpacted={isImpacted}
            nodeColor={nodeColor}
            highlightColor={highlightColor}
            onSelect={() => setSelectedNode(node)}
            onHover={(hover) => setHoveredNode(hover ? node : null)}
          />
        );
      })}
    </group>
  );
};
