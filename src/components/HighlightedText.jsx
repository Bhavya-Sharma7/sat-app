import React, { useState, useRef, useEffect } from 'react';
import { BookOpen, Trash2, Check } from 'lucide-react';
import { HIGHLIGHT_COLORS } from './HighlightToolbar';

export default function HighlightedText({
  text,
  blockKey,
  highlights = [],
  activeColor = HIGHLIGHT_COLORS[0],
  onAddHighlight,
  onRemoveHighlight,
  onUpdateHighlight,
  onAddToNotebook, // saves to Question Diary
  style = {},
  className = '',
  tag: Tag = 'p'
}) {
  const containerRef = useRef(null);
  const leaveTimerRef = useRef(null);
  const [activePopover, setActivePopover] = useState(null); // { highlight, x, y }
  const [selectionPopover, setSelectionPopover] = useState(null); // { text, startOffset, endOffset, x, y }
  const [diarySuccess, setDiarySuccess] = useState(false);

  // Filter highlights for this specific block
  const blockHighlights = highlights.filter(h => h.blockKey === blockKey);

  // Handle Text Selection
  const handleMouseUp = (e) => {
    setTimeout(() => {
      const selection = window.getSelection();
      if (!selection || selection.isCollapsed) {
        return;
      }
      const selectedText = selection.toString().trim();
      if (!selectedText) return;

      if (!containerRef.current || !containerRef.current.contains(selection.anchorNode)) {
        return;
      }

      const fullText = text || '';
      let startOffset = fullText.indexOf(selectedText);
      if (startOffset === -1) {
        startOffset = 0;
      }
      const endOffset = startOffset + selectedText.length;

      const range = selection.getRangeAt(0);
      const rect = range.getBoundingClientRect();
      const containerRect = containerRef.current.getBoundingClientRect();

      setSelectionPopover({
        text: selectedText,
        startOffset,
        endOffset,
        x: rect.left - containerRect.left + rect.width / 2,
        y: rect.top - containerRect.top - 42
      });
    }, 10);
  };

  const handleApplySelectionHighlight = (colorObj) => {
    if (!selectionPopover) return;
    const newHighlight = {
      id: 'hl-' + Date.now() + '-' + Math.random().toString(36).substr(2, 5),
      blockKey,
      text: selectionPopover.text,
      startOffset: selectionPopover.startOffset,
      endOffset: selectionPopover.endOffset,
      color: colorObj.bg
    };
    onAddHighlight(newHighlight);
    setSelectionPopover(null);
    window.getSelection()?.removeAllRanges();
  };

  const handleMarkMouseEnter = (e, hl) => {
    e.stopPropagation();
    if (leaveTimerRef.current) {
      clearTimeout(leaveTimerRef.current);
      leaveTimerRef.current = null;
    }
    const markRect = e.currentTarget.getBoundingClientRect();
    const containerRect = containerRef.current.getBoundingClientRect();
    setActivePopover({
      highlight: hl,
      x: markRect.left - containerRect.left + markRect.width / 2,
      y: markRect.top - containerRect.top - 48
    });
  };

  const handleMouseLeaveTarget = () => {
    leaveTimerRef.current = setTimeout(() => {
      setActivePopover(null);
      setSelectionPopover(null);
    }, 180);
  };

  const handleMouseEnterTarget = () => {
    if (leaveTimerRef.current) {
      clearTimeout(leaveTimerRef.current);
      leaveTimerRef.current = null;
    }
  };

  // Close popovers on outside click
  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setActivePopover(null);
        setSelectionPopover(null);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  // Build rendered text nodes
  const renderTextWithHighlights = () => {
    if (!text) return null;
    if (!blockHighlights || blockHighlights.length === 0) {
      return text;
    }

    const sorted = [...blockHighlights].sort((a, b) => (a.startOffset || 0) - (b.startOffset || 0));
    const nodes = [];
    let lastIdx = 0;

    sorted.forEach((hl, i) => {
      let start = hl.startOffset;
      let end = hl.endOffset;

      if (start === undefined || start < 0 || text.substring(start, end) !== hl.text) {
        start = text.indexOf(hl.text, lastIdx);
        if (start === -1) start = text.indexOf(hl.text);
        if (start !== -1) {
          end = start + hl.text.length;
        }
      }

      if (start !== -1 && start >= lastIdx) {
        if (start > lastIdx) {
          nodes.push(text.substring(lastIdx, start));
        }

        const isHovered = activePopover?.highlight?.id === hl.id;

        nodes.push(
          <mark
            key={hl.id || i}
            onMouseEnter={(e) => handleMarkMouseEnter(e, hl)}
            onMouseLeave={handleMouseLeaveTarget}
            onClick={(e) => handleMarkMouseEnter(e, hl)}
            style={{
              backgroundColor: hl.color || '#fef08a',
              color: 'inherit',
              padding: '2px 4px',
              borderRadius: 4,
              cursor: 'pointer',
              boxShadow: isHovered ? '0 0 0 2px rgba(37,99,235,0.4)' : 'none',
              transition: 'all 0.15s ease',
              borderBottom: '2px solid rgba(0,0,0,0.15)'
            }}
          >
            {text.substring(start, end) || hl.text}
          </mark>
        );
        lastIdx = end;
      }
    });

    if (lastIdx < text.length) {
      nodes.push(text.substring(lastIdx));
    }

    return nodes;
  };

  return (
    <Tag
      ref={containerRef}
      onMouseUp={handleMouseUp}
      style={{ position: 'relative', ...style }}
      className={className}
    >
      {renderTextWithHighlights()}

      {/* Floating Popover when text is selected */}
      {selectionPopover && (
        <div
          onMouseEnter={handleMouseEnterTarget}
          onMouseLeave={handleMouseLeaveTarget}
          style={{
            position: 'absolute',
            top: Math.max(0, selectionPopover.y),
            left: selectionPopover.x,
            transform: 'translateX(-50%)',
            background: '#1e293b',
            color: 'white',
            borderRadius: 24,
            padding: '5px 12px',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            boxShadow: '0 4px 16px rgba(0,0,0,0.25)',
            zIndex: 400,
            whiteSpace: 'nowrap'
          }}
        >
          <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#94a3b8' }}>Highlight:</span>
          {HIGHLIGHT_COLORS.map(c => (
            <button
              key={c.id}
              onClick={() => handleApplySelectionHighlight(c)}
              title={`Highlight with ${c.name}`}
              style={{
                width: 18,
                height: 18,
                borderRadius: '50%',
                background: c.bg,
                border: `1px solid ${c.border}`,
                cursor: 'pointer',
                padding: 0
              }}
            />
          ))}
        </div>
      )}

      {/* Popover on Hover / Click of Existing Highlight */}
      {activePopover && (
        <div
          onMouseEnter={handleMouseEnterTarget}
          onMouseLeave={handleMouseLeaveTarget}
          style={{
            position: 'absolute',
            top: Math.max(0, activePopover.y),
            left: activePopover.x,
            transform: 'translateX(-50%)',
            background: '#0f172a',
            color: 'white',
            borderRadius: 8,
            padding: '6px 12px',
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
            zIndex: 450,
            fontSize: '0.8rem',
            whiteSpace: 'nowrap'
          }}
        >
          {/* Add to Question Diary */}
          <button
            onClick={() => {
              onAddToNotebook(activePopover.highlight.text);
              setDiarySuccess(true);
              setTimeout(() => setDiarySuccess(false), 1500);
            }}
            style={{
              background: 'none',
              border: 'none',
              color: diarySuccess ? '#4ade80' : '#e2e8f0',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 4,
              fontWeight: 600
            }}
          >
            {diarySuccess ? <Check size={13} /> : <BookOpen size={13} color="#a855f7" />}
            {diarySuccess ? 'Saved to Diary!' : 'Question Diary'}
          </button>

          <span style={{ color: '#475569' }}>|</span>

          {/* Color Switcher */}
          <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
            {HIGHLIGHT_COLORS.map(c => (
              <button
                key={c.id}
                onClick={() => {
                  onUpdateHighlight(activePopover.highlight.id, { color: c.bg });
                  setActivePopover(prev => prev ? { ...prev, highlight: { ...prev.highlight, color: c.bg } } : null);
                }}
                style={{
                  width: 14,
                  height: 14,
                  borderRadius: '50%',
                  background: c.bg,
                  border: activePopover.highlight.color === c.bg ? `2px solid ${c.border}` : '1px solid #64748b',
                  cursor: 'pointer',
                  padding: 0
                }}
              />
            ))}
          </div>

          <span style={{ color: '#475569' }}>|</span>

          {/* Remove / Un-highlight */}
          <button
            onClick={() => {
              onRemoveHighlight(activePopover.highlight.id);
              setActivePopover(null);
            }}
            title="Un-highlight"
            style={{
              background: 'none',
              border: 'none',
              color: '#f87171',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 4,
              fontWeight: 600
            }}
          >
            <Trash2 size={13} />
            Remove
          </button>
        </div>
      )}
    </Tag>
  );
}
