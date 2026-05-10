import { create } from 'zustand';
import type { SceneDetailResponse, SceneNodeDTO } from '@cad/shared-types';

interface CadStore {
  scene: SceneDetailResponse | null;
  nodes: SceneNodeDTO[];
  selectedNodeId: string | null;
  activeJobId: string | null;
  activeSceneId: string | null;
  setScene: (scene: SceneDetailResponse) => void;
  setSelectedNode: (id: string | null) => void;
  setActiveJob: (jobId: string, sceneId: string) => void;
  clearActiveJob: () => void;
}

export const useCadStore = create<CadStore>((set) => ({
  scene: null,
  nodes: [],
  selectedNodeId: null,
  activeJobId: null,
  activeSceneId: null,
  setScene: (scene) => set({ scene, nodes: scene.nodes }),
  setSelectedNode: (id) => set({ selectedNodeId: id }),
  setActiveJob: (jobId, sceneId) => set({ activeJobId: jobId, activeSceneId: sceneId }),
  clearActiveJob: () => set({ activeJobId: null, activeSceneId: null }),
}));
