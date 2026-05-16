import axios, { AxiosInstance } from 'axios';
import type { PresignResponse, SceneDetailResponse, JobDTO, PaginatedScenesResponse } from '@cad/shared-types';

const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3000/api/v1';

const api: AxiosInstance = axios.create({ baseURL: BASE_URL, withCredentials: true });

// Attach Bearer token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('accessToken');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// On 401: attempt refresh, retry once
let isRefreshing = false;
api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config;
    if (error.response?.status === 401 && !original._retry && !isRefreshing) {
      original._retry = true;
      isRefreshing = true;
      try {
        const res = await axios.post(`${BASE_URL}/auth/refresh`, {}, { withCredentials: true });
        const newToken = res.data.accessToken as string;
        localStorage.setItem('accessToken', newToken);
        original.headers.Authorization = `Bearer ${newToken}`;
        return api(original);
      } catch {
        localStorage.removeItem('accessToken');
        window.location.reload();
      } finally {
        isRefreshing = false;
      }
    }
    return Promise.reject(error);
  },
);

export async function login(email: string, password: string) {
  const res = await api.post('/auth/login', { email, password });
  return res.data as { accessToken: string; user: { id: string; email: string } };
}

export async function presignUpload(
  filename: string,
  contentType: string,
  sizeBytes: number,
): Promise<PresignResponse> {
  const res = await api.post('/upload/presign', { filename, contentType, sizeBytes });
  return res.data;
}

export async function confirmUpload(sceneId: string, s3Key: string, name?: string) {
  const res = await api.post('/upload/confirm', { sceneId, s3Key, name });
  return res.data as { jobId: string; sceneId: string; status: string };
}

export async function getJob(jobId: string): Promise<JobDTO> {
  const res = await api.get(`/jobs/${jobId}`);
  return res.data;
}

export async function getScene(sceneId: string): Promise<SceneDetailResponse> {
  const res = await api.get(`/scenes/${sceneId}`);
  return res.data;
}

export function fetchScenes(
  limit = 20,
  offset = 0,
): Promise<PaginatedScenesResponse> {
  return api.get('/scenes', { params: { limit, offset } }).then((r) => r.data);
}
