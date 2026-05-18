import React, { useEffect } from 'react';
import { useGLTF } from '@react-three/drei';
import { useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { useCadStore } from '../../store/cadStore';

interface Props {
  glbUrl: string;
}

export default function SceneLoader({ glbUrl }: Props) {
  const { scene: gltfScene } = useGLTF(glbUrl);
  const nodes = useCadStore((s) => s.nodes);
  const hoveredNodeId = useCadStore((s) => s.hoveredNodeId);
  const selectedNodeId = useCadStore((s) => s.selectedNodeId);
  const fitCameraVersion = useCadStore((s) => s.fitCameraVersion);
  const visibilityOverrides = useCadStore((s) => s.visibilityOverrides);
  const wireframeOverrides = useCadStore((s) => s.wireframeOverrides);
  const transparencyOverrides = useCadStore((s) => s.transparencyOverrides);
  const { camera, controls } = useThree();

  useEffect(() => {
    if (nodes.length === 0) return;

    // Pass 1: tag any object whose name matches a scene node (may be a Group or Mesh)
    gltfScene.traverse((obj) => {
      const match = nodes.find((n) => n.name === obj.name || n.externalId === obj.name);
      if (match) obj.userData.sceneNodeId = match.id;
    });

    // Pass 2: propagate sceneNodeId to Mesh descendants via parent-chain walk,
    // then clone materials so emissive changes don't bleed across shared instances.
    // Needed because RWGltf_CafWriter exports named Groups with unnamed Mesh children.
    gltfScene.traverse((obj) => {
      if (!(obj instanceof THREE.Mesh)) return;
      if (!obj.userData.sceneNodeId) {
        let cur: THREE.Object3D | null = obj.parent;
        while (cur) {
          if (cur.userData.sceneNodeId) { obj.userData.sceneNodeId = cur.userData.sceneNodeId; break; }
          cur = cur.parent;
        }
      }
      if (obj.userData.sceneNodeId && obj.material instanceof THREE.MeshStandardMaterial && !obj.userData.materialCloned) {
        obj.material = obj.material.clone();
        obj.userData.materialCloned = true;
        obj.userData.originalEmissive = obj.material.emissive.getHex();
        obj.userData.originalOpacity = obj.material.opacity;
        obj.userData.originalTransparent = obj.material.transparent;
      }
    });
  }, [gltfScene, nodes]);

  useEffect(() => {
    gltfScene.traverse((obj) => {
      if (!(obj instanceof THREE.Mesh) || !obj.userData.sceneNodeId) return;
      const mat = obj.material as THREE.MeshStandardMaterial;
      if (!(mat instanceof THREE.MeshStandardMaterial)) return;
      if (obj.userData.sceneNodeId === hoveredNodeId) {
        mat.emissive.set('#4488ff');
      } else if (obj.userData.sceneNodeId === selectedNodeId) {
        mat.emissive.set('#ff6600');
      } else {
        mat.emissive.setHex(obj.userData.originalEmissive ?? 0x000000);
      }
    });
  }, [hoveredNodeId, selectedNodeId, gltfScene]);

  useEffect(() => {
    if (!gltfScene) return;
    gltfScene.traverse((obj) => {
      if (!(obj instanceof THREE.Mesh) || !obj.userData.sceneNodeId) return;
      const id = obj.userData.sceneNodeId as string;
      const mat = obj.material;

      const isHidden = visibilityOverrides[id] === false;
      const hasOutline = wireframeOverrides[id] === true;
      const isTransparent = transparencyOverrides[id] === true;

      // Outline: remove existing edge overlay, then re-add if enabled.
      // Green + thicker when outline is active (color differentiates from default white edges).
      const existing = obj.children.filter((c) => c.userData.isOutline);
      existing.forEach((c) => {
        obj.remove(c);
        (c as THREE.LineSegments).geometry?.dispose();
        ((c as THREE.LineSegments).material as THREE.Material)?.dispose();
      });
      if (hasOutline) {
        const edges = new THREE.EdgesGeometry(obj.geometry, 15);
        const lineMat = new THREE.LineBasicMaterial({ color: 0x4ade80, depthTest: false, linewidth: 2 });
        const outline = new THREE.LineSegments(edges, lineMat);
        outline.userData.isOutline = true;
        obj.add(outline);
      }

      // Visibility:
      // - Hidden + no outline  → obj.visible = false (nothing renders)
      // - Hidden + outline     → obj.visible = true so child LineSegments render;
      //                          mesh is made invisible via opacity = 0
      // - Visible              → obj.visible = true, normal material
      if (isHidden && !hasOutline) {
        obj.visible = false;
        return;
      }
      obj.visible = true;

      if (!(mat instanceof THREE.MeshStandardMaterial)) return;

      if (isHidden && hasOutline) {
        // Mesh fully transparent so only the green outline is seen
        mat.transparent = true;
        mat.opacity = 0;
        mat.needsUpdate = true;
        return;
      }

      // Normal visible state: apply transparency toggle
      mat.transparent = isTransparent || (obj.userData.originalTransparent as boolean);
      mat.opacity = isTransparent ? 0.25 : (obj.userData.originalOpacity as number);
      mat.needsUpdate = true;
    });
  }, [visibilityOverrides, wireframeOverrides, transparencyOverrides, gltfScene]);

  useEffect(() => {
    // STEP files use Z-up; GLTF/Three.js uses Y-up. Rotate on the object itself
    // so the bounding box computation sees the corrected orientation.
    gltfScene.rotation.set(-Math.PI / 2, 0, 0);
    gltfScene.updateWorldMatrix(true, true);

    const box = new THREE.Box3().setFromObject(gltfScene);
    if (box.isEmpty()) return;

    const center = box.getCenter(new THREE.Vector3());
    const size = box.getSize(new THREE.Vector3());
    const maxDim = Math.max(size.x, size.y, size.z);

    const fovRad = (camera as THREE.PerspectiveCamera).fov * (Math.PI / 180);
    const distance = (maxDim / 2) / Math.tan(fovRad / 2) * 1.5;

    camera.position.set(center.x + distance * 0.7, center.y + distance * 0.7, center.z + distance);
    const oc = controls as unknown as { target: THREE.Vector3; update: () => void };
    oc.target.copy(center);

    (camera as THREE.PerspectiveCamera).near = maxDim / 1000;
    (camera as THREE.PerspectiveCamera).far = maxDim * 100;
    camera.updateProjectionMatrix();
    oc.update();
  }, [gltfScene, fitCameraVersion]); // separate from annotation and highlight effects

  return <primitive object={gltfScene} />;
}
