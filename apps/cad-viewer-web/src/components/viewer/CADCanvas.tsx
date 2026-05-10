import React, { Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Grid, PerformanceMonitor } from '@react-three/drei';
import SceneLoader from './SceneLoader';
import { useCadStore } from '../../store/cadStore';

function LoadingFallback() {
  return null; // Canvas handles loading state via Suspense
}

export default function CADCanvas() {
  const scene = useCadStore((s) => s.scene);

  return (
    <div style={{ width: '100%', height: '100%' }}>
      <Canvas
        camera={{ fov: 45, position: [5, 5, 5], near: 0.01, far: 10000 }}
        gl={{ antialias: true }}
        shadows
      >
        <PerformanceMonitor>
          {/* Lighting */}
          <ambientLight intensity={0.5} />
          <directionalLight position={[10, 10, 5]} intensity={1} castShadow />
          <directionalLight position={[-10, -10, -5]} intensity={0.3} />

          {/* Grid */}
          <Grid
            args={[20, 20]}
            cellSize={0.5}
            cellThickness={0.5}
            cellColor="#2a2a2a"
            sectionSize={2}
            sectionThickness={1}
            sectionColor="#444"
            fadeDistance={30}
            fadeStrength={1}
            followCamera={false}
            infiniteGrid
          />

          {/* Controls */}
          <OrbitControls makeDefault enableDamping dampingFactor={0.05} />

          {/* Scene */}
          {scene?.mergedGlbUrl && (
            <Suspense fallback={<LoadingFallback />}>
              <SceneLoader glbUrl={scene.mergedGlbUrl} />
            </Suspense>
          )}
        </PerformanceMonitor>
      </Canvas>

      {!scene && (
        <div style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#666',
          pointerEvents: 'none',
        }}>
          <p>Upload a STEP file to begin</p>
        </div>
      )}
    </div>
  );
}
