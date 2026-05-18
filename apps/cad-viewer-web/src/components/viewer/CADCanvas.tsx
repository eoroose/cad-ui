import React, { Suspense, useEffect } from 'react';
import * as THREE from 'three';
import { Canvas, useFrame } from '@react-three/fiber';
import { useThree } from '@react-three/fiber';
import { OrbitControls, Grid, PerformanceMonitor } from '@react-three/drei';
import SceneLoader from './SceneLoader';
import { updateGnomonCamera } from './gnomonBridge';
import GnomonCanvas from './GnomonCanvas';
import { useCadStore } from '../../store/cadStore';

function LoadingFallback() {
  return null; // Canvas handles loading state via Suspense
}

/** Copies main camera quaternion into the gnomon bridge ref each frame. */
function CameraSync() {
  useFrame(({ camera }) => {
    updateGnomonCamera(camera.quaternion as THREE.Quaternion);
  });
  return null;
}

function SceneBackground() {
  const bgMode = useCadStore((s) => s.bgMode);
  const { scene } = useThree();
  useEffect(() => {
    scene.background = new THREE.Color(bgMode === 'dark' ? '#0f0f0f' : '#f0f0f0');
    return () => { scene.background = null; };
  }, [bgMode, scene]);
  return null;
}

export default function CADCanvas() {
  const scene = useCadStore((s) => s.scene);
  const bgMode = useCadStore((s) => s.bgMode);
  const isDark = bgMode === 'dark';

  return (
    <div style={{ width: '100%', height: '100%', background: isDark ? '#0f0f0f' : '#f0f0f0', position: 'relative' }}>
      <Canvas
        camera={{ fov: 45, position: [5, 5, 5], near: 0.01, far: 10000 }}
        gl={{ antialias: true }}
        shadows
      >
        <PerformanceMonitor>
          <SceneBackground />
          {/* Lighting */}
          <ambientLight intensity={0.5} />
          <directionalLight position={[10, 10, 5]} intensity={1} castShadow />
          <directionalLight position={[-10, -10, -5]} intensity={0.3} />

          {/* Grid */}
          <Grid
            args={[20, 20]}
            cellSize={0.5}
            cellThickness={0.5}
            cellColor={isDark ? '#2a2a2a' : '#c0c0c0'}
            sectionSize={2}
            sectionThickness={1}
            sectionColor={isDark ? '#444' : '#999'}
            fadeDistance={30}
            fadeStrength={1}
            followCamera={false}
            infiniteGrid
          />

          {/* Controls */}
          <OrbitControls makeDefault enableDamping dampingFactor={0.05} />

          <CameraSync />

          {/* Scene */}
          {scene?.mergedGlbUrl && (
            <Suspense fallback={<LoadingFallback />}>
              <SceneLoader glbUrl={scene.mergedGlbUrl} />
            </Suspense>
          )}
        </PerformanceMonitor>
      </Canvas>

      <div style={{ position: 'absolute', bottom: '8px', left: '8px', width: '120px', height: '120px', zIndex: 10, pointerEvents: 'none' }}>
        <GnomonCanvas />
      </div>

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
