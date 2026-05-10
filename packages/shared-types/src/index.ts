// ── Status unions ─────────────────────────────────────────────────────────────
export type SceneStatus = 'PENDING' | 'PROCESSING' | 'READY' | 'FAILED';
export type JobStatus = 'PENDING' | 'ACTIVE' | 'COMPLETED' | 'FAILED';
export type AssetType = 'STEP' | 'GLB' | 'SCENE_JSON' | 'THUMBNAIL';

// ── Matrix ────────────────────────────────────────────────────────────────────
export type Matrix4Tuple = [
  number, number, number, number,
  number, number, number, number,
  number, number, number, number,
  number, number, number, number,
];

// ── DTOs ──────────────────────────────────────────────────────────────────────
export interface ErrorResponse {
  error: string;
  code: string;
  details?: unknown;
}

export interface UserDTO {
  id: string;
  email: string;
  createdAt: string;
}

export interface SceneDTO {
  id: string;
  userId: string;
  name: string;
  status: SceneStatus;
  nodeCount: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface JobDTO {
  id: string;
  sceneId: string;
  bullJobId: string;
  status: JobStatus;
  progress: number;
  errorMessage: string | null;
  startedAt: string | null;
  completedAt: string | null;
  createdAt: string;
}

export interface AssetDTO {
  id: string;
  sceneId: string;
  assetType: AssetType;
  s3Key: string;
  sizeBytes: number;
  mimeType: string;
  downloadUrl?: string;
}

export interface SceneNodeDTO {
  id: string;
  sceneId: string;
  externalId: string;
  name: string;
  parentId: string | null;
  transformMatrix: number[];
  jointType: string | null;
  jointAxis: number[];
}

// ── Request / Response shapes ─────────────────────────────────────────────────
export interface PresignResponse {
  uploadUrl: string;
  s3Key: string;
  sceneId: string;
  expiresAt: string;
}

export interface ConfirmResponse {
  jobId: string;
  sceneId: string;
  status: JobStatus;
}

export interface SceneDetailResponse extends SceneDTO {
  mergedGlbUrl: string | null;
  sceneJsonUrl: string | null;
  nodes: SceneNodeDTO[];
  latestJob: JobDTO | null;
}

export interface PaginatedScenesResponse {
  scenes: SceneDTO[];
  total: number;
  limit: number;
  offset: number;
}
