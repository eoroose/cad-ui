import { z } from 'zod';

// ── scene.json runtime format ─────────────────────────────────────────────────
export const SceneNodeSchema = z.object({
  id: z.string(),
  externalId: z.string(),
  name: z.string(),
  parentId: z.string().nullable(),
  transformMatrix: z.array(z.number()).length(16),
  jointType: z.string().nullable().optional(),
  jointAxis: z.array(z.number()).optional(),
});
export type SceneNode = z.infer<typeof SceneNodeSchema>;

export const SceneJsonSchema = z.object({
  schemaVersion: z.literal('1.0'),
  sceneId: z.string(),
  nodeCount: z.number().int().nonnegative(),
  nodes: z.array(SceneNodeSchema),
});
export type SceneJson = z.infer<typeof SceneJsonSchema>;

// ── API request schemas ───────────────────────────────────────────────────────
export const LoginRequestSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});
export type LoginRequest = z.infer<typeof LoginRequestSchema>;

export const PresignRequestSchema = z.object({
  filename: z.string().min(1),
  contentType: z.string().min(1),
  sizeBytes: z.number().int().positive(),
});
export type PresignRequest = z.infer<typeof PresignRequestSchema>;

export const ConfirmRequestSchema = z.object({
  sceneId: z.string().min(1),
  s3Key: z.string().min(1),
  name: z.string().optional(),
});
export type ConfirmRequest = z.infer<typeof ConfirmRequestSchema>;
