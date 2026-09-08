import React, { useMemo } from 'react';
import * as THREE from 'three';
import { useOmniStore, GraphEdge, GraphNode } from '../../store/useOmniStore';

interface EdgeLineProps {
  sourcePos: [number, number, number];
  targetPos: [number, number, number];
  edge: GraphEdge;
  isImpacted: boolean;
  isSelectedEdge: boolean;
}

const EdgeLine: React.FC<EdgeLineProps> = ({
  sourcePos,
  targetPos,
  edge,
  isImpacted,
  isSelectedEdge,
}) => {
  const points = useMemo(() => {
    const p1 = new THREE.Vector3(...sourcePos);
    const p2 = new THREE.Vector3(...targetPos);
    return [p1, p2];
  }, [sourcePos, targetPos]);

  const lineGeometry = useMemo(() => {
    const geom = new THREE.BufferGeometry().setFromPoints(points);
    return geom;
  }, [points]);

  const getEdgeColor = () => {
    if (isImpacted) return '#ef4444'; // Vivid Red for blast radius path
    if (isSelectedEdge) return '#00f2fe';
    switch (edge.type) {
      case 'CALLS':
        return '#818cf8'; // Neon Indigo / Purple
      case 'IMPORTS':
        return '#06b6d4'; // Cyan
      case 'INHERITS':
        return '#f59e0b'; // Amber
      default:
        return '#1e293b'; // Slate dark for CONTAINS
    }
  };

  const color = getEdgeColor();
  const opacity = isImpacted ? 0.95 : isSelectedEdge ? 0.85 : edge.type === 'CONTAINS' ? 0.22 : 0.45;

  return (
    <primitive object={new THREE.Line(
      lineGeometry,
      new THREE.LineBasicMaterial({
        color: new THREE.Color(color),
        transparent: true,
        opacity: opacity,
        linewidth: isImpacted ? 3 : 1,
      })
    )} />
  );
};

export const GraphEdges: React.FC = () => {
  const { nodes, edges, selectedNode, impactedEdgeIdSet } = useOmniStore();

  const nodeMap = useMemo(() => {
    const map = new Map<string, GraphNode>();
    nodes.forEach((n) => map.set(n.id, n));
    return map;
  }, [nodes]);

  return (
    <group>
      {edges.map((edge) => {
        const sourceNode = nodeMap.get(edge.source);
        const targetNode = nodeMap.get(edge.target);

        if (!sourceNode || !targetNode || !sourceNode.position || !targetNode.position) {
          return null;
        }

        const isImpacted = impactedEdgeIdSet.has(edge.id);
        const isSelectedEdge =
          selectedNode?.id === edge.source || selectedNode?.id === edge.target;

        return (
          <EdgeLine
            key={edge.id}
            sourcePos={sourceNode.position}
            targetPos={targetNode.position}
            edge={edge}
            isImpacted={isImpacted}
            isSelectedEdge={isSelectedEdge}
          />
        );
      })}
    </group>
  );
};
