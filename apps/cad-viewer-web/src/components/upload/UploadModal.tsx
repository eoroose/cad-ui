import React, { useRef, useState } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { presignUpload, confirmUpload } from '../../api/client';
import { useCadStore } from '../../store/cadStore';

const MAX_SIZE = 200 * 1024 * 1024; // 200 MB
const ALLOWED_EXT = ['.step', '.stp'];

interface Props {
  onClose: () => void;
}

export default function UploadModal({ onClose }: Props) {
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const setActiveJob = useCadStore((s) => s.setActiveJob);

  const validateFile = (file: File): string | null => {
    const ext = file.name.slice(file.name.lastIndexOf('.')).toLowerCase();
    if (!ALLOWED_EXT.includes(ext)) return 'Only .step and .stp files are supported';
    if (file.size > MAX_SIZE) return 'File too large (max 200 MB)';
    return null;
  };

  const uploadFile = async (file: File) => {
    const err = validateFile(file);
    if (err) { toast.error(err); return; }

    setUploading(true);
    setProgress(0);
    try {
      // 1. Get presigned PUT URL
      const { uploadUrl, s3Key, sceneId } = await presignUpload(
        file.name,
        file.type || 'application/octet-stream',
        file.size,
      );

      // 2. PUT file directly to MinIO
      await axios.put(uploadUrl, file, {
        headers: { 'Content-Type': file.type || 'application/octet-stream' },
        onUploadProgress: (e) => {
          if (e.total) setProgress(Math.round((e.loaded / e.total) * 100));
        },
      });

      // 3. Confirm upload → enqueue job
      const { jobId } = await confirmUpload(sceneId, s3Key, file.name);
      setActiveJob(jobId, sceneId);
      toast.success('Upload complete — processing started');
      onClose();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Upload failed';
      toast.error(msg);
    } finally {
      setUploading(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) uploadFile(file);
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
      <div style={{ background: '#1a1a1a', borderRadius: '8px', padding: '2rem', minWidth: '400px', maxWidth: '500px', width: '100%' }}>
        <h2 style={{ color: '#e0e0e0', marginBottom: '1rem' }}>Upload STEP File</h2>

        {/* Drop zone */}
        <div
          onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={handleDrop}
          onClick={() => !uploading && inputRef.current?.click()}
          style={{
            border: `2px dashed ${dragging ? '#2563eb' : '#444'}`,
            borderRadius: '8px',
            padding: '2rem',
            textAlign: 'center',
            cursor: uploading ? 'not-allowed' : 'pointer',
            color: '#888',
            marginBottom: '1rem',
            transition: 'border-color 0.2s',
          }}
        >
          {uploading ? (
            <div>
              <p style={{ color: '#e0e0e0', marginBottom: '0.5rem' }}>Uploading… {progress}%</p>
              <div style={{ background: '#333', borderRadius: '4px', height: '8px' }}>
                <div style={{ background: '#2563eb', height: '8px', borderRadius: '4px', width: `${progress}%`, transition: 'width 0.3s' }} />
              </div>
            </div>
          ) : (
            <p>Drag & drop a .step file here, or click to browse</p>
          )}
        </div>

        <input
          ref={inputRef}
          type="file"
          accept=".step,.stp"
          style={{ display: 'none' }}
          onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadFile(f); }}
        />

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
          <button
            onClick={onClose}
            disabled={uploading}
            style={{ padding: '0.5rem 1rem', background: '#333', color: '#e0e0e0', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
