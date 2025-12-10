import React from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Environment, PerspectiveCamera } from '@react-three/drei';
import { EffectComposer, Bloom, Vignette } from '@react-three/postprocessing';
import { ChristmasParticles } from './ChristmasParticles';
import { StarTop } from './StarTop';
import { Snow } from './Snow';
import { BirthdayCake } from './BirthdayCake';
import { BackgroundStars } from './BackgroundStars';
import { AppState } from '../types';
import { COLORS } from '../constants';

interface SceneProps {
  appState: AppState;
}

export const Scene: React.FC<SceneProps> = ({ appState }) => {
  return (
    <div className="w-full h-screen bg-gradient-to-b from-[#050f16] via-[#021a12] to-[#010e08]">
      {/* Reduced DPR max to 1.5 to improve performance on high-res mobile screens */}
      <Canvas dpr={[1, 1.5]} shadows>
        {/* Adjusted camera position for larger tree */}
        <PerspectiveCamera makeDefault position={[0, 4, 30]} fov={50} />
        
        {/* Lights */}
        <ambientLight intensity={0.5} color={COLORS.needleLight} />
        <pointLight position={[10, 10, 10]} intensity={1.5} color="#ffffff" castShadow />
        <pointLight position={[-10, 5, -10]} intensity={0.8} color={COLORS.gold} />
        <spotLight 
          position={[0, 20, 0]} 
          angle={0.6} 
          penumbra={0.5} 
          intensity={2} 
          color={COLORS.goldHot}
          castShadow 
        />

        {/* Core Content */}
        <group position={[0, -4, 0]}>
          <ChristmasParticles appState={appState} />
          <StarTop appState={appState} />
          <BirthdayCake appState={appState} />
        </group>
        
        {/* Atmospheric Effects */}
        <Snow />
        <BackgroundStars />

        {/* Environment Reflections - 使用更可靠的预设或自定义 HDR */}
        {/* 方案1: 使用其他预设（推荐，更稳定） */}
        {/* <Environment 
          preset="night"
          background={false}
          environmentIntensity={0.4}
        /> */}
        
        {/* 方案2: 如果想使用自定义 HDR 文件，可以使用以下代码（取消注释） */}
        
        <Environment 
          files="/forest_slope_1k.hdr"
          // files="https://cdn.jsdelivr.net/gh/pmndrs/drei-assets@master/hdri/forest_slope_1k.hdr"
          background={false}
          environmentIntensity={0.4}
        />
       

        {/* Controls */}
        <OrbitControls 
          enablePan={false} 
          minPolarAngle={Math.PI / 4} 
          maxPolarAngle={Math.PI / 1.8}
          minDistance={15}
          maxDistance={50}
          autoRotate={appState === AppState.TREE_SHAPE}
          autoRotateSpeed={0.8}
        />

        {/* Cinematic Effects */}
        <EffectComposer disableNormalPass>
          <Bloom 
            luminanceThreshold={1.1} // Only very bright things bloom (hot gold)
            mipmapBlur 
            intensity={1.8} 
            radius={0.6}
          />
          <Bloom 
            luminanceThreshold={0.5} // Softer bloom for everything else
            mipmapBlur 
            intensity={0.4} 
            radius={0.8}
          />
          <Vignette eskil={false} offset={0.1} darkness={0.6} />
        </EffectComposer>
      </Canvas>
    </div>
  );
};