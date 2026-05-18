import React from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { gnomonQuaternion } from './gnomonBridge';

/**
 * GnomonInner — lives inside <Canvas>, reads the shared quaternion ref.
 * Positions its camera at a fixed radius from origin, applies main camera
 * rotation so axes appear to rotate with the scene.
 */
function GnomonInner() {
  const { camera } = useThree();

  useFrame(() => {
    camera.quaternion.copy(gnomonQuaternion);
    camera.position.set(0, 0, 3).applyQuaternion(gnomonQuaternion);
    // Do NOT call camera.lookAt() here — it would override the quaternion
  });

  return <axesHelper args={[0.8]} />;
}

/**
 * GnomonCanvas — a 100×100px absolutely positioned overlay Canvas.
 * Renders only when mounted (inside CADCanvas wrapper div).
 * pointer-events: none so it doesn't intercept mouse events.
 */
export default function GnomonCanvas() {
  return (
    <Canvas
      camera={{ fov: 50, position: [0, 0, 3], near: 0.1, far: 100 }}
      style={{ background: 'transparent', width: '100%', height: '100%' }}
      gl={{ alpha: true, antialias: true }}
    >
      <GnomonInner />
    </Canvas>
  );
}
