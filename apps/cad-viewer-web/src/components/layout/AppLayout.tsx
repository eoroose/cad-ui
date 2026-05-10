import React, { useState } from 'react';
import SceneTreePanel from '../tree/SceneTreePanel';
import CADCanvas from '../viewer/CADCanvas';
import UploadModal from '../upload/UploadModal';
import JobToast from '../jobs/JobToast';

export default function AppLayout() {
  const [showUpload, setShowUpload] = useState(false);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: '#0f0f0f' }}>
      {/* Header */}
      <header style={{ height: '48px', background: '#1a1a1a', borderBottom: '1px solid #333', display: 'flex', alignItems: 'center', padding: '0 1rem', gap: '1rem', flexShrink: 0 }}>
        <span style={{ fontWeight: 'bold', color: '#e0e0e0' }}>CAD Viewer</span>
        <button
          onClick={() => setShowUpload(true)}
          style={{ marginLeft: 'auto', padding: '0.4rem 1rem', background: '#2563eb', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
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
