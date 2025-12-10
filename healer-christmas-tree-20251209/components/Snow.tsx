import React, { useRef, useMemo } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';

const COUNT = 3500; // Much denser snow
const BOUNDS_X = 30;
const BOUNDS_Y = 25;
const BOUNDS_Z = 30;

export const Snow: React.FC = () => {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const { viewport, camera, pointer } = useThree();
  const dummy = useMemo(() => new THREE.Object3D(), []);
  
  // Store particle physics data
  // [x, y, z, fallSpeed, driftOffset, size, vx, vz]
  // vx and vz are for wind velocity
  const particles = useMemo(() => {
    const data = new Float32Array(COUNT * 8);
    for (let i = 0; i < COUNT; i++) {
      const i8 = i * 8;
      data[i8] = (Math.random() - 0.5) * BOUNDS_X * 2;     // x
      data[i8 + 1] = (Math.random() - 0.5) * BOUNDS_Y * 2; // y
      data[i8 + 2] = (Math.random() - 0.5) * BOUNDS_Z * 2; // z
      data[i8 + 3] = 0.01 + Math.random() * 0.04;          // fallSpeed (slower)
      data[i8 + 4] = Math.random() * Math.PI * 2;          // driftOffset
      data[i8 + 5] = 0.02 + Math.random() * 0.04;          // size (smaller)
      data[i8 + 6] = 0;                                    // vx
      data[i8 + 7] = 0;                                    // vz
    }
    return data;
  }, []);

  const planeNormal = new THREE.Vector3(0, 0, 1);
  const planeConstant = 0;
  const plane = new THREE.Plane(planeNormal, planeConstant);
  const raycaster = new THREE.Raycaster();
  const mouse3D = new THREE.Vector3();
  const prevMouse3D = useRef(new THREE.Vector3());
  const mouseVelocity = useRef(new THREE.Vector3());

  useFrame((state, delta) => {
    if (!meshRef.current) return;

    const time = state.clock.getElapsedTime();
    
    // 1. Calculate Mouse Position in 3D
    raycaster.setFromCamera(pointer, camera);
    const intersect = new THREE.Vector3();
    raycaster.ray.intersectPlane(plane, intersect);
    
    if (intersect) {
        // 2. Calculate Mouse Velocity (Wind)
        // We smooth the velocity a bit or just take raw delta
        mouseVelocity.current.subVectors(intersect, prevMouse3D.current).divideScalar(delta);
        // Clamp velocity to avoid explosion on large jumps (e.g. entering screen)
        mouseVelocity.current.clampLength(0, 20);
        
        prevMouse3D.current.copy(intersect);
        mouse3D.copy(intersect);
    }

    const windForceX = mouseVelocity.current.x * 0.1; // Strength factor
    const windForceZ = mouseVelocity.current.z * 0.1; // Approximate Z influence via Y movement or similar? 
    // Actually, on 2D screen, mouse Y maps to 3D Y usually, but we want "depth" wind? 
    // Let's just use Mouse X for X wind, and Mouse Y for Y push, but snow falls down.
    // Let's map Mouse Y velocity to Z wind for a "swirling" effect.
    const windForceZ_Mapped = mouseVelocity.current.y * 0.1;

    for (let i = 0; i < COUNT; i++) {
      const i8 = i * 8;
      
      // -- READ STATE --
      let x = particles[i8];
      let y = particles[i8 + 1];
      let z = particles[i8 + 2];
      const speed = particles[i8 + 3];
      const offset = particles[i8 + 4];
      const size = particles[i8 + 5];
      let vx = particles[i8 + 6];
      let vz = particles[i8 + 7];

      // -- UPDATE PHYSICS --

      // 1. Apply natural fall
      y -= speed;

      // 2. Apply natural sine drift
      x += Math.sin(time + offset) * 0.01;

      // 3. Apply Mouse Wind (Distance based influence)
      // Check distance to "wind source" (current mouse pos)
      // We affect particles in a cylinder along the Z axis (since mouse is 2D projection)
      // Or just spherical distance to the projected point.
      const dx = x - mouse3D.x;
      const dy = y - mouse3D.y;
      const distSq = dx*dx + dy*dy; // 2D distance for "screen feel"
      
      if (distSq < 25) { // Radius of influence
         const dist = Math.sqrt(distSq);
         const influence = (5 - dist) / 5; // 0 to 1
         
         // Add velocity based on mouse movement
         vx += windForceX * influence * 0.5;
         vz += windForceZ_Mapped * influence * 0.5;
      }

      // 4. Apply Velocity (Inertia)
      x += vx * delta;
      z += vz * delta;

      // 5. Drag / Damping (Air resistance)
      vx *= 0.95;
      vz *= 0.95;

      // -- BOUNDARY CHECKS --
      if (y < -BOUNDS_Y) {
        y = BOUNDS_Y;
        x = (Math.random() - 0.5) * BOUNDS_X * 2;
        z = (Math.random() - 0.5) * BOUNDS_Z * 2;
        // Reset velocity on respawn
        vx = 0;
        vz = 0;
      }
      
      // Wrap X/Z for infinite field feel
      if (x > BOUNDS_X) x -= BOUNDS_X * 2;
      if (x < -BOUNDS_X) x += BOUNDS_X * 2;
      if (z > BOUNDS_Z) z -= BOUNDS_Z * 2;
      if (z < -BOUNDS_Z) z += BOUNDS_Z * 2;

      // -- WRITE STATE --
      particles[i8] = x;
      particles[i8 + 1] = y;
      particles[i8 + 2] = z;
      particles[i8 + 6] = vx;
      particles[i8 + 7] = vz;

      // -- UPDATE INSTANCE --
      dummy.position.set(x, y, z);
      dummy.scale.setScalar(size);
      
      // Rotate snow slightly
      dummy.rotation.x = time * 0.2 + offset;
      dummy.rotation.y = time * 0.1 + offset;
      
      dummy.updateMatrix();
      meshRef.current.setMatrixAt(i, dummy.matrix);
    }
    
    meshRef.current.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, COUNT]}>
      <dodecahedronGeometry args={[1, 0]} />
      <meshBasicMaterial color="#ffffff" transparent opacity={0.7} />
    </instancedMesh>
  );
};