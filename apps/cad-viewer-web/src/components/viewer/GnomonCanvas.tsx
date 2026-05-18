import React, { useMemo } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { gnomonQuaternion } from './gnomonBridge';

// STEP/CAD convention: Z is up. The GLTF scene is rotated -π/2 on X
// which maps STEP axes into Three.js world space as:
//   STEP X  →  Three.js X   (1, 0,  0)
//   STEP Y  →  Three.js -Z  (0, 0, -1)
//   STEP Z  →  Three.js Y   (0, 1,  0)  ← "up" in the viewer
const AXES = [
  { dir: [1, 0,  0] as [number, number, number], color: '#ef4444' }, // X red
  { dir: [0, 0, -1] as [number, number, number], color: '#22c55e' }, // Y green
  { dir: [0, 1,  0] as [number, number, number], color: '#3b82f6' }, // Z blue (up)
] as const;

const Y_UP = new THREE.Vector3(0, 1, 0);

/** Single colored arrow: cylinder shaft + cone tip, rotated to face `dir`. */
function AxisArrow({ dir, color }: { dir: [number, number, number]; color: string }) {
  const quat = useMemo(() => {
    const q = new THREE.Quaternion();
    q.setFromUnitVectors(Y_UP, new THREE.Vector3(...dir));
    return q;
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <group quaternion={quat}>
      {/* shaft */}
      <mesh position={[0, 0.32, 0]}>
        <cylinderGeometry args={[0.028, 0.028, 0.5, 10]} />
        <meshBasicMaterial color={color} />
      </mesh>
      {/* arrowhead cone */}
      <mesh position={[0, 0.72, 0]}>
        <coneGeometry args={[0.09, 0.28, 10]} />
        <meshBasicMaterial color={color} />
      </mesh>
    </group>
  );
}

/**
 * GnomonInner — camera orbits the origin tracking the main camera's rotation.
 * Position = (0,0,4) rotated by main camera quaternion → always looks at origin.
 * Up vector synced so the gnomon doesn't roll unexpectedly.
 */
function GnomonInner() {
  const { camera } = useThree();

  useFrame(() => {
    const q = gnomonQuaternion;
    // Place camera on the surface of a sphere around origin, same direction as main camera
    camera.position.set(0, 0, 4).applyQuaternion(q);
    // Keep up vector consistent with main camera
    camera.up.set(0, 1, 0).applyQuaternion(q);
    // Always face the axes at origin
    camera.lookAt(0, 0, 0);
  });

  return (
    <group>
      {AXES.map(({ dir, color }) => (
        <AxisArrow key={color} dir={dir} color={color} />
      ))}
    </group>
  );
}

export default function GnomonCanvas() {
  return (
    <Canvas
      camera={{ fov: 40, position: [0, 0, 4], near: 0.1, far: 100 }}
      style={{ background: 'transparent', width: '100%', height: '100%' }}
      gl={{ alpha: true, antialias: true }}
    >
      <GnomonInner />
    </Canvas>
  );
}
