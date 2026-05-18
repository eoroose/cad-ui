import * as THREE from 'three';

/**
 * Module-level quaternion shared between the main Canvas (writes)
 * and GnomonCanvas (reads) every frame via useFrame.
 * NOT React state — intentionally mutable to avoid per-frame re-renders.
 */
export const gnomonQuaternion = new THREE.Quaternion();

/**
 * Called from main Canvas CameraSync useFrame.
 * Copies main camera orientation into the shared ref.
 */
export function updateGnomonCamera(q: THREE.Quaternion): void {
  gnomonQuaternion.copy(q);
}
