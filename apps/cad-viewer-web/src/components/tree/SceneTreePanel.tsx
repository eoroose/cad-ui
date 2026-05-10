import React, { useState } from 'react';
import { useCadStore } from '../../store/cadStore';
import type { SceneNodeDTO } from '@cad/shared-types';

interface TreeNodeProps {
  node: SceneNodeDTO;
  allNodes: SceneNodeDTO[];
  depth: number;
}

function TreeNode({ node, allNodes, depth }: TreeNodeProps) {
  const [expanded, setExpanded] = useState(true);
  const selectedNodeId = useCadStore((s) => s.selectedNodeId);
  const setSelectedNode = useCadStore((s) => s.setSelectedNode);

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
        <p>No scene loaded.</p>
        <p style={{ marginTop: '0.5rem' }}>Upload a STEP file to see the assembly tree.</p>
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
