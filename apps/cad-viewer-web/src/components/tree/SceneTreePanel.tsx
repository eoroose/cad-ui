import React, { useState } from 'react';
import { useCadStore } from '../../store/cadStore';
import type { SceneNodeDTO } from '@cad/shared-types';
import VisibilityIcon from '@mui/icons-material/Visibility';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';
import BorderOuterIcon from '@mui/icons-material/BorderOuter';
import OpacityIcon from '@mui/icons-material/Opacity';

interface TreeNodeProps {
  node: SceneNodeDTO;
  allNodes: SceneNodeDTO[];
  depth: number;
}

function TreeNode({ node, allNodes, depth }: TreeNodeProps) {
  const [expanded, setExpanded] = useState(true);
  const [rowHovered, setRowHovered] = useState(false);
  const selectedNodeId = useCadStore((s) => s.selectedNodeId);
  const setSelectedNode = useCadStore((s) => s.setSelectedNode);
  const setHoveredNode = useCadStore((s) => s.setHoveredNode);
  const visibilityOverrides = useCadStore((s) => s.visibilityOverrides);
  const wireframeOverrides = useCadStore((s) => s.wireframeOverrides);
  const transparencyOverrides = useCadStore((s) => s.transparencyOverrides);
  const toggleVisibility = useCadStore((s) => s.toggleVisibility);
  const toggleWireframe = useCadStore((s) => s.toggleWireframe);
  const toggleTransparency = useCadStore((s) => s.toggleTransparency);

  const isHidden = visibilityOverrides[node.id] === false;
  const isWireframe = wireframeOverrides[node.id] === true;
  const isTransparent = transparencyOverrides[node.id] === true;

  const children = allNodes.filter((n) => n.parentId === node.id);
  const hasChildren = children.length > 0;
  const isSelected = selectedNodeId === node.id;

  return (
    <div>
      <div
        onClick={() => {
          setSelectedNode(isSelected ? null : node.id);
          console.log('Selected node:', node.name, node.id);
        }}
        onMouseEnter={() => { setHoveredNode(node.id); setRowHovered(true); }}
        onMouseLeave={() => { setHoveredNode(null); setRowHovered(false); }}
        style={{
          display: 'flex',
          alignItems: 'center',
          padding: '4px 8px',
          paddingLeft: `${8 + depth * 16}px`,
          cursor: 'pointer',
          background: isSelected ? '#1e3a5f' : 'transparent',
          color: isSelected ? '#93c5fd' : '#ccc',
          fontSize: '0.85rem',
          userSelect: 'none',
          position: 'relative',
        }}
      >
        {hasChildren && (
          <span
            onClick={(e) => { e.stopPropagation(); setExpanded(!expanded); }}
            style={{ marginRight: '4px', width: '12px', display: 'inline-block', color: '#666' }}
          >
            {expanded ? '▾' : '▸'}
          </span>
        )}
        {!hasChildren && <span style={{ marginRight: '4px', width: '12px', display: 'inline-block' }} />}
        <span title={node.name} style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {node.name}
        </span>

        <div
          style={{
            position: 'absolute',
            right: '4px',
            top: '50%',
            transform: 'translateY(-50%)',
            display: 'flex',
            gap: '2px',
            opacity: (rowHovered || isHidden || isWireframe || isTransparent) ? 1 : 0,
            transition: 'opacity 150ms ease',
            pointerEvents: (rowHovered || isHidden || isWireframe || isTransparent) ? 'auto' : 'none',
          }}
        >
          <button
            onClick={(e) => { e.stopPropagation(); toggleVisibility(node.id); }}
            title={isHidden ? 'Show' : 'Hide'}
            style={{ background: isHidden ? '#ef4444' : 'transparent', border: 'none', cursor: 'pointer', padding: '2px', borderRadius: '2px', color: isHidden ? '#fff' : '#9ca3af', lineHeight: 1, display: 'flex', alignItems: 'center' }}
          >
            {isHidden
              ? <VisibilityOffIcon style={{ fontSize: 14 }} />
              : <VisibilityIcon style={{ fontSize: 14 }} />}
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); toggleWireframe(node.id); }}
            title={isWireframe ? 'Disable Outline' : 'Show Outline'}
            style={{ background: isWireframe ? '#3b82f6' : 'transparent', border: 'none', cursor: 'pointer', padding: '2px', borderRadius: '2px', color: isWireframe ? '#fff' : '#9ca3af', lineHeight: 1, display: 'flex', alignItems: 'center' }}
          >
            <BorderOuterIcon style={{ fontSize: 14 }} />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); toggleTransparency(node.id); }}
            title={isTransparent ? 'Disable Transparency' : 'Make Transparent'}
            style={{ background: isTransparent ? '#8b5cf6' : 'transparent', border: 'none', cursor: 'pointer', padding: '2px', borderRadius: '2px', color: isTransparent ? '#fff' : '#9ca3af', lineHeight: 1, display: 'flex', alignItems: 'center' }}
          >
            <OpacityIcon style={{ fontSize: 14 }} />
          </button>
        </div>
      </div>

      {expanded && hasChildren && children.map((child) => (
        <TreeNode key={child.id} node={child} allNodes={allNodes} depth={depth + 1} />
      ))}
    </div>
  );
}

export default function SceneTreePanel() {
  const nodes = useCadStore((s) => s.nodes);
  const scene = useCadStore((s) => s.scene);

  const rootNodes = nodes.filter((n) => n.parentId === null);

  if (!scene) {
    return (
      <div style={{ padding: '1rem', color: '#666', fontSize: '0.85rem' }}>
        <p>No model loaded.</p>
        <p style={{ marginTop: '0.5rem' }}>Select a model from Models to begin.</p>
      </div>
    );
  }

  return (
    <div>
      <div style={{ padding: '8px 12px', fontSize: '0.75rem', color: '#888', borderBottom: '1px solid #2a2a2a', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
        Assembly Tree ({nodes.length} nodes)
      </div>
      {rootNodes.map((node) => (
        <TreeNode key={node.id} node={node} allNodes={nodes} depth={0} />
      ))}
    </div>
  );
}
