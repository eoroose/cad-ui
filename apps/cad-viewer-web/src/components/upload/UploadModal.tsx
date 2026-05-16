import React, { useEffect, useRef, useState } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { useQueryClient } from '@tanstack/react-query';
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
  const [step, setStep] = useState<'upload' | 'name' | 'confirming'>('upload');
  const [modelName, setModelName] = useState('');
  const [pendingSceneId, setPendingSceneId] = useState<string | null>(null);
  const [pendingS3Key, setPendingS3Key] = useState<string | null>(null);
  const [nameInputFocused, setNameInputFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const nameInputRef = useRef<HTMLInputElement>(null);
  const setActiveJob = useCadStore((s) => s.setActiveJob);
  const setActivePanel = useCadStore((s) => s.setActivePanel);
  const queryClient = useQueryClient();

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

      setModelName(file.name.replace(/\.(step|stp)$/i, ''));
      setPendingSceneId(sceneId);
      setPendingS3Key(s3Key);
      setUploading(false);
      setStep('name');
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Upload failed';
      toast.error(msg);
      setUploading(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) uploadFile(file);
  };

  async function handleStartImport() {
    if (!modelName.trim() || !pendingSceneId || !pendingS3Key) return;
    setStep('confirming');
    setUploading(true);
    try {
      const { jobId, sceneId } = await confirmUpload(pendingSceneId, pendingS3Key, modelName.trim());
      setActiveJob(jobId, sceneId);
      setActivePanel('models');
      queryClient.invalidateQueries({ queryKey: ['scenes'] });
      onClose();
    } catch {
      toast.error('Import failed — please try again');
      setStep('name');
      setUploading(false);
    }
  }

  useEffect(() => {
    if (step === 'name') nameInputRef.current?.select();
  }, [step]);

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
      <div style={{ background: '#1a1a1a', borderRadius: '8px', padding: '2rem', minWidth: '400px', maxWidth: '500px', width: '100%' }}>
        <h2 style={{ color: '#e0e0e0', marginBottom: '1rem' }}>Import Model</h2>

        {/* Stepper */}
        <div style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:0, marginBottom:'20px' }}>
          {/* File node */}
          <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:'4px' }}>
            <div style={{ width:'12px', height:'12px', borderRadius:'50%', background: step==='upload'?'#2563eb':'#22c55e' }} />
            <span style={{ fontSize:'11px', color:'#6b7280' }}>File</span>
          </div>
          <div style={{ width:'32px', height:'1px', background:'#374151', marginBottom:'14px' }} />
          {/* Name node */}
          <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:'4px' }}>
            <div style={{ width:'12px', height:'12px', borderRadius:'50%',
              background: step==='name'||step==='confirming' ? (step==='confirming'?'#22c55e':'#2563eb') : 'transparent',
              border: step==='upload' ? '1px solid #4b5563' : 'none' }} />
            <span style={{ fontSize:'11px', color:'#6b7280' }}>Name</span>
          </div>
          <div style={{ width:'32px', height:'1px', background:'#374151', marginBottom:'14px' }} />
          {/* Done node */}
          <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:'4px' }}>
            <div style={{ width:'12px', height:'12px', borderRadius:'50%',
              background: step==='confirming' ? '#2563eb' : 'transparent',
              border: step!=='confirming' ? '1px solid #4b5563' : 'none' }} />
            <span style={{ fontSize:'11px', color:'#6b7280' }}>Done</span>
          </div>
        </div>

        {/* Upload step: drop zone */}
        {step === 'upload' && (
          <>
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
          </>
        )}

        {/* Name/confirming step: model naming */}
        {(step === 'name' || step === 'confirming') && (
          <div style={{ display:'flex', flexDirection:'column', gap:'12px' }}>
            <h3 style={{ fontSize:'15px', color:'#e5e7eb', fontWeight:600, margin:0 }}>Name your model</h3>
            <div>
              <input
                ref={nameInputRef}
                value={modelName}
                onChange={(e) => setModelName(e.target.value.slice(0, 50))}
                onFocus={() => setNameInputFocused(true)}
                onBlur={() => setNameInputFocused(false)}
                disabled={step === 'confirming'}
                style={{ width:'100%', background:'#111827', color:'#e5e7eb', fontSize:'14px',
                  border: nameInputFocused ? '1px solid #3b82f6' : '1px solid #374151',
                  borderRadius:'6px', padding:'8px 10px', outline:'none', boxSizing:'border-box' }}
              />
              <div style={{ fontSize:'11px', color: modelName.length === 50 ? '#ef4444' : '#6b7280', textAlign:'right', marginTop:'4px' }}>
                {modelName.length} / 50
              </div>
            </div>
            <div style={{ background:'#14532d', color:'#86efac', padding:'0.75rem', borderRadius:'6px', fontSize:'13px' }}>
              ✓ Upload complete. Name your model before processing.
            </div>
            <button
              onClick={handleStartImport}
              disabled={!modelName.trim() || step === 'confirming'}
              style={{ background:'#2563eb', color:'#fff', border:'none', borderRadius:'6px', height:'40px',
                cursor: !modelName.trim() || step === 'confirming' ? 'not-allowed' : 'pointer',
                opacity: !modelName.trim() || step === 'confirming' ? 0.4 : 1, fontSize:'14px', fontWeight:500 }}
            >
              {step === 'confirming' ? 'Starting…' : 'Start Import'}
            </button>
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
          <button
            onClick={onClose}
            disabled={uploading || step === 'confirming'}
            style={{ padding: '0.5rem 1rem', background: '#333', color: '#e0e0e0', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
