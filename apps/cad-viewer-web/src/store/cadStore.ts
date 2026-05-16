import { create } from 'zustand';
import type { SceneDetailResponse, SceneNodeDTO } from '@cad/shared-types';

interface CadStore {
  scene: SceneDetailResponse | null;
  nodes: SceneNodeDTO[];
  selectedNodeId: string | null;
  hoveredNodeId: string | null;
  activeJobId: string | null;
  activeSceneId: string | null;
  fitCameraVersion: number;
  bgMode: 'dark' | 'light';
  setScene: (scene: SceneDetailResponse) => void;
  setSelectedNode: (id: string | null) => void;
  setHoveredNode: (id: string | null) => void;
  bumpFitCamera: () => void;
  setBgMode: (mode: 'dark' | 'light') => void;
  setActiveJob: (jobId: string, sceneId: string) => void;
  clearActiveJob: () => void;
  activePanel: 'models' | 'assembly' | null;
  setActivePanel: (panel: 'models' | 'assembly' | null) => void;
}

export const useCadStore = create<CadStore>((set) => ({
  scene: null,
  nodes: [],
  selectedNodeId: null,
  hoveredNodeId: null,
  activeJobId: null,
  activeSceneId: null,
  fitCameraVersion: 0,
  bgMode: 'dark',
  setScene: (scene) => set({ scene, nodes: scene.nodes }),
  setSelectedNode: (id) => set({ selectedNodeId: id }),
  setHoveredNode: (id) => set({ hoveredNodeId: id }),
  bumpFitCamera: () => set((s) => ({ fitCameraVersion: s.fitCameraVersion + 1 })),
  setBgMode: (mode) => set({ bgMode: mode }),
  setActiveJob: (jobId, sceneId) => set({ activeJobId: jobId, activeSceneId: sceneId }),
  clearActiveJob: () => set({ activeJobId: null, activeSceneId: null }),
  activePanel: 'models',
  setActivePanel: (panel) => set({ activePanel: panel }),
}));
