import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../store/AppContext';
import { ArrowLeft, Layers, Clock, X, CheckSquare, Square, Filter, MousePointer } from 'lucide-react';

// Helper to get time spent & answer info for any question ID across state
function getQuestionAttemptInfo(state, qId) {
  if (state.bankAnswers?.[qId]) {
    return {
      attempted: true,
      isCorrect: state.bankAnswers[qId].isCorrect,
      timeSpent: state.bankAnswers[qId].timeSpent || 0,
      selectedAnswer: state.bankAnswers[qId].selectedAnswer
    };
  }
  if (state.extraPracticeAnswers?.[qId]) {
    return {
      attempted: true,
      isCorrect: state.extraPracticeAnswers[qId].isCorrect,
      timeSpent: state.extraPracticeAnswers[qId].timeSpent || 0,
      selectedAnswer: state.extraPracticeAnswers[qId].selectedAnswer
    };
  }
  for (const day of (state.generatedDays || [])) {
    const q = day.questions?.find(item => item.id === qId);
    if (q && q.status !== 'unanswered') {
      return {
        attempted: true,
        isCorrect: q.status === 'correct',
        timeSpent: q.timeSpent || 0,
        selectedAnswer: q.selectedAnswer
      };
    }
  }
  return { attempted: false, isCorrect: false, timeSpent: 0, selectedAnswer: null };
}

function formatTimeSec(s) {
  if (!s || s <= 0) return '0s';
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m}m ${sec}s`;
}

function SkillTimeAnalysisModal({ skillName, questionsInSkill, state, onClose }) {
  // Extract info for all questions in this skill
  const items = useMemo(() => {
    return questionsInSkill.map((q, idx) => {
      const info = getQuestionAttemptInfo(state, q.id);
      return {
        index: idx + 1,
        id: q.id,
        difficulty: q.difficulty,
        attempted: info.attempted,
        isCorrect: info.isCorrect,
        timeSpent: info.timeSpent,
        selectedAnswer: info.selectedAnswer,
        stemSnippet: (q.question || '').replace(/[\n\r]+/g, ' ').substring(0, 70) + '...'
      };
    });
  }, [questionsInSkill, state]);

  // Selected question IDs map
  const [selectedIds, setSelectedIds] = useState(() => new Set());
  const [isDragging, setIsDragging] = useState(false);
  const dragStartIndex = useRef(null);
  const initialSelection = useRef(new Set());

  // Initialize selection with attempted questions (or all if none attempted)
  useEffect(() => {
    const attempted = items.filter(it => it.attempted).map(it => it.id);
    if (attempted.length > 0) {
      setSelectedIds(new Set(attempted));
    } else {
      setSelectedIds(new Set(items.map(it => it.id)));
    }
  }, [items]);

  // Mouse drag selection handlers
  useEffect(() => {
    const handleGlobalMouseUp = () => {
      if (isDragging) {
        setIsDragging(false);
        dragStartIndex.current = null;
      }
    };
    window.addEventListener('mouseup', handleGlobalMouseUp);
    return () => window.removeEventListener('mouseup', handleGlobalMouseUp);
  }, [isDragging]);

  const handleMouseDown = (idx, id, e) => {
    // If Shift key held, range select from last or first
    e.preventDefault();
    setIsDragging(true);
    dragStartIndex.current = idx;
    initialSelection.current = new Set(selectedIds);

    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleMouseEnter = (idx) => {
    if (!isDragging || dragStartIndex.current === null) return;
    const start = Math.min(dragStartIndex.current, idx);
    const end = Math.max(dragStartIndex.current, idx);

    const next = new Set(initialSelection.current);
    // Toggle or add all in range
    const startId = items[dragStartIndex.current].id;
    const isAdding = !initialSelection.current.has(startId);

    for (let i = start; i <= end; i++) {
      if (isAdding) next.add(items[i].id);
      else next.delete(items[i].id);
    }
    setSelectedIds(next);
  };

  // Compute metrics for selected items
  const selectedItems = items.filter(it => selectedIds.has(it.id));
  const selectedCount = selectedItems.length;
  
  // Calculate average time for selected questions
  const totalSelectedTime = selectedItems.reduce((acc, it) => acc + it.timeSpent, 0);
  const avgSelectedTime = selectedCount > 0 ? (totalSelectedTime / selectedCount).toFixed(1) : '0';
  
  const attemptedSelected = selectedItems.filter(it => it.attempted);
  const attemptedSelectedCount = attemptedSelected.length;
  const attemptedTotalTime = attemptedSelected.reduce((acc, it) => acc + it.timeSpent, 0);
  const avgAttemptedSelectedTime = attemptedSelectedCount > 0 ? (attemptedTotalTime / attemptedSelectedCount).toFixed(1) : '0';

  const maxTime = selectedItems.length > 0 ? Math.max(...selectedItems.map(it => it.timeSpent)) : 0;
  const minTime = attemptedSelected.length > 0 ? Math.min(...attemptedSelected.map(it => it.timeSpent)) : 0;

  // Preset Selection buttons
  const selectAll = () => setSelectedIds(new Set(items.map(it => it.id)));
  const selectNone = () => setSelectedIds(new Set());
  const selectCorrect = () => setSelectedIds(new Set(items.filter(it => it.attempted && it.isCorrect).map(it => it.id)));
  const selectIncorrect = () => setSelectedIds(new Set(items.filter(it => it.attempted && !it.isCorrect).map(it => it.id)));
  const selectAttempted = () => setSelectedIds(new Set(items.filter(it => it.attempted).map(it => it.id)));

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.65)', backdropFilter: 'blur(4px)',
      zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1.5rem'
    }}>
      <div style={{
        background: 'white', borderRadius: 16, width: '100%', maxWidth: 960, maxHeight: '90vh',
        boxShadow: '0 20px 50px rgba(0,0,0,0.3)', display: 'flex', flexDirection: 'column', overflow: 'hidden'
      }}>
        
        {/* Modal Header */}
        <div style={{
          padding: '1.25rem 2rem', background: '#0f172a', color: 'white',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0
        }}>
          <div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 10 }}>
              <Clock size={22} color="#a855f7" /> Time Analysis: {skillName}
            </h2>
            <p style={{ fontSize: '0.82rem', color: '#94a3b8', marginTop: 2 }}>
              Drag or click to select questions and calculate average time instantly.
            </p>
          </div>
          <button
            onClick={onClose}
            style={{ background: 'rgba(255,255,255,0.1)', color: 'white', border: 'none', borderRadius: '50%', width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Sticky Stats Bar */}
        <div style={{
          background: 'linear-gradient(135deg, #1e1b4b 0%, #312e81 100%)', color: 'white',
          padding: '1.2rem 2rem', display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '1rem',
          borderBottom: '1px solid rgba(255,255,255,0.1)', flexShrink: 0
        }}>
          <div>
            <div style={{ fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: 1, color: '#c7d2fe', fontWeight: 600 }}>
              Average Time (Selected Questions)
            </div>
            <div style={{ fontSize: '2.4rem', fontWeight: 800, color: '#67e8f9', lineHeight: 1.1, marginTop: 2 }}>
              {selectedCount > 0 ? `${avgAttemptedSelectedTime}s` : '0s'}
              <span style={{ fontSize: '0.9rem', fontWeight: 500, color: '#a5f3fc', marginLeft: 8 }}>
                ({selectedCount > 0 && attemptedSelectedCount > 0 ? formatTimeSec(Math.round(avgAttemptedSelectedTime)) : '0s'})
              </span>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '1.5rem', background: 'rgba(255,255,255,0.08)', padding: '0.6rem 1.2rem', borderRadius: 10 }}>
            <div>
              <div style={{ fontSize: '0.7rem', color: '#a5b4fc' }}>Selected</div>
              <div style={{ fontSize: '1.1rem', fontWeight: 700, color: 'white' }}>
                {selectedCount} / {items.length}
              </div>
            </div>
            <div style={{ borderLeft: '1px solid rgba(255,255,255,0.15)', paddingLeft: '1.5rem' }}>
              <div style={{ fontSize: '0.7rem', color: '#a5b4fc' }}>Total Time</div>
              <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#fde047' }}>
                {formatTimeSec(attemptedTotalTime)}
              </div>
            </div>
            <div style={{ borderLeft: '1px solid rgba(255,255,255,0.15)', paddingLeft: '1.5rem' }}>
              <div style={{ fontSize: '0.7rem', color: '#a5b4fc' }}>Fastest / Slowest</div>
              <div style={{ fontSize: '0.9rem', fontWeight: 600, color: '#e0e7ff' }}>
                {attemptedSelectedCount > 0 ? `${minTime}s / ${maxTime}s` : '-'}
              </div>
            </div>
          </div>
        </div>

        {/* Toolbar & Filter Presets */}
        <div style={{
          padding: '0.85rem 2rem', background: '#f8fafc', borderBottom: '1px solid #e2e8f0',
          display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem', flexShrink: 0
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.8rem', color: '#64748b' }}>
            <MousePointer size={14} color="#6366f1" />
            <span>Click or <strong>drag across cards</strong> to select</span>
          </div>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            <button onClick={selectAll} style={btnStyle}>Select All ({items.length})</button>
            <button onClick={selectAttempted} style={btnStyle}>Attempted ({items.filter(i => i.attempted).length})</button>
            <button onClick={selectCorrect} style={{ ...btnStyle, background: '#dcfce7', color: '#15803d' }}>Correct ({items.filter(i => i.attempted && i.isCorrect).length})</button>
            <button onClick={selectIncorrect} style={{ ...btnStyle, background: '#fee2e2', color: '#b91c1c' }}>Incorrect ({items.filter(i => i.attempted && !i.isCorrect).length})</button>
            <button onClick={selectNone} style={{ ...btnStyle, background: '#f1f5f9', color: '#64748b' }}>Clear</button>
          </div>
        </div>

        {/* Questions Grid with Drag Selection */}
        <div style={{
          padding: '1.5rem 2rem', overflowY: 'auto', flex: 1, userSelect: 'none',
          display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '0.85rem'
        }}>
          {items.map((it, idx) => {
            const isSelected = selectedIds.has(it.id);

            let statusBg = '#f1f5f9';
            let statusTxt = '#64748b';
            let statusLabel = 'Unattempted';

            if (it.attempted) {
              if (it.isCorrect) {
                statusBg = '#dcfce7'; statusTxt = '#15803d'; statusLabel = '✓ Correct';
              } else {
                statusBg = '#fee2e2'; statusTxt = '#b91c1c'; statusLabel = '✗ Incorrect';
              }
            }

            return (
              <div
                key={it.id}
                onMouseDown={(e) => handleMouseDown(idx, it.id, e)}
                onMouseEnter={() => handleMouseEnter(idx)}
                style={{
                  background: isSelected ? '#eff6ff' : 'white',
                  border: isSelected ? '2px solid #2563eb' : '1px solid #e2e8f0',
                  borderRadius: 10, padding: '0.85rem 1rem', cursor: 'pointer',
                  boxShadow: isSelected ? '0 2px 8px rgba(37,99,235,0.15)' : '0 1px 3px rgba(0,0,0,0.04)',
                  transition: 'border-color 0.15s, background 0.15s',
                  display: 'flex', flexDirection: 'column', gap: 6, position: 'relative'
                }}
              >
                {/* Header row */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ color: isSelected ? '#2563eb' : '#cbd5e1' }}>
                      {isSelected ? <CheckSquare size={18} /> : <Square size={18} />}
                    </div>
                    <span style={{ fontWeight: 700, fontSize: '0.9rem', color: '#1e293b' }}>Q{it.index}</span>
                    <span style={{
                      fontSize: '0.7rem', padding: '1px 6px', borderRadius: 10, fontWeight: 600,
                      background: it.difficulty === 'Easy' ? '#dcfce7' : it.difficulty === 'Hard' ? '#fee2e2' : '#fef3c7',
                      color: it.difficulty === 'Easy' ? '#15803d' : it.difficulty === 'Hard' ? '#b91c1c' : '#92400e'
                    }}>{it.difficulty}</span>
                  </div>

                  <span style={{ fontSize: '0.72rem', fontWeight: 600, padding: '2px 8px', borderRadius: 12, background: statusBg, color: statusTxt }}>
                    {statusLabel}
                  </span>
                </div>

                {/* Question Stem snippet */}
                <div style={{ fontSize: '0.8rem', color: '#475569', lineHeight: 1.4, height: 34, overflow: 'hidden' }}>
                  {it.stemSnippet}
                </div>

                {/* Time spent footer */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 'auto', paddingTop: 6, borderTop: '1px solid #f1f5f9', fontSize: '0.78rem' }}>
                  <span style={{ color: '#64748b' }}>Time taken:</span>
                  <span style={{ fontWeight: 700, color: it.timeSpent > 0 ? '#6366f1' : '#94a3b8', fontSize: '0.88rem' }}>
                    {it.attempted ? formatTimeSec(it.timeSpent) : 'Not attempted'}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Modal Footer */}
        <div style={{
          padding: '1rem 2rem', background: '#f8fafc', borderTop: '1px solid #e2e8f0',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0
        }}>
          <span style={{ fontSize: '0.85rem', color: '#64748b' }}>
            Showing <strong>{items.length}</strong> total questions in this skill.
          </span>
          <button
            onClick={onClose}
            style={{ padding: '8px 24px', background: '#1e293b', color: 'white', border: 'none', borderRadius: 20, fontWeight: 600, cursor: 'pointer', fontSize: '0.9rem' }}
          >
            Close
          </button>
        </div>

      </div>
    </div>
  );
}

const btnStyle = {
  padding: '4px 10px', borderRadius: 6, fontSize: '0.75rem', fontWeight: 600,
  background: '#white', border: '1px solid #cbd5e1', color: '#334155', cursor: 'pointer'
};

export default function GrandBank() {
  const { allQuestions, state } = useApp();
  const navigate = useNavigate();
  const [selectedTimeSkill, setSelectedTimeSkill] = useState(null); // { skill, questionIds }

  // Group questions by Domain -> Skill
  const grouped = useMemo(() => {
    const data = {};
    allQuestions.forEach(q => {
      if (!data[q.domain]) data[q.domain] = {};
      if (!data[q.domain][q.skill]) data[q.domain][q.skill] = { total: 0, questions: [], fullQuestions: [] };
      data[q.domain][q.skill].total += 1;
      data[q.domain][q.skill].questions.push(q.id);
      data[q.domain][q.skill].fullQuestions.push(q);
    });
    return data;
  }, [allQuestions]);

  const bankAnswers = state.bankAnswers || {};

  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc', padding: '2rem 3rem' }}>
      <button 
        onClick={() => navigate('/')}
        style={{ color: '#64748b', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, fontWeight: 500, marginBottom: '2rem' }}
      >
        <ArrowLeft size={16} /> Dashboard
      </button>

      <div style={{ marginBottom: '3rem' }}>
        <h1 style={{ fontSize: '2.25rem', fontWeight: 800, color: '#1e293b', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: 12 }}>
          <Layers size={32} color="#2563eb" /> Grand Question Bank
        </h1>
        <p style={{ color: '#64748b', fontSize: '1.1rem' }}>
          Explore all {allQuestions.length} questions organized by domain and skill. Click <strong>Avg time</strong> on any card for detailed question time analysis.
        </p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '3rem' }}>
        {Object.entries(grouped).sort().map(([domain, skills]) => (
          <div key={domain}>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#0f172a', borderBottom: '2px solid #e2e8f0', paddingBottom: '0.75rem', marginBottom: '1.5rem' }}>
              {domain}
            </h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1.25rem' }}>
              {Object.entries(skills).sort().map(([skill, data]) => {
                // Calculate completion across bankAnswers or overall attempts
                const completed = data.questions.filter(id => !!bankAnswers[id] || getQuestionAttemptInfo(state, id).attempted).length;
                const correct = data.questions.filter(id => getQuestionAttemptInfo(state, id).isCorrect).length;
                const incorrect = completed - correct;
                const totalTime = data.questions.reduce((sum, id) => sum + (getQuestionAttemptInfo(state, id).timeSpent || 0), 0);
                const avgTime = completed > 0 ? Math.round(totalTime / completed) : 0;
                const left = data.total - completed;
                
                const pctCorrect = completed > 0 ? Math.round((correct / completed) * 100) : 0;
                const pctIncorrect = completed > 0 ? Math.round((incorrect / completed) * 100) : 0;
                const pctTotal = Math.round((completed / data.total) * 100);

                return (
                  <div 
                    key={skill}
                    onClick={() => navigate(`/solve/bank/${encodeURIComponent(skill)}`)}
                    style={{ 
                      background: 'white', borderRadius: 12, padding: '1.5rem', 
                      boxShadow: '0 2px 8px rgba(0,0,0,0.05)', border: '1px solid #e2e8f0',
                      cursor: 'pointer', transition: 'transform 0.2s, box-shadow 0.2s',
                      display: 'flex', flexDirection: 'column', gap: '1rem'
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.05)'; }}
                  >
                    <div>
                      <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: '#334155', marginBottom: '0.25rem' }}>{skill}</h3>
                      <p style={{ fontSize: '0.85rem', color: '#94a3b8' }}>{data.total} questions available</p>
                    </div>

                    <div style={{ marginTop: 'auto' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: '#64748b', marginBottom: '0.4rem', fontWeight: 600 }}>
                        <span>Progress</span>
                        <span>{completed} / {data.total} ({pctTotal}%)</span>
                      </div>
                      <div style={{ height: 6, background: '#f1f5f9', borderRadius: 3, overflow: 'hidden', marginBottom: '0.75rem' }}>
                        <div style={{ height: '100%', width: `${pctTotal}%`, background: pctTotal === 100 ? '#10b981' : '#3b82f6', borderRadius: 3 }} />
                      </div>
                      
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', fontSize: '0.75rem', marginBottom: '0.75rem' }}>
                        {completed > 0 && (
                          <>
                            <span style={{ background: '#dcfce7', color: '#15803d', padding: '2px 6px', borderRadius: 4, fontWeight: 600 }}>Correct: {pctCorrect}%</span>
                            <span style={{ background: '#fee2e2', color: '#b91c1c', padding: '2px 6px', borderRadius: 4, fontWeight: 600 }}>Incorrect: {pctIncorrect}%</span>
                          </>
                        )}
                        <span style={{ background: '#f1f5f9', color: '#475569', padding: '2px 6px', borderRadius: 4, fontWeight: 600 }}>Left: {left}</span>
                        <span 
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedTimeSkill({ skill, fullQuestions: data.fullQuestions });
                          }}
                          title="Click for detailed question time breakdown & drag-selection"
                          style={{ background: '#f3e8ff', color: '#7e22ce', padding: '2px 8px', borderRadius: 4, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, boxShadow: '0 1px 2px rgba(126,34,206,0.15)' }}
                          onMouseEnter={e => { e.currentTarget.style.background = '#e9d5ff'; }}
                          onMouseLeave={e => { e.currentTarget.style.background = '#f3e8ff'; }}
                        >
                          <Clock size={12} /> Avg time: {avgTime}s ↗
                        </span>
                      </div>

                      <div style={{ display: 'flex', gap: '0.5rem', marginTop: 'auto' }}>
                        {incorrect > 0 && (
                          <button 
                            onClick={(e) => { e.stopPropagation(); navigate(`/solve/bank/${encodeURIComponent(skill)}?filter=wrong`); }}
                            style={{ flex: 1, padding: '6px', background: '#fee2e2', color: '#b91c1c', border: 'none', borderRadius: 6, fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer', transition: 'opacity 0.2s' }}
                            onMouseOver={e => e.currentTarget.style.opacity = '0.8'}
                            onMouseOut={e => e.currentTarget.style.opacity = '1'}
                          >
                            Review Wrong ({incorrect})
                          </button>
                        )}
                        {data.questions.some(id => state.confusedList?.includes(id)) && (
                          <button 
                            onClick={(e) => { e.stopPropagation(); navigate(`/solve/bank/${encodeURIComponent(skill)}?filter=marked`); }}
                            style={{ flex: 1, padding: '6px', background: '#fef08a', color: '#a16207', border: 'none', borderRadius: 6, fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer', transition: 'opacity 0.2s' }}
                            onMouseOver={e => e.currentTarget.style.opacity = '0.8'}
                            onMouseOut={e => e.currentTarget.style.opacity = '1'}
                          >
                            Review Marked ({data.questions.filter(id => state.confusedList?.includes(id)).length})
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Time Analysis Drag-Selection Modal */}
      {selectedTimeSkill && (
        <SkillTimeAnalysisModal
          skillName={selectedTimeSkill.skill}
          questionsInSkill={selectedTimeSkill.fullQuestions}
          state={state}
          onClose={() => setSelectedTimeSkill(null)}
        />
      )}
    </div>
  );
}
