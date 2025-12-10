import React, { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { COLORS, CONFIG } from '../constants';
import { AppState } from '../types';

interface StarTopProps {
  appState: AppState;
}

export const StarTop: React.FC<StarTopProps> = ({ appState }) => {
  const meshRef = useRef<THREE.Mesh>(null);

  const starShape = useMemo(() => {
    const shape = new THREE.Shape();
    const points = 5;
    const outerRadius = 0.8;
    const innerRadius = 0.35;

    for (let i = 0; i < points * 2; i++) {
      const angle = (i * Math.PI) / points;
      const radius = i % 2 === 0 ? outerRadius : innerRadius;
      const x = Math.cos(angle) * radius;
      const y = Math.sin(angle) * radius;
      if (i === 0) shape.moveTo(x, y);
      else shape.lineTo(x, y);
    }
    shape.closePath();
    return shape;
  }, []);

  const extrudeSettings = useMemo(() => ({
    depth: 0.2,
    bevelEnabled: true,
    bevelSegments: 2,
    steps: 1,
    bevelSize: 0.1,
    bevelThickness: 0.1
  }), []);

  useFrame((state, delta) => {
    if (!meshRef.current) return;

    // Rotate the star
    meshRef.current.rotation.y += delta * 0.5;

    // Bobbing motion
    meshRef.current.position.y = (CONFIG.treeHeight / 2) + 0.5 + Math.sin(state.clock.elapsedTime * 1.5) * 0.1;

    // Scale effect based on state
    const targetScale = appState === AppState.TREE_SHAPE ? 1 : 0.01;
    meshRef.current.scale.lerp(new THREE.Vector3(targetScale, targetScale, targetScale), delta * 2);
  });

  return (
    <mesh ref={meshRef} position={[0, CONFIG.treeHeight / 2, 0]} castShadow>
      <extrudeGeometry args={[starShape, extrudeSettings]} />
      <meshStandardMaterial 
        color={COLORS.goldHot} 
        emissive={COLORS.gold}
        emissiveIntensity={2}
        roughness={0.2}
        metalness={1}
      />
    </mesh>
  );
};