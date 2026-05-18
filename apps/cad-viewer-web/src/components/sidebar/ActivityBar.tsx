import React, { useRef, useState } from 'react';
import LayersIcon from '@mui/icons-material/Layers';
import AccountTreeIcon from '@mui/icons-material/AccountTree';

interface ActivityBarProps {
  activePanel: 'models' | 'assembly' | null;
  onSelect: (panel: 'models' | 'assembly' | null) => void;
}

export function ActivityBar({ activePanel, onSelect }: ActivityBarProps) {
  const [hovered, setHovered] = useState<'models' | 'assembly' | null>(null);
  const [focused, setFocused] = useState<'models' | 'assembly' | null>(null);
  const modelsRef = useRef<HTMLButtonElement>(null);
  const assemblyRef = useRef<HTMLButtonElement>(null);

  const navStyle: React.CSSProperties = {
    width: '48px',
    height: '100%',
    background: '#1a1a1a',
    borderRight: '1px solid #2d2d2d',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    paddingTop: '4px',
    flexShrink: 0,
    boxSizing: 'border-box',
  };

  const buttonBaseStyle: React.CSSProperties = {
    width: '48px',
    height: '48px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderTop: 'none',
    borderRight: 'none',
    borderBottom: 'none',
    background: 'transparent',
    cursor: 'pointer',
    paddingTop: 0,
    paddingRight: 0,
    paddingBottom: 0,
    position: 'relative',
    outline: 'none',
    boxSizing: 'border-box',
  };

  function getButtonStyle(panel: 'models' | 'assembly'): React.CSSProperties {
    const isFocused = focused === panel;
    const isHovered = hovered === panel;
    const isActive = activePanel === panel;

    return {
      ...buttonBaseStyle,
      background: isFocused
        ? 'rgba(59,130,246,0.15)'
        : isHovered
          ? 'rgba(255,255,255,0.06)'
          : 'transparent',
      borderLeft: isActive ? '2px solid #e5e7eb' : 'none',
      paddingLeft: isActive ? '2px' : 0,
    };
  }

  function getIconColor(panel: 'models' | 'assembly'): string {
    if (focused === panel) return '#e5e7eb';
    if (hovered === panel) return '#d1d5db';
    if (activePanel === panel) return '#e5e7eb';
    return '#6b7280';
  }

  function handleKeyDown(
    e: React.KeyboardEvent<HTMLButtonElement>,
    panel: 'models' | 'assembly',
  ): void {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (panel === 'models') {
        assemblyRef.current?.focus();
      } else {
        modelsRef.current?.focus();
      }
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (panel === 'models') {
        assemblyRef.current?.focus();
      } else {
        modelsRef.current?.focus();
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onSelect(null);
    }
  }

  return (
    <nav aria-label="Sidebar panels" style={navStyle}>
      <div role="toolbar" aria-orientation="vertical">
        {/* Models button */}
        <button
          ref={modelsRef}
          aria-label="Models"
          aria-pressed={activePanel === 'models'}
          title="Models"
          style={getButtonStyle('models')}
          onClick={() => onSelect('models')}
          onMouseEnter={() => setHovered('models')}
          onMouseLeave={() => setHovered(null)}
          onFocus={() => setFocused('models')}
          onBlur={() => setFocused(null)}
          onKeyDown={(e) => handleKeyDown(e, 'models')}
        >
          <LayersIcon style={{ fontSize: 20, color: getIconColor('models') }} />
        </button>

        {/* Assembly button */}
        <button
          ref={assemblyRef}
          aria-label="Assembly"
          aria-pressed={activePanel === 'assembly'}
          title="Assembly"
          style={getButtonStyle('assembly')}
          onClick={() => onSelect('assembly')}
          onMouseEnter={() => setHovered('assembly')}
          onMouseLeave={() => setHovered(null)}
          onFocus={() => setFocused('assembly')}
          onBlur={() => setFocused(null)}
          onKeyDown={(e) => handleKeyDown(e, 'assembly')}
        >
          <AccountTreeIcon style={{ fontSize: 20, color: getIconColor('assembly') }} />
        </button>
      </div>
    </nav>
  );
}