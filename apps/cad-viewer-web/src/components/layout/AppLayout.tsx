import React, { useState, useEffect } from 'react';
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
  const [panelWidth, setPanelWidth] = useState(260);
  const [isDragging, setIsDragging] = useState(false);

  useEffect(() => {
    if (!isDragging) return;
    const onMove = (e: MouseEvent) => {
      const next = Math.max(180, Math.min(500, e.clientX));
      setPanelWidth(next);
    };
    const onUp = () => setIsDragging(false);
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
    return () => {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
    };
  }, [isDragging]);

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
        <aside style={{ display:'flex', flexDirection:'row', width: panelOpen ? `${panelWidth}px` : '48px',
          background:'#1a1a1a', borderRight:'1px solid #333', flexShrink:0,
          transition: isDragging ? 'none' : 'width 150ms ease-in-out', overflow:'hidden', height:'100%', boxSizing:'border-box' }}>
          <ActivityBar activePanel={activePanel} onSelect={handlePanelSelect} />
          {panelOpen && (
            <div style={{ width:`${panelWidth - 48}px`, height:'100%', overflowY:'auto', overflowX:'hidden', flexShrink:0 }}>
              {activePanel === 'models' && <SceneListPanel onOpenUpload={() => setShowUpload(true)} />}
              {activePanel === 'assembly' && <SceneTreePanel />}
            </div>
          )}
        </aside>

        {panelOpen && (
          <div
            onMouseDown={(e) => { e.preventDefault(); setIsDragging(true); }}
            style={{ width: '5px', cursor: 'col-resize', background: isDragging ? '#2563eb' : 'transparent', flexShrink: 0, zIndex: 10, transition: 'background 150ms ease' }}
          />
        )}

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
