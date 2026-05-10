import React, { useEffect } from 'react';
import { useGLTF } from '@react-three/drei';
import { useCadStore } from '../../store/cadStore';

interface Props {
  glbUrl: string;
}

export default function SceneLoader({ glbUrl }: Props) {
  const { scene: gltfScene } = useGLTF(glbUrl);
  const nodes = useCadStore((s) => s.nodes);

  useEffect(() => {
    // Sync GLB node names with scene.json nodes for future selection support
    if (nodes.length > 0) {
      gltfScene.traverse((obj) => {
        const match = nodes.find((n) => n.name === obj.name || n.externalId === obj.name);
        if (match) {
          obj.userData.sceneNodeId = match.id;
        }
      });
    }
  }, [gltfScene, nodes]);

  return <primitive object={gltfScene} />;
}
