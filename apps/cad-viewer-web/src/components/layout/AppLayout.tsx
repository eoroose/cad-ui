import React, { useState } from 'react';
import { useCadStore } from '../../store/cadStore';
import { ActivityBar } from '../sidebar/ActivityBar';
import SceneListPanel from '../sidebar/SceneListPanel';
import SceneTreePanel from '../tree/SceneTreePanel';
import CADCanvas from '../viewer/CADCanvas';
import UploadModal from '../upload/UploadModal';
import JobToast from '../jobs/JobToast';

export default function AppLayout() {
  const [showUpload, setShowUpload] = useState(false);
  const bumpFitCamera = useCadStore((s) => s.bumpFitCamera);
  const bgMode = useCadStore((s) => s.bgMode);
  const setBgMode = useCadStore((s) => s.setBgMode);
  const activePanel = useCadStore((s) => s.activePanel);
  const setActivePanel = useCadStore((s) => s.setActivePanel);

  const panelOpen = activePanel !== null;
  function handlePanelSelect(panel: 'models' | 'assembly' | null) {
    setActivePanel(activePanel === panel ? null : panel);
  }

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
        {/* Left sidebar */}
        <aside style={{ display:'flex', flexDirection:'row', width: panelOpen ? '260px' : '48px',
          background:'#1a1a1a', borderRight:'1px solid #333', flexShrink:0,
          transition:'width 150ms ease-in-out', overflow:'hidden', height:'100%', boxSizing:'border-box' }}>
          <ActivityBar activePanel={activePanel} onSelect={handlePanelSelect} />
          {panelOpen && (
            <div style={{ width:'212px', height:'100%', overflowY:'auto', overflowX:'hidden', flexShrink:0 }}>
              {activePanel === 'models' && <SceneListPanel onOpenUpload={() => setShowUpload(true)} />}
              {activePanel === 'assembly' && <SceneTreePanel />}
            </div>
          )}
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
