import React, { useMemo } from 'react';
import * as THREE from 'three';
import { useGraphStore, GraphEdge, GraphNode } from '../../store/useGraphStore';

interface EdgeLineProps {
  sourcePos: [number, number, number];
  targetPos: [number, number, number];
  edge: GraphEdge;
  isImpacted: boolean;
  isSelectedEdge: boolean;
  edgeColor: string;
  highlightColor: string;
}

const EdgeLine: React.FC<EdgeLineProps> = ({
  sourcePos,
  targetPos,
  edge,
  isImpacted,
  isSelectedEdge,
  edgeColor,
  highlightColor,
}) => {
  const points = useMemo(() => {
    const p1 = new THREE.Vector3(...sourcePos);
    const p2 = new THREE.Vector3(...targetPos);
    return [p1, p2];
  }, [sourcePos, targetPos]);

  const lineGeometry = useMemo(() => {
    return new THREE.BufferGeometry().setFromPoints(points);
  }, [points]);

  const getEdgeColor = () => {
    if (isImpacted) return highlightColor; // Alert / risk color for blast radius
    if (isSelectedEdge) return '#00f2fe';
    return edgeColor;
  };

  const color = getEdgeColor();
  const opacity = isImpacted ? 0.95 : isSelectedEdge ? 0.85 : edge.type === 'CONTAINS' ? 0.35 : 0.6;

  const line = useMemo(() => {
    const mat = new THREE.LineBasicMaterial({
      color: new THREE.Color(color),
      transparent: true,
      opacity: opacity,
    });
    return new THREE.Line(lineGeometry, mat);
  }, [lineGeometry]);

  React.useEffect(() => {
    if (line && line.material) {
      const mat = line.material as THREE.LineBasicMaterial;
      mat.color.set(color);
      mat.opacity = opacity;
      mat.needsUpdate = true;
    }
  }, [line, color, opacity]);

  return <primitive object={line} />;
};

export const GraphEdges: React.FC = () => {
  const { nodes, edges, selectedNode, impactedEdgeIdSet, edgeColor, highlightColor } = useGraphStore();

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
            edgeColor={edgeColor}
            highlightColor={highlightColor}
          />
        );
      })}
    </group>
  );
};

