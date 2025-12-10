import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { AppState } from '../types';

interface BirthdayCakeProps {
  appState: AppState;
}

export const BirthdayCake: React.FC<BirthdayCakeProps> = ({ appState }) => {
  const groupRef = useRef<THREE.Group>(null);
  const flamesRef = useRef<THREE.InstancedMesh>(null);
  const candleCount = 8;

  // Candle Positions (Circle)
  const candlePositions = useMemo(() => {
    const pos = [];
    const radius = 1.8;
    for (let i = 0; i < candleCount; i++) {
      const angle = (i / candleCount) * Math.PI * 2;
      pos.push({
        x: Math.cos(angle) * radius,
        z: Math.sin(angle) * radius,
      });
    }
    return pos;
  }, []);

  useFrame((state, delta) => {
    if (!groupRef.current) return;

    // Visibility & Scale Animation
    const targetScale = appState === AppState.TEXT_SHAPE ? 1 : 0;
    // Smooth Lerp
    const currentScale = groupRef.current.scale.x;
    const newScale = THREE.MathUtils.lerp(currentScale, targetScale, delta * 2);
    
    groupRef.current.scale.setScalar(newScale);
    
    // Rotate cake slowly
    if (appState === AppState.TEXT_SHAPE) {
      groupRef.current.rotation.y += delta * 0.2;
    }

    // Flicker Flames
    if (flamesRef.current) {
        const time = state.clock.elapsedTime;
        for (let i = 0; i < candleCount; i++) {
            const scale = 1 + Math.sin(time * 10 + i) * 0.2;
            const matrix = new THREE.Matrix4();
            const { x, z } = candlePositions[i];
            
            // Reconstruct matrix for each flame
            matrix.makeTranslation(x, 3.8, z);
            matrix.scale(new THREE.Vector3(scale, scale, scale));
            flamesRef.current.setMatrixAt(i, matrix);
        }
        flamesRef.current.instanceMatrix.needsUpdate = true;
    }
  });

  return (
    <group ref={groupRef} position={[0, -5, 0]} scale={[0, 0, 0]}>
      {/* Bottom Layer */}
      <mesh position={[0, 0.75, 0]} receiveShadow castShadow>
        <cylinderGeometry args={[3.5, 3.5, 1.5, 32]} />
        <meshStandardMaterial color="#f5d0a9" roughness={0.3} /> {/* Sponge */}
      </mesh>
      <mesh position={[0, 0.75, 0]} scale={[1.02, 0.9, 1.02]}>
         <cylinderGeometry args={[3.5, 3.5, 1.5, 32]} />
         <meshStandardMaterial color="#ffb7b2" transparent opacity={0.4} side={THREE.BackSide} /> {/* Glaze */}
      </mesh>

      {/* Top Layer */}
      <mesh position={[0, 2.25, 0]} receiveShadow castShadow>
        <cylinderGeometry args={[2.5, 2.5, 1.5, 32]} />
        <meshStandardMaterial color="#f5d0a9" roughness={0.3} />
      </mesh>
      {/* Icing Drips (Simulated with torus/tubes or just color) */}
      <mesh position={[0, 2.9, 0]}>
        <cylinderGeometry args={[2.6, 2.6, 0.2, 32]} />
        <meshStandardMaterial color="#ffffff" roughness={0.2} /> {/* White Icing */}
      </mesh>

      {/* Candles */}
      {candlePositions.map((pos, i) => (
        <mesh key={i} position={[pos.x, 3.25, pos.z]} castShadow>
          <cylinderGeometry args={[0.08, 0.08, 0.8, 8]} />
          <meshStandardMaterial color={i % 2 === 0 ? "#ff0000" : "#ffffff"} />
        </mesh>
      ))}

      {/* Flames (Instanced) */}
      <instancedMesh ref={flamesRef} args={[undefined, undefined, candleCount]}>
         <dodecahedronGeometry args={[0.1, 0]} />
         <meshBasicMaterial color="#ffaa00" toneMapped={false} />
      </instancedMesh>
      
      {/* Dynamic Light from Cake */}
      <pointLight position={[0, 4, 0]} intensity={2} color="#ffaa00" distance={10} decay={2} />
    </group>
  );
};