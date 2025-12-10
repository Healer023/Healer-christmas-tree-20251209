import React, { useMemo, useRef, useLayoutEffect, useEffect } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { FontLoader } from 'three/addons/loaders/FontLoader.js';
import { TextGeometry } from 'three/addons/geometries/TextGeometry.js';
import { MeshSurfaceSampler } from 'three/addons/math/MeshSurfaceSampler.js';
import { AppState, ParticleData } from '../types';
import { CONFIG, COLORS } from '../constants';

interface ChristmasParticlesProps {
  appState: AppState;
}

const tempObject = new THREE.Object3D();
const tempVec3 = new THREE.Vector3();

export const ChristmasParticles: React.FC<ChristmasParticlesProps> = ({ appState }) => {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const { camera, pointer } = useThree();

  // Interaction Setup
  const raycaster = useMemo(() => new THREE.Raycaster(), []);
  const plane = useMemo(() => new THREE.Plane(new THREE.Vector3(0, 0, 1), 0), []);
  const mouse3D = useRef(new THREE.Vector3());
  
  // Initialize particles with Position Systems
  const particles = useMemo(() => {
    const data: ParticleData[] = [];
    const colorNeedleLight = new THREE.Color(COLORS.needleLight);
    const colorNeedleDark = new THREE.Color(COLORS.needleDark);
    const colorGold = new THREE.Color(COLORS.gold);
    const colorGoldHot = new THREE.Color(COLORS.goldHot);

    for (let i = 0; i < CONFIG.particleCount; i++) {
      // 1. Determine Type
      const isOrnament = Math.random() > 0.85;
      
      // 2. SCATTER POSITION
      const u = Math.random();
      const v = Math.random();
      const theta = 2 * Math.PI * u;
      const phi = Math.acos(2 * v - 1);
      const r = CONFIG.scatterRadius * Math.cbrt(Math.random());
      const scatterPos = new THREE.Vector3(
        r * Math.sin(phi) * Math.cos(theta),
        r * Math.sin(phi) * Math.sin(theta),
        r * Math.cos(phi)
      );

      // 3. TREE POSITION
      const hPercent = Math.random(); 
      const y = (hPercent - 0.5) * CONFIG.treeHeight;
      const currentRadius = CONFIG.treeBaseRadius * (1 - hPercent);
      const angle = i * 0.5 + Math.random() * 0.5;
      const radiusNoise = (Math.random() - 0.5) * 0.5;
      const finalRadius = Math.max(0, currentRadius + radiusNoise);

      const treePos = new THREE.Vector3(
        Math.cos(angle) * finalRadius,
        y,
        Math.sin(angle) * finalRadius
      );

      // 4. Color & Scale
      let color;
      let scale;
      if (isOrnament) {
         color = Math.random() > 0.5 ? colorGold : colorGoldHot;
         scale = Math.random() * 0.15 + 0.1;
      } else {
         color = Math.random() > 0.5 ? colorNeedleLight : colorNeedleDark;
         scale = Math.random() * 0.08 + 0.02;
      }

      data.push({
        id: i,
        scatterPosition: scatterPos,
        treePosition: treePos,
        textPosition: scatterPos.clone(), // Default to scatter, updated later
        currentPosition: scatterPos.clone(), // Start at scatter
        color: color,
        scale: scale,
        rotationSpeed: new THREE.Vector3(Math.random(), Math.random(), Math.random()),
        type: isOrnament ? 'ornament' : 'needle'
      });
    }
    return data;
  }, []);

  // Load Font and Calculate Text Positions
  useEffect(() => {
    const loader = new FontLoader();
    // Using a standard font available online
    loader.load('https://threejs.org/examples/fonts/helvetiker_bold.typeface.json', (font) => {
      
      // Configuration for Text Geometries
      const textConfig = {
        font: font,
        curveSegments: 12,
        bevelEnabled: false, // Disable bevel for sharper particles
        depth: 0.05,        // Very thin
      };

      // 1. Create WYX Geometry (Larger, Top)
      const geo1 = new TextGeometry('W  Y  X', {
        ...textConfig,
        size: 2.8, 
      });
      geo1.center();

      // 2. Create Happy Birthday Geometry (Smaller, Bottom)
      // Added spaces between letters to reduce density and improve readability
      const geo2 = new TextGeometry('H a p p y   B i r t h d a y', {
        ...textConfig,
        size: 1.6, // 增大字体尺寸以提高可读性
      });
      geo2.center();

      // 3. Create Samplers
      const mesh1 = new THREE.Mesh(geo1);
      const mesh2 = new THREE.Mesh(geo2);
      const sampler1 = new MeshSurfaceSampler(mesh1).build();
      const sampler2 = new MeshSurfaceSampler(mesh2).build();
      const tempSamplePos = new THREE.Vector3();

      // 4. Distribute particles
      // Allocate ~25% to WYX (3 big letters) and 75% to Happy Birthday (spread out for better visibility)
      const splitIndex = Math.floor(particles.length * 0.25);

      particles.forEach((p, i) => {
        if (i < splitIndex) {
            sampler1.sample(tempSamplePos);
            // Position WYX higher
            tempSamplePos.y += 2.0; 
        } else {
            sampler2.sample(tempSamplePos);
            // Position Happy Birthday lower
            tempSamplePos.y -= 1.5;
        }

        // Apply minimal jitter for clean lines
        tempSamplePos.x += (Math.random() - 0.5) * 0.02;
        tempSamplePos.y += (Math.random() - 0.5) * 0.02;
        tempSamplePos.z += (Math.random() - 0.5) * 0.02;

        // Lift entire text block up relative to the cake
        tempSamplePos.y += 4.5; 

        p.textPosition.copy(tempSamplePos);
      });
    });
  }, [particles]);

  // Set initial colors
  useLayoutEffect(() => {
    if (meshRef.current) {
      particles.forEach((p, i) => {
        meshRef.current!.setColorAt(i, p.color);
      });
      meshRef.current.instanceColor!.needsUpdate = true;
    }
  }, [particles]);

  // Animation Loop
  useFrame((state, delta) => {
    if (!meshRef.current) return;

    const time = state.clock.getElapsedTime();
    
    // -- INTERACTION UPDATE --
    raycaster.setFromCamera(pointer, camera);
    const hit = raycaster.ray.intersectPlane(plane, tempVec3);
    if (hit) {
      mouse3D.current.copy(hit);
    }

    // Determine State and Interaction
    const isScattered = appState === AppState.SCATTERED;
    const isText = appState === AppState.TEXT_SHAPE;
    // Allow mouse interaction in Scattered or Text mode
    const isInteractionActive = isScattered || isText; 

    particles.forEach((particle, i) => {
      // 1. Determine Target
      let target: THREE.Vector3;
      if (appState === AppState.TREE_SHAPE) {
        target = particle.treePosition;
      } else if (appState === AppState.TEXT_SHAPE) {
        target = particle.textPosition;
      } else {
        target = particle.scatterPosition;
      }

      // 2. Interpolate Current Position to Target
      // Variable speed depending on state for effect
      const lerpSpeed = isText ? 2.0 : 2.5;
      particle.currentPosition.lerp(target, delta * lerpSpeed);
      
      const pos = particle.currentPosition.clone();

      // 3. Apply Mouse Repulsion (Interactive)
      if (isInteractionActive && hit) {
        const dist = pos.distanceTo(mouse3D.current);
        const repulsionRadius = 8.0; 
        
        if (dist < repulsionRadius) {
          const strength = (repulsionRadius - dist) / repulsionRadius; // 0..1
          
          // Vector from mouse to particle
          const dx = pos.x - mouse3D.current.x;
          const dy = pos.y - mouse3D.current.y;
          const dz = pos.z - mouse3D.current.z;
          
          const len = Math.sqrt(dx*dx + dy*dy + dz*dz);
          if (len > 0.01) {
            // Push away
            const push = 5.0 * strength; 
            pos.x += (dx / len) * push;
            pos.y += (dy / len) * push;
            pos.z += (dz / len) * push;
          }
        }
      }

      // 4. Add Hover/Noise
      const noiseAmp = isScattered ? 0.5 : 0.1;
      const noiseFreq = isScattered ? 0.5 : 1.5;
      const hoverY = Math.sin(time * noiseFreq + particle.id) * noiseAmp;
      
      // 5. Set Matrix
      tempObject.position.copy(pos);
      tempObject.position.y += hoverY;
      
      // Rotate particle
      tempObject.rotation.x = time * particle.rotationSpeed.x;
      tempObject.rotation.y = time * particle.rotationSpeed.y;
      
      // Scale pulsing
      let scaleMult = 1;
      if (particle.type === 'ornament') {
          scaleMult = 1 + Math.sin(time * 3 + particle.id) * 0.2; 
      }
      
      // Adjust scale for text legibility
      // Slightly larger particles for better text visibility
      if (isText) scaleMult *= 0.7; // 从0.5增加到0.7，让文字更清晰 

      tempObject.scale.setScalar(particle.scale * scaleMult);
      
      tempObject.updateMatrix();
      meshRef.current!.setMatrixAt(i, tempObject.matrix);
    });

    meshRef.current.instanceMatrix.needsUpdate = true;
  });

  const isTextMode = appState === AppState.TEXT_SHAPE;

  return (
    <instancedMesh
      ref={meshRef}
      args={[undefined, undefined, CONFIG.particleCount]}
      castShadow
      receiveShadow
    >
      <dodecahedronGeometry args={[1, 0]} />
      <meshStandardMaterial
        roughness={0.1}
        metalness={0.8}
        emissiveIntensity={isTextMode ? 1.2 : 0.5} // 文本模式下增加发光强度
        toneMapped={false}
      />
    </instancedMesh>
  );
};