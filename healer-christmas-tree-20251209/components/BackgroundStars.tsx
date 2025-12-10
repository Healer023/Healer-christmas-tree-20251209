import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { COLORS } from '../constants';

export const BackgroundStars: React.FC = () => {
  const ref = useRef<THREE.Points>(null);

  const [positions, colors] = useMemo(() => {
    const count = 2000;
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    
    // Palette for stars: Gold, Emerald, Blue-White, Pure White
    const colorOptions = [
      new THREE.Color(COLORS.gold).multiplyScalar(0.8),
      new THREE.Color(COLORS.needleLight).multiplyScalar(0.8),
      new THREE.Color('#aaccff').multiplyScalar(0.6), 
      new THREE.Color('#ffffff').multiplyScalar(0.7)
    ];

    for (let i = 0; i < count; i++) {
      // Distribute in a thick spherical shell far from center (Radius 40 to 90)
      const r = 40 + Math.random() * 50;
      const theta = 2 * Math.PI * Math.random();
      const phi = Math.acos(2 * Math.random() - 1);
      
      positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      positions[i * 3 + 2] = r * Math.cos(phi);

      const color = colorOptions[Math.floor(Math.random() * colorOptions.length)];
      colors[i * 3] = color.r;
      colors[i * 3 + 1] = color.g;
      colors[i * 3 + 2] = color.b;
    }
    
    return [positions, colors];
  }, []);

  useFrame((state, delta) => {
    if (ref.current) {
      // Constant slow rotation for "universe" feeling
      ref.current.rotation.y += delta * 0.01;
      
      // Subtle Parallax Effect based on Mouse Pointer
      // This rotates the entire starfield slightly based on mouse position
      // creating a sense that the background is a distinct layer with depth.
      const { x, y } = state.pointer;
      
      // Target rotations
      const targetRotX = -y * 0.05; // Tilt up/down
      const targetRotZ = x * 0.05;  // Tilt left/right
      
      // Smoothly interpolate current rotation offset
      // We add this to the constant rotation logic by modifying the matrix or just local rotation
      // Since we are already rotating Y, let's just apply these as small tilts.
      // Note: modifying rotation.x/z while rotating y can be tricky due to Euler order, 
      // but for small angles it's fine.
      
      ref.current.rotation.x = THREE.MathUtils.lerp(ref.current.rotation.x, targetRotX, delta * 2);
      ref.current.rotation.z = THREE.MathUtils.lerp(ref.current.rotation.z, targetRotZ, delta * 2);
    }
  });

  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute 
          attach="attributes-position" 
          count={positions.length / 3} 
          array={positions} 
          itemSize={3} 
        />
        <bufferAttribute 
          attach="attributes-color" 
          count={colors.length / 3} 
          array={colors} 
          itemSize={3} 
        />
      </bufferGeometry>
      <pointsMaterial 
        size={0.25} 
        vertexColors 
        transparent 
        opacity={0.8} 
        sizeAttenuation={true} 
        blending={THREE.AdditiveBlending}
        depthWrite={false}
      />
    </points>
  );
};