import React, { useState } from 'react';
import { useCadStore } from '../../store/cadStore';
import SceneTreePanel from '../tree/SceneTreePanel';
import CADCanvas from '../viewer/CADCanvas';
import UploadModal from '../upload/UploadModal';
import JobToast from '../jobs/JobToast';

export default function AppLayout() {
  const [showUpload, setShowUpload] = useState(false);
  const bumpFitCamera = useCadStore((s) => s.bumpFitCamera);
  const bgMode = useCadStore((s) => s.bgMode);
  const setBgMode = useCadStore((s) => s.setBgMode);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', backgroundColor: bgMode === 'dark' ? '#0f0f0f' : '#f0f0f0' }}>
      {/* Header */}
      <header style={{ height: '48px', background: '#1a1a1a', borderBottom: '1px solid #333', display: 'flex', alignItems: 'center', padding: '0 1rem', gap: '1rem', flexShrink: 0 }}>
        <span style={{ fontWeight: 'bold', color: '#e0e0e0' }}>CAD Viewer</span>
        <button
          onClick={bumpFitCamera}
          style={{ marginLeft: 'auto', padding: '0.4rem 1rem', background: '#374151', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
        >
          Reset View
        </button>
        <button
          onClick={() => setBgMode(bgMode === 'dark' ? 'light' : 'dark')}
          style={{ marginLeft: '8px', padding: '0.4rem 1rem', background: '#374151', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
        >
          {bgMode === 'dark' ? 'Light Mode' : 'Dark Mode'}
        </button>
        <button
          onClick={() => setShowUpload(true)}
          style={{ marginLeft: '8px', padding: '0.4rem 1rem', background: '#2563eb', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
        >
          Upload STEP
        </button>
      </header>

      {/* Main content */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        {/* Left sidebar — assembly tree */}
        <aside style={{ width: '260px', background: '#1a1a1a', borderRight: '1px solid #333', overflow: 'auto', flexShrink: 0 }}>
          <SceneTreePanel />
        </aside>

        {/* 3D canvas */}
        <main style={{ flex: 1, position: 'relative' }}>
          <CADCanvas />
        </main>
      </div>

      {showUpload && <UploadModal onClose={() => setShowUpload(false)} />}
      <JobToast />
    </div>
  );
}
