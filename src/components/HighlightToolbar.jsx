import React from 'react';
import { Highlighter } from 'lucide-react';

export const HIGHLIGHT_COLORS = [
  { id: 'yellow', name: 'Yellow', bg: '#fef08a', border: '#eab308' },
  { id: 'green', name: 'Green', bg: '#bbf7d0', border: '#22c55e' },
  { id: 'pink', name: 'Pink', bg: '#fbcfe8', border: '#ec4899' },
  { id: 'blue', name: 'Blue', bg: '#bfdbfe', border: '#3b82f6' },
  { id: 'orange', name: 'Orange', bg: '#fed7aa', border: '#f97316' },
];

export default function HighlightToolbar({ activeColor, onSelectColor }) {
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: 6,
      background: 'white',
      padding: '4px 10px',
      borderRadius: 20,
      border: '1px solid #cbd5e1',
      boxShadow: '0 1px 3px rgba(0,0,0,0.08)'
    }}>
      <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#475569', display: 'flex', alignItems: 'center', gap: 4, marginRight: 2 }}>
        <span style={{ width: 8, height: 8, borderRadius: '50%', background: activeColor?.bg || '#fde047' }} />
        Highlight:
      </span>
      {HIGHLIGHT_COLORS.map(c => {
        const isSelected = activeColor?.id === c.id;
        return (
          <button
            key={c.id}
            onClick={() => onSelectColor(c)}
            title={`Highlight with ${c.name}`}
            style={{
              width: 20,
              height: 20,
              borderRadius: '50%',
              background: c.bg,
              border: isSelected ? `2.5px solid ${c.border}` : `1px solid #cbd5e1`,
              cursor: 'pointer',
              transform: isSelected ? 'scale(1.18)' : 'scale(1)',
              transition: 'all 0.15s ease',
              padding: 0
            }}
          />
        );
      })}
    </div>
  );
}
