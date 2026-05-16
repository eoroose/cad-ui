import React, { useEffect, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'react-hot-toast';
import { fetchScenes, getScene } from '../../api/client';
import { useCadStore } from '../../store/cadStore';
import type { SceneDTO, PaginatedScenesResponse } from '@cad/shared-types';

interface SceneListPanelProps {
  onOpenUpload: () => void;
}

function mergeScenes(existing: SceneDTO[], incoming: SceneDTO[]): SceneDTO[] {
  const map = new Map(existing.map(s => [s.id, s]));
  for (const s of incoming) map.set(s.id, s);
  const existingIds = new Set(existing.map(s => s.id));
  const newOnes = incoming.filter(s => !existingIds.has(s.id));
  return [...newOnes, ...existing.map(s => map.get(s.id)!)];
}

function relativeAge(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  if (diff < 0) return 'just now';
  if (diff < 60_000) return 'just now';
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`;
  if (diff < 604_800_000) return `${Math.floor(diff / 86_400_000)}d ago`;
  if (diff < 2_592_000_000) return `${Math.floor(diff / 604_800_000)}w ago`;
  return `${Math.floor(diff / 2_592_000_000)}mo ago`;
}

export default function SceneListPanel({ onOpenUpload }: SceneListPanelProps) {
  const scene = useCadStore((s) => s.scene);
  const setScene = useCadStore((s) => s.setScene);

  const [allScenes, setAllScenes] = useState<SceneDTO[]>([]);
  const [total, setTotal] = useState(0);
  const [loadMoreOffset, setLoadMoreOffset] = useState(0);
  const [isFetchingMore, setIsFetchingMore] = useState(false);
  const [loadingRowId, setLoadingRowId] = useState<string | null>(null);
  const [openKebabId, setOpenKebabId] = useState<string | null>(null);
  const [hoveredRowId, setHoveredRowId] = useState<string | null>(null);
  const [pollStartedAt, setPollStartedAt] = useState<number | null>(null);

  const { data, isLoading, isError } = useQuery({
    queryKey: ['scenes'],
    queryFn: () => fetchScenes(20, 0),
    staleTime: 0,
    refetchInterval: (query) => {
      if (pollStartedAt && Date.now() - pollStartedAt > 600_000) return false;
      const hasPending = query.state.data?.scenes.some(
        (s: SceneDTO) => s.status === 'PENDING' || s.status === 'PROCESSING'
      );
      return hasPending ? 3000 : false;
    },
  });

  useEffect(() => {
    if (!data) return;
    setAllScenes(prev => mergeScenes(prev, data.scenes));
    setTotal(data.total);
    const hasPending = data.scenes.some(s => s.status === 'PENDING' || s.status === 'PROCESSING');
    if (hasPending && pollStartedAt === null) setPollStartedAt(Date.now());
    if (!hasPending) setPollStartedAt(null);
  }, [data]);

  useEffect(() => {
    if (!document.getElementById('cad-pulse-style')) {
      const style = document.createElement('style');
      style.id = 'cad-pulse-style';
      style.textContent = '@keyframes cadPulse { 0%,100%{opacity:1} 50%{opacity:0.4} }';
      document.head.appendChild(style);
    }
  }, []);

  useEffect(() => {
    if (!openKebabId) return;
    function handler(e: MouseEvent) {
      setOpenKebabId(null);
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [openKebabId]);

  async function handleLoadMore() {
    setIsFetchingMore(true);
    try {
      const newOffset = loadMoreOffset + 20;
      const res = await fetchScenes(20, newOffset);
      setAllScenes(prev => mergeScenes(prev, res.scenes));
      setTotal(res.total);
      setLoadMoreOffset(newOffset);
    } catch {
      toast.error('Failed to load more');
    } finally {
      setIsFetchingMore(false);
    }
  }

  async function handleRowClick(rowId: string, status: string) {
    if (scene?.id === rowId) return;
    if (status !== 'READY') return;
    setLoadingRowId(rowId);
    try {
      const result = await getScene(rowId);
      setScene(result);
    } catch {
      toast.error('Failed to load — try again', { duration: 4000 });
    } finally {
      setLoadingRowId(null);
    }
  }

  function statusBadge(status: string): { symbol: string; color: string; animated: boolean } {
    switch (status) {
      case 'PENDING': return { symbol: '○', color: '#6b7280', animated: false };
      case 'PROCESSING': return { symbol: '◌', color: '#f59e0b', animated: true };
      case 'READY': return { symbol: '●', color: '#22c55e', animated: false };
      case 'FAILED': return { symbol: '✕', color: '#ef4444', animated: false };
      default: return { symbol: '?', color: '#6b7280', animated: false };
    }
  }

  if (isLoading && allScenes.length === 0) {
    return <div style={{ padding: '16px', color: '#6b7280', fontSize: '13px', textAlign: 'center' }}>Loading…</div>;
  }

  if (isError) {
    return (
      <div style={{ padding: '16px', textAlign: 'center' }}>
        <p style={{ color: '#ef4444', fontSize: '13px' }}>Failed to load models</p>
        <button style={{ color: '#6b7280', fontSize: '12px', background: 'none', border: 'none', cursor: 'pointer' }}>Retry</button>
      </div>
    );
  }

  if (!isLoading && allScenes.length === 0) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '32px 16px', gap: '12px' }}>
        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#4b5563" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
        </svg>
        <p style={{ color: '#9ca3af', fontSize: '14px', margin: 0 }}>No models yet</p>
        <p style={{ color: '#6b7280', fontSize: '12px', margin: 0, textAlign: 'center' }}>Import a STEP file to get started</p>
        <button
          onClick={onOpenUpload}
          style={{ background: '#2563eb', color: '#fff', border: 'none', borderRadius: '6px', height: '32px', padding: '0 16px', cursor: 'pointer', fontSize: '13px' }}
        >
          + Import Model
        </button>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ padding: '12px 12px 8px', borderBottom: '1px solid #252525', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: '15px', color: '#e5e7eb', fontWeight: 500 }}>Models</span>
        <button
          onClick={onOpenUpload}
          style={{ background: 'none', border: '1px solid #374151', color: '#9ca3af', borderRadius: '6px', height: '24px', padding: '0 8px', cursor: 'pointer', fontSize: '12px' }}
        >
          + Import
        </button>
      </div>
      <div style={{ overflowY: 'auto', flex: 1 }}>
        {allScenes.map((row) => {
          const badge = statusBadge(row.status);
          const isActive = scene?.id === row.id;
          const isLoadingThis = loadingRowId === row.id;
          const rowStyle: React.CSSProperties = {
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            height: '48px',
            padding: '0 12px',
            cursor: row.status === 'READY' ? 'pointer' : 'default',
            borderBottom: '1px solid #252525',
            position: 'relative',
            boxSizing: 'border-box',
            background: isLoadingThis ? '#1a2535' : isActive ? '#1e2433' : hoveredRowId === row.id && row.status === 'READY' ? '#1f2937' : 'transparent',
            borderLeft: isActive ? '2px solid #2563eb' : 'none',
            paddingLeft: isActive ? '10px' : '12px',
          };

          return (
            <div
              key={row.id}
              style={rowStyle}
              onClick={() => handleRowClick(row.id, row.status)}
              onMouseEnter={() => setHoveredRowId(row.id)}
              onMouseLeave={() => setHoveredRowId(null)}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '13px', fontWeight: 500, color: isActive ? '#93c5fd' : '#e5e7eb', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1, minWidth: 0 }}>
                  {row.name}
                </span>
                <button
                  onClick={(e) => { e.stopPropagation(); setOpenKebabId(openKebabId === row.id ? null : row.id); }}
                  style={{ visibility: hoveredRowId === row.id ? 'visible' : 'hidden', background: 'none', border: 'none', color: '#6b7280', cursor: 'pointer', padding: '0 4px', fontSize: '16px', lineHeight: 1 }}
                  title="Options"
                  aria-label="Options"
                >⋮</button>
                {openKebabId === row.id && (
                  <div style={{ position: 'absolute', right: '8px', top: '24px', background: '#1f2937', border: '1px solid #374151', borderRadius: '6px', zIndex: 100, minWidth: '120px' }}>
                    {(['Rename', 'Delete', ...(row.status === 'FAILED' ? ['Retry'] : [])] as string[]).map(action => (
                      <button
                        key={action}
                        disabled
                        style={{ display: 'block', width: '100%', padding: '8px 12px', background: 'none', border: 'none', color: '#e5e7eb', opacity: 0.4, cursor: 'not-allowed', fontSize: '13px', textAlign: 'left' }}
                        title="Coming soon"
                      >
                        {action}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <div style={{ fontSize: '11px', color: '#9ca3af', display: 'flex', gap: '4px', alignItems: 'center' }}>
                <span style={{ color: badge.color, animation: badge.animated ? 'cadPulse 0.8s ease-in-out infinite' : undefined }}>
                  {badge.symbol}
                </span>
                <span>{row.status}</span>
                <span>·</span>
                <span>{row.nodeCount != null ? `${row.nodeCount} nodes` : '—'}</span>
                <span>·</span>
                <span>{relativeAge(row.createdAt)}</span>
              </div>
              {(row.status === 'PENDING' || row.status === 'PROCESSING') && pollStartedAt && Date.now() - pollStartedAt > 600_000 && (
                <div style={{ fontSize: '11px', color: '#f59e0b', padding: '2px 12px' }}>Processing is taking longer than expected.</div>
              )}
            </div>
          );
        })}
        {allScenes.length < total && (
          <div style={{ padding: '8px 12px' }}>
            <button
              onClick={handleLoadMore}
              disabled={isFetchingMore}
              style={{ border: '1px solid #374151', background: 'transparent', color: '#9ca3af', borderRadius: '6px', height: '32px', width: '100%', cursor: isFetchingMore ? 'wait' : 'pointer', fontSize: '13px' }}
            >
              {isFetchingMore ? 'Loading…' : `Load more (${total - allScenes.length})`}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
