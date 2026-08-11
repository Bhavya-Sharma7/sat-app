import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useApp } from '../store/AppContext';
import { Bookmark, ChevronUp, BookOpen, X, Eye, EyeOff, RotateCcw } from 'lucide-react';
import { cleanExplanation, splitQuestionText, extractImageStem } from '../utils/textFormatter';
import HighlightToolbar, { HIGHLIGHT_COLORS } from '../components/HighlightToolbar';
import HighlightedText from '../components/HighlightedText';

const LETTERS = ['A', 'B', 'C', 'D'];

const fetchDefinition = async (word) => {
  try {
    const res = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${word}`);
    const data = await res.json();
    return data[0]?.meanings[0]?.definitions[0]?.definition || 'Definition not found.';
  } catch (e) {
    return 'Error fetching definition.';
  }
};

const WordDefinition = ({ wordObj, onRemove }) => {
  const [def, setDef] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleClick = async () => {
    if (def) { setDef(null); return; }
    setLoading(true);
    const text = await fetchDefinition(wordObj.word);
    setDef(text);
    setLoading(false);
  };

  return (
    <div style={{ fontSize: '0.85rem', padding: '5px 0', borderBottom: '1px solid #f1f5f9', color: '#334155' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', flex: 1 }} onClick={handleClick}>
          <strong>{wordObj.word}</strong>
          {loading ? <span style={{fontSize:'0.7rem', color:'#94a3b8'}}>...</span> : <span style={{fontSize:'0.7rem', color:'#cbd5e1'}}>▼</span>}
        </div>
        {onRemove && (
          <button
            onClick={(e) => { e.stopPropagation(); onRemove(); }}
            title="Remove from notebook"
            style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: '2px 4px', display: 'flex', alignItems: 'center' }}
            onMouseEnter={e => e.currentTarget.style.color = '#ef4444'}
            onMouseLeave={e => e.currentTarget.style.color = '#94a3b8'}
          >
            <X size={14} />
          </button>
        )}
      </div>
      {def && <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: 4, background: '#f8fafc', padding: 6, borderRadius: 4 }}>{def}</div>}
    </div>
  );
};

export default function Solver() {
  const { dayNumber, mode } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const filter = searchParams.get('filter');
  const {
    state, allQuestions, markQuestionAnswered, toggleConfused,
    updateState, updateQuestionNote, addHighlight, removeHighlight,
    updateHighlight, addTextToNotebook, removeFromNotebook
  } = useApp();

  // ── Pane resizing ──
  const containerRef = useRef(null);
  const isDragging = useRef(false);
  const [leftWidth, setLeftWidth] = useState(50);

  useEffect(() => {
    const onMove = (e) => {
      if (!isDragging.current || !containerRef.current) return;
      const r = containerRef.current.getBoundingClientRect();
      const pct = ((e.clientX - r.left) / r.width) * 100;
      setLeftWidth(Math.max(25, Math.min(75, pct)));
    };
    const onUp = () => {
      isDragging.current = false;
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp); };
  }, []);

  // ── Question pool ──
  const isExtra = dayNumber === 'extra';
  const isBank = dayNumber === 'bank';
  let pool = [];
  if (isBank) {
    const skillName = decodeURIComponent(mode);
    pool = allQuestions.filter(q => q.skill === skillName).map(q => ({
      id: q.id, status: 'unanswered', confused: state.confusedList?.includes(q.id) || false,
      domain: q.domain, skill: q.skill, difficulty: q.difficulty, selectedAnswer: null, timeSpent: 0
    }));

    if (filter === 'wrong') {
      pool = pool.filter(q => state.bankAnswers?.[q.id]?.isCorrect === false);
    } else if (filter === 'marked') {
      pool = pool.filter(q => state.confusedList?.includes(q.id));
    }
  } else if (isExtra) {
    pool = (state.unusedQuestions || []).map(q => ({
      id: q.id, status: 'unanswered', confused: state.confusedList?.includes(q.id) || false,
      domain: q.domain, skill: q.skill, difficulty: q.difficulty, selectedAnswer: null, timeSpent: 0
    }));
  } else {
    const dayObj = state.generatedDays.find(d => d.dayNumber === parseInt(dayNumber));
    if (dayObj) {
      if (mode === 'new') pool = dayObj.questions.map(q => ({ ...q, confused: state.confusedList?.includes(q.id) || q.confused }));
      else if (mode === 'wrong') pool = dayObj.questions.filter(q => q.status === 'incorrect').map(q => ({ ...q, confused: state.confusedList?.includes(q.id) || q.confused }));
      else if (mode === 'confused') pool = dayObj.questions.filter(q => q.confused || state.confusedList?.includes(q.id)).map(q => ({ ...q, confused: true }));
    }
  }

  // ── Local state ──
  const [currentIndex, setCurrentIndex] = useState(0);
  const [pendingSelections, setPendingSelections] = useState({});
  const [checkedIds, setCheckedIds] = useState(new Set());
  const [timers, setTimers] = useState({}); // { [questionId]: seconds }
  const [timerActive, setTimerActive] = useState(true);
  const timerRef = useRef(null);

  // Load underlines data (embedded per-question)
  const [underlinesMap, setUnderlinesMap] = useState({});
  useEffect(() => {
    fetch(`${import.meta.env.BASE_URL}underlines.json`)
      .then(r => r.json())
      .then(data => setUnderlinesMap(data))
      .catch(() => {});
  }, []);

  const [activeHighlightColor, setActiveHighlightColor] = useState(HIGHLIGHT_COLORS[0]);

  // strikethrough: { [qId]: Set<letter> }
  const [strikeSet, setStrikeSet] = useState({});
  const [showExplanation, setShowExplanation] = useState(false);
  const [showGrid, setShowGrid] = useState(false);
  const [notebookOpen, setNotebookOpen] = useState(false);
  const [diaryOpen, setDiaryOpen] = useState(false);
  const [diaryText, setDiaryText] = useState('');
  const [lookupWord, setLookupWord] = useState('');
  const [showDifficulty, setShowDifficulty] = useState(false);
  const [showCorrectAnswer, setShowCorrectAnswer] = useState(false);

  // Jump to first unanswered on load
  useEffect(() => {
    if (pool.length > 0) {
      const firstUnanswered = pool.findIndex(q => {
        const isExtraAns = isExtra && !!state.extraPracticeAnswers?.[q.id];
        const isBankAns = isBank && !!state.bankAnswers?.[q.id];
        const isDayAns = q.status !== 'unanswered';
        return !(isDayAns || isExtraAns || isBankAns);
      });
      if (firstUnanswered !== -1) setCurrentIndex(firstUnanswered);
    }
  }, []); // eslint-disable-line

  // Timer: tick for current question
  useEffect(() => {
    if (!pool.length) return;
    const qId = pool[currentIndex]?.id;
    if (!qId) return;
    
    // Stop timer if already checked or answered
    const isChecked = pool[currentIndex]?.status !== 'unanswered' || checkedIds.has(qId);
    if (isChecked || !timerActive) return;

    timerRef.current = setInterval(() => {
      setTimers(prev => ({ ...prev, [qId]: (prev[qId] || 0) + 1 }));
    }, 1000);
    return () => clearInterval(timerRef.current);
  }, [currentIndex, timerActive, checkedIds.size]); // eslint-disable-line

  // Reset per-question UI state & timer when navigating
  useEffect(() => {
    setShowExplanation(false);
    setShowCorrectAnswer(false);

    if (pool.length > 0 && pool[currentIndex]) {
      const currentQ = pool[currentIndex];
      const targetId = currentQ.id;
      const isExtraAns = isExtra && !!state.extraPracticeAnswers?.[targetId];
      const isBankAns = isBank && !!state.bankAnswers?.[targetId];
      const isChecked = currentQ.status !== 'unanswered' || checkedIds.has(targetId) || isExtraAns || isBankAns;

      // Always resume timer for unanswered questions when navigating
      if (!isChecked) {
        setTimerActive(true);
      }
    }
  }, [currentIndex]);

  const qId = pool[currentIndex]?.id;

  // Compute underlined phrases for current question (from PDF extraction)
  const currentUnderlinedPhrases = qId && underlinesMap[qId] ? [underlinesMap[qId]] : [];
  
  // Load diary text for this question
  useEffect(() => {
    if (qId) setDiaryText(state.questionNotes?.[qId] || '');
  }, [qId, state.questionNotes]);

  if (!pool || pool.length === 0) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', flexDirection: 'column', gap: '1rem' }}>
        <h2>No questions in this mode.</h2>
        <button className="btn-primary" onClick={() => navigate(isBank ? '/bank' : isExtra ? '/' : `/day/${dayNumber}`)}>Go Back</button>
      </div>
    );
  }

  const currentQState = pool[currentIndex];
  const fullQ = allQuestions.find(q => q.id === qId) || currentQState;
  const isImageQuestion = !!fullQ.image_path;
  const { passage, stem: textStem } = isImageQuestion
    ? { passage: '', stem: '' }
    : splitQuestionText(fullQ.question || '');
  const stem = isImageQuestion ? extractImageStem(fullQ.question || '') : textStem;

  // Determine answer state
  const persistedAnswer = currentQState.selectedAnswer;
  const pendingAnswer = pendingSelections[qId];
  const isChecked = currentQState.status !== 'unanswered' || checkedIds.has(qId);
  const currentAnswer = persistedAnswer || (isChecked ? null : pendingAnswer);
  const timerSeconds = timers[qId] || 0;

  const extraAnswer = isExtra ? (state.extraPracticeAnswers?.[qId]) : null;
  const isAnsweredExtra = isExtra && !!extraAnswer;
  
  const bankAnswer = isBank ? (state.bankAnswers?.[qId]) : null;
  const isAnsweredBank = isBank && !!bankAnswer;

  const effectivelyAnswered = isChecked || isAnsweredExtra || isAnsweredBank;

  // Select an option (without submitting)
  const handleSelectOption = (letter) => {
    if (effectivelyAnswered) return;
    setPendingSelections(prev => ({ ...prev, [qId]: letter }));
    // Stop timer when option is selected
    clearInterval(timerRef.current);
    setTimerActive(false);
  };

  const handleCheckAnswer = () => {
    const answer = pendingAnswer;
    if (!answer) return;
    setCheckedIds(prev => new Set([...prev, qId]));
    markQuestionAnswered(
      isBank ? 'bank' : isExtra ? null : parseInt(dayNumber),
      qId,
      answer,
      timerSeconds
    );
    setPendingSelections(prev => { const n = { ...prev }; delete n[qId]; return n; });
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

      if (e.key === '1') handleSelectOption('A');
      if (e.key === '2') handleSelectOption('B');
      if (e.key === '3') handleSelectOption('C');
      if (e.key === '4') handleSelectOption('D');

      if (e.key === 'Shift') {
        if (!effectivelyAnswered && pendingAnswer) {
          handleCheckAnswer();
        } else if (effectivelyAnswered) {
          setShowExplanation(v => !v);
        }
      }

      if (e.key === 'Enter') {
        if (e.metaKey || e.ctrlKey) {
          e.preventDefault();
          setCurrentIndex(c => Math.max(0, c - 1));
        } else {
          e.preventDefault();
          setCurrentIndex(c => Math.min(pool.length - 1, c + 1));
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [effectivelyAnswered, pendingAnswer, pool.length, qId, currentIndex]); // eslint-disable-line

  const handleAutoCheckAll = () => {
    Object.entries(pendingSelections).forEach(([id, letter]) => {
      const fullQ2 = allQuestions.find(q => q.id === id);
      if (!fullQ2) return;
      const t = timers[id] || 0;
      markQuestionAnswered(isBank ? 'bank' : isExtra ? null : parseInt(dayNumber), id, letter, t);
    });
    setPendingSelections({});
    setCheckedIds(prev => {
      const n = new Set(prev);
      Object.keys(pendingSelections).forEach(id => n.add(id));
      return n;
    });
  };

  const toggleStrike = (letter) => {
    setStrikeSet(prev => {
      const s = new Set(prev[qId] || []);
      s.has(letter) ? s.delete(letter) : s.add(letter);
      return { ...prev, [qId]: s };
    });
  };

  const saveWord = () => {
    const w = lookupWord.trim();
    if (!w) return;
    updateState(prev => ({
      ...prev,
      confusedWordsList: [...(prev.confusedWordsList || []), { word: w, definition: '', questionId: qId, date: new Date().toISOString() }]
    }));
    setLookupWord('');
    setNotebookOpen(false);
  };

  const struck = strikeSet[qId] || new Set();

  const showResult = effectivelyAnswered && showExplanation;
  const correctAnswer = fullQ.correct_answer;
  const answeredLetter = persistedAnswer || extraAnswer?.selectedAnswer || bankAnswer?.selectedAnswer;
  const wasCorrect = answeredLetter === correctAnswer;

  const allHandled = pool.every(q => {
    const isAns = q.status !== 'unanswered' || checkedIds.has(q.id);
    const hasPending = !!pendingSelections[q.id];
    const isExtraAns = isExtra && !!(state.extraPracticeAnswers?.[q.id]);
    const isBankAns = isBank && !!(state.bankAnswers?.[q.id]);
    return isAns || hasPending || isExtraAns || isBankAns;
  });

  const pendingCount = Object.keys(pendingSelections).length;
  const formatTime = (s) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`;
  const dayLabel = isBank ? `Grand Bank · ${decodeURIComponent(mode)}` : isExtra ? 'Extra Practice' : `Day ${dayNumber}${mode !== 'new' ? ` · ${mode === 'wrong' ? 'Review Wrong' : 'Review Confused'}` : ''}`;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: '#fff', overflow: 'hidden', fontFamily: 'system-ui, sans-serif' }}>

      {/* ── TOP HEADER ── */}
      <div style={{ display: 'flex', alignItems: 'center', padding: '0.6rem 1.5rem', background: '#f4f5f7', borderBottom: '1px solid #c5c8cc', flexShrink: 0 }}>
        {/* Left */}
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <button
            onClick={() => navigate(isBank ? '/bank' : isExtra ? '/' : `/day/${dayNumber}`)}
            style={{ padding: '4px 14px', border: '1px solid #888', borderRadius: 20, fontSize: '0.85rem', background: 'white', fontWeight: 500 }}
          >← Exit</button>
          <div style={{ fontWeight: 600, fontSize: '0.95rem', color: '#1e293b' }}>{dayLabel}</div>
          {showDifficulty && (
            <span style={{
              fontSize: '0.75rem', padding: '2px 10px', borderRadius: 12, fontWeight: 700,
              background: fullQ.difficulty === 'Easy' ? '#dcfce7' : fullQ.difficulty === 'Hard' ? '#fee2e2' : '#fef3c7',
              color: fullQ.difficulty === 'Easy' ? '#15803d' : fullQ.difficulty === 'Hard' ? '#b91c1c' : '#92400e'
            }}>{fullQ.difficulty}</span>
          )}
          <button
            onClick={() => setShowDifficulty(v => !v)}
            style={{ fontSize: '0.75rem', color: '#64748b', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}
          >
            {showDifficulty ? <EyeOff size={13} /> : <Eye size={13} />}
            {showDifficulty ? 'Hide' : 'Difficulty'}
          </button>
        </div>

        {/* Center: Live timer */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: '1.4rem', fontWeight: 700, fontVariantNumeric: 'tabular-nums', letterSpacing: 1, color: effectivelyAnswered ? '#94a3b8' : '#1e293b' }}>
              {formatTime(timerSeconds)}
            </span>
            {!effectivelyAnswered && (
              <button
                onClick={() => {
                  clearInterval(timerRef.current);
                  setTimers(prev => ({ ...prev, [qId]: 0 }));
                  setTimerActive(true);
                }}
                title="Reset timer"
                style={{
                  background: 'none', border: 'none', cursor: 'pointer',
                  color: '#94a3b8', padding: 2, display: 'flex', alignItems: 'center',
                  borderRadius: 4, transition: 'color 0.15s'
                }}
                onMouseEnter={e => e.currentTarget.style.color = '#1e293b'}
                onMouseLeave={e => e.currentTarget.style.color = '#94a3b8'}
              >
                <RotateCcw size={13} />
              </button>
            )}
          </div>
          <span style={{ fontSize: '0.65rem', color: '#94a3b8' }}>
            {effectivelyAnswered ? 'Locked' : 'Elapsed'}
          </span>
        </div>

        {/* Right: Tools & Highlighting */}
        <div style={{ flex: 1, display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '1rem' }}>
          <HighlightToolbar
            activeColor={activeHighlightColor}
            onSelectColor={setActiveHighlightColor}
          />
          <button
            onClick={() => setNotebookOpen(v => !v)}
            style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', color: '#333', gap: 2, background: 'none', border: 'none', cursor: 'pointer' }}
          >
            <BookOpen size={18} strokeWidth={1.5} />
            <span style={{ fontSize: '0.68rem', fontWeight: 500 }}>Notebook</span>
          </button>
        </div>
      </div>

      {/* ── SPLIT PANE ── */}
      <div ref={containerRef} style={{ display: 'flex', flex: 1, overflow: 'hidden', position: 'relative' }}>

        {/* LEFT – Passage */}
        <div style={{ width: `${leftWidth}%`, overflowY: 'auto', padding: '2.5rem 3rem', fontFamily: 'Georgia, "Times New Roman", serif', fontSize: '1.1rem', lineHeight: 1.9, borderRight: '2px solid #d0d0d0', flexShrink: 0 }}>
          {isImageQuestion ? (
            <img
              src={fullQ.image_path}
              alt="Question graph or table"
              style={{ maxWidth: '100%', borderRadius: 4, border: '1px solid #e2e8f0' }}
            />
          ) : (
            <div style={{ wordBreak: 'break-word' }}>
              {passage.split('\n\n').map((para, i) => (
                <HighlightedText
                  key={i}
                  text={para}
                  blockKey={`passage-${i}`}
                  highlights={state.questionHighlights?.[qId] || []}
                  activeColor={activeHighlightColor}
                  onAddHighlight={(hl) => addHighlight(qId, hl)}
                  onRemoveHighlight={(hlId) => removeHighlight(qId, hlId)}
                  onUpdateHighlight={(hlId, updates) => updateHighlight(qId, hlId, updates)}
                  onAddToNotebook={(snippet) => addTextToNotebook(qId, snippet)}
                  underlinedPhrases={currentUnderlinedPhrases}
                  style={{ marginBottom: '1.2em', lineHeight: 1.9, whiteSpace: 'pre-line' }}
                  tag="p"
                />
              ))}
            </div>
          )}
        </div>

        {/* Draggable Divider */}
        <div
          onMouseDown={(e) => {
            e.preventDefault();
            isDragging.current = true;
            document.body.style.cursor = 'col-resize';
            document.body.style.userSelect = 'none';
          }}
          style={{ width: 14, background: '#e2e8f0', cursor: 'col-resize', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
        >
          <div style={{ width: 4, height: 48, background: '#94a3b8', borderRadius: 4 }} />
        </div>

        {/* RIGHT – Question + Options */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '2rem 2.5rem', background: '#fff', display: 'flex', flexDirection: 'column' }}>

          {/* Question header row */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem', background: '#f8f9fa', border: '1px solid #ddd', borderRadius: 6, padding: '6px 12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ background: '#1e293b', color: 'white', padding: '4px 10px', borderRadius: 4, fontWeight: 700, fontSize: '1rem' }}>
                {currentIndex + 1}
              </div>
              <button
                onClick={() => toggleConfused(isExtra ? null : parseInt(dayNumber), qId)}
                style={{ display: 'flex', alignItems: 'center', gap: 5, color: currentQState.confused ? '#d97706' : '#333', borderBottom: '1px dashed currentColor', paddingBottom: 1, background: 'none', fontSize: '0.88rem', fontWeight: 500 }}
              >
                <Bookmark size={13} fill={currentQState.confused ? 'currentColor' : 'none'} />
                Mark for Review
              </button>
            </div>
            <span style={{ fontSize: '0.75rem', background: '#e2e8f0', color: '#475569', padding: '3px 10px', borderRadius: 12, fontWeight: 600 }}>{fullQ.skill}</span>
          </div>

          {/* Question STEM */}
          {stem && (
            <HighlightedText
              text={stem}
              blockKey="stem"
              highlights={state.questionHighlights?.[qId] || []}
              activeColor={activeHighlightColor}
              onAddHighlight={(hl) => addHighlight(qId, hl)}
              onRemoveHighlight={(hlId) => removeHighlight(qId, hlId)}
              onUpdateHighlight={(hlId, updates) => updateHighlight(qId, hlId, updates)}
              onAddToNotebook={(snippet) => addTextToNotebook(qId, snippet)}
              underlinedPhrases={currentUnderlinedPhrases}
              style={{ fontSize: '1.05rem', fontWeight: 500, marginBottom: '1.5rem', lineHeight: 1.6, color: '#1e293b' }}
              tag="p"
            />
          )}

          {/* Answer choices */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
            {LETTERS.map(letter => {
              const optText = fullQ.options?.[letter];
              if (!optText) return null;
              const isSelected = currentAnswer === letter || (effectivelyAnswered && answeredLetter === letter);
              const isCorrect = correctAnswer === letter;
              const isStruckThrough = struck.has(letter);

              let border = '1.5px solid #9ca3af';
              let bg = 'white';
              let letterBg = 'transparent';
              let letterBorder = '#9ca3af';
              let letterColor = '#555';

              if (effectivelyAnswered && showResult) {
                if (isCorrect && showCorrectAnswer) { border = '1.5px solid #10b981'; bg = '#f0fdf4'; letterBg = '#10b981'; letterBorder = '#10b981'; letterColor = 'white'; }
                else if (isSelected && !wasCorrect) { border = '1.5px solid #ef4444'; bg = '#fef2f2'; letterBg = '#ef4444'; letterBorder = '#ef4444'; letterColor = 'white'; }
                else if (isSelected && wasCorrect) { border = '1.5px solid #10b981'; bg = '#f0fdf4'; letterBg = '#10b981'; letterBorder = '#10b981'; letterColor = 'white'; }
              } else if (isSelected) {
                border = '2px solid #2563eb'; bg = '#eff6ff'; letterBg = '#2563eb'; letterBorder = '#2563eb'; letterColor = 'white';
              }

              return (
                <div key={letter} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <button
                    onClick={() => handleSelectOption(letter)}
                    disabled={effectivelyAnswered}
                    style={{
                      flex: 1, display: 'flex', alignItems: 'center', gap: '0.75rem',
                      padding: '0.65rem 1rem', border, borderRadius: 8, background: bg,
                      cursor: effectivelyAnswered ? 'default' : 'pointer', textAlign: 'left',
                      textDecoration: isStruckThrough ? 'line-through' : 'none',
                      opacity: isStruckThrough ? 0.4 : 1, transition: 'all 0.1s'
                    }}
                  >
                    <div style={{ width: 26, height: 26, borderRadius: '50%', border: `1.5px solid ${letterBorder}`, display: 'flex', alignItems: 'center', justifyContent: 'center', background: letterBg, color: letterColor, fontWeight: 700, fontSize: '0.82rem', flexShrink: 0 }}>{letter}</div>
                    <HighlightedText
                      text={optText}
                      blockKey={`option-${letter}`}
                      highlights={state.questionHighlights?.[qId] || []}
                      activeColor={activeHighlightColor}
                      onAddHighlight={(hl) => addHighlight(qId, hl)}
                      onRemoveHighlight={(hlId) => removeHighlight(qId, hlId)}
                      onUpdateHighlight={(hlId, updates) => updateHighlight(qId, hlId, updates)}
                      onAddToNotebook={(snippet) => addTextToNotebook(qId, snippet)}
                      style={{ fontSize: '0.97rem', lineHeight: 1.5 }}
                      tag="span"
                    />
                  </button>
                  {!effectivelyAnswered && (
                    <button
                      onClick={() => toggleStrike(letter)}
                      title="Eliminate option"
                      style={{ width: 24, height: 24, borderRadius: '50%', border: '1px solid #bbb', background: isStruckThrough ? '#1e293b' : 'white', color: isStruckThrough ? 'white' : '#777', fontWeight: 700, fontSize: '0.68rem', display: 'flex', alignItems: 'center', justifyContent: 'center', textDecoration: 'line-through', flexShrink: 0 }}
                    >{letter}</button>
                  )}
                </div>
              );
            })}
          </div>

          {/* Action buttons */}
          <div style={{ marginTop: '1.5rem', display: 'flex', flexWrap: 'wrap', gap: '0.75rem', alignItems: 'center' }}>
            {!effectivelyAnswered && pendingAnswer && (
              <button
                onClick={handleCheckAnswer}
                style={{ padding: '9px 24px', borderRadius: 20, fontWeight: 700, background: '#2563eb', color: 'white', border: 'none', cursor: 'pointer', fontSize: '1rem' }}
              >
                Check Answer
              </button>
            )}
            {!effectivelyAnswered && !pendingAnswer && (
              <span style={{ fontSize: '0.9rem', color: '#94a3b8' }}>Select an option to continue</span>
            )}

            {effectivelyAnswered && (
              <>
                <span style={{ fontSize: '0.95rem', fontWeight: 700, color: wasCorrect ? '#10b981' : '#ef4444' }}>
                  {wasCorrect ? '✓ Correct!' : '✗ Incorrect'}
                </span>

                {!wasCorrect && !showCorrectAnswer && (
                  <button
                    onClick={() => { setShowCorrectAnswer(true); setShowExplanation(true); }}
                    style={{ padding: '7px 18px', borderRadius: 20, fontWeight: 600, background: '#f1f5f9', color: '#475569', border: '1px solid #e2e8f0', cursor: 'pointer', fontSize: '0.9rem' }}
                  >
                    Show Answer & Explanation
                  </button>
                )}

                {(wasCorrect || showCorrectAnswer) && (
                  <button
                    onClick={() => setShowExplanation(v => !v)}
                    style={{ padding: '7px 18px', borderRadius: 20, fontWeight: 600, background: showExplanation ? '#1e293b' : '#f1f5f9', color: showExplanation ? 'white' : '#475569', border: '1px solid #e2e8f0', cursor: 'pointer', fontSize: '0.9rem' }}
                  >
                    {showExplanation ? 'Hide Explanation' : 'Show Explanation'}
                  </button>
                )}
              </>
            )}
          </div>

          {/* Explanation panel */}
          {showResult && (
            <div style={{ marginTop: '1rem', padding: '1.25rem', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8 }}>
              <h4 style={{ fontWeight: 600, marginBottom: '0.75rem', color: '#0f172a' }}>Explanation</h4>
              {cleanExplanation(fullQ.rationale).split('\n\n').map((para, idx) => (
                <p key={idx} style={{ fontSize: '0.93rem', color: '#334155', lineHeight: 1.7, marginBottom: idx === cleanExplanation(fullQ.rationale).split('\n\n').length - 1 ? 0 : '0.85em' }}>
                  {para}
                </p>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── FOOTER ── */}
      <div style={{ background: '#f0f0f0', borderTop: '1px solid #bbb', flexShrink: 0, position: 'relative' }}>
        {/* Coloured mini strip */}
        <div style={{ display: 'flex', height: 5 }}>
          {pool.map((q, i) => {
            const hasPending = !!pendingSelections[q.id];
            const isAns = q.status !== 'unanswered' || checkedIds.has(q.id) || (isExtra && !!(state.extraPracticeAnswers?.[q.id]));
            const color = isAns
              ? (q.status === 'correct' || state.extraPracticeAnswers?.[q.id]?.isCorrect ? '#10b981' : (q.status === 'incorrect' || state.extraPracticeAnswers?.[q.id]?.isCorrect === false ? '#ef4444' : '#94a3b8'))
              : hasPending ? '#f59e0b' : 'transparent';
            return <div key={i} style={{ flex: 1, background: color, borderRight: '1px solid #d0d0d0' }} />;
          })}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.75rem 1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <button
              onClick={() => { setNotebookOpen(false); setDiaryOpen(v => !v); }}
              style={{ background: 'white', border: '1px solid #e2e8f0', padding: '6px 12px', borderRadius: 20, fontSize: '0.85rem', fontWeight: 600, color: '#334155', display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}
            >
              <BookOpen size={14} color="#6366f1" /> Diary
            </button>
            <button
              onClick={() => { setDiaryOpen(false); setNotebookOpen(v => !v); }}
              style={{ background: 'white', border: '1px solid #e2e8f0', padding: '6px 12px', borderRadius: 20, fontSize: '0.85rem', fontWeight: 600, color: '#334155', display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}
            >
              <BookOpen size={14} color="#3b82f6" /> Notebook
            </button>
            <button
              onClick={() => setShowGrid(v => !v)}
              style={{ background: '#1e293b', color: 'white', padding: '5px 16px', borderRadius: 20, fontSize: '0.88rem', fontWeight: 500, border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}
            >
              Question {currentIndex + 1} of {pool.length} <ChevronUp size={13} style={{ transform: showGrid ? 'rotate(0)' : 'rotate(180deg)', transition: 'transform 0.2s' }} />
            </button>
          </div>

          <div style={{ display: 'flex', gap: 10 }}>
            <button
              onClick={() => setCurrentIndex(c => Math.max(0, c - 1))}
              disabled={currentIndex === 0}
              style={{ padding: '8px 26px', borderRadius: 20, fontWeight: 600, fontSize: '0.92rem', background: currentIndex === 0 ? '#cbd5e1' : '#1e293b', color: 'white', border: 'none', cursor: currentIndex === 0 ? 'not-allowed' : 'pointer' }}
            >Back</button>
            <button
              onClick={() => {
                // Auto-check if we're on last question and there are pending
                if (currentIndex === pool.length - 1 && allHandled && pendingCount > 0) {
                  handleAutoCheckAll();
                } else {
                  setCurrentIndex(c => Math.min(pool.length - 1, c + 1));
                }
              }}
              style={{ padding: '8px 26px', borderRadius: 20, fontWeight: 600, fontSize: '0.92rem', background: '#2563eb', color: 'white', border: 'none', cursor: 'pointer' }}
            >
              {currentIndex === pool.length - 1 && allHandled && pendingCount > 0
                ? `Submit All (${pendingCount})`
                : 'Next'}
            </button>
          </div>
        </div>

        {/* Grid popup */}
        {showGrid && (
          <div style={{ position: 'absolute', bottom: 68, left: '50%', transform: 'translateX(-50%)', background: 'white', border: '1px solid #ccc', borderRadius: 12, boxShadow: '0 -4px 20px rgba(0,0,0,0.15)', padding: '1rem 1.25rem', maxWidth: 720, width: '95vw', zIndex: 200 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
              <h4 style={{ fontWeight: 600, fontSize: '0.95rem' }}>Jump to Question</h4>
              <button onClick={() => setShowGrid(false)}><X size={16} /></button>
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, maxHeight: 200, overflowY: 'auto' }}>
              {pool.map((q, idx) => {
                const isAns = q.status !== 'unanswered' || checkedIds.has(q.id) || (isExtra && !!(state.extraPracticeAnswers?.[q.id])) || (isBank && !!(state.bankAnswers?.[q.id]));
                const hasPend = !!pendingSelections[q.id];
                const isCorrect = q.status === 'correct' || (isExtra && state.extraPracticeAnswers?.[q.id]?.isCorrect) || (isBank && state.bankAnswers?.[q.id]?.isCorrect);
                
                let bg = '#f1f5f9';
                let borderCol = '#e2e8f0';
                let txtCol = '#1e293b';

                if (isAns) {
                  bg = isCorrect ? '#10b981' : '#ef4444';
                  borderCol = bg;
                  txtCol = 'white';
                } else if (hasPend) {
                  bg = '#fef9c3';
                  borderCol = '#f59e0b';
                } else if (q.confused) {
                  bg = '#fef08a'; // Yellow for flagged
                  borderCol = '#eab308';
                }

                return (
                  <button key={idx} onClick={() => { setCurrentIndex(idx); setShowGrid(false); }} style={{ width: 34, height: 34, borderRadius: 4, fontWeight: 600, fontSize: '0.82rem', border: currentIndex === idx ? '2px solid #2563eb' : `1px solid ${borderCol}`, background: bg, color: txtCol, cursor: 'pointer', position: 'relative' }}>
                    {idx + 1}
                    {q.confused && <div style={{ position: 'absolute', top: -3, right: -3, width: 7, height: 7, borderRadius: '50%', background: '#d97706' }} />}
                  </button>
                );
              })}
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', marginTop: '0.75rem', fontSize: '0.78rem', color: '#64748b' }}>
              <span><span style={{ display: 'inline-block', width: 10, height: 10, background: '#10b981', borderRadius: 2, marginRight: 4 }} />Correct</span>
              <span><span style={{ display: 'inline-block', width: 10, height: 10, background: '#ef4444', borderRadius: 2, marginRight: 4 }} />Incorrect</span>
              <span><span style={{ display: 'inline-block', width: 10, height: 10, background: '#fef08a', border: '1px solid #eab308', borderRadius: 2, marginRight: 4 }} />Marked for Review</span>
              <span><span style={{ display: 'inline-block', width: 10, height: 10, background: '#fef9c3', border: '1px solid #f59e0b', borderRadius: 2, marginRight: 4 }} />Selected (unchecked)</span>
              <span><span style={{ display: 'inline-block', width: 10, height: 10, background: '#f1f5f9', border: '1px solid #e2e8f0', borderRadius: 2, marginRight: 4 }} />Unanswered</span>
            </div>
          </div>
        )}
      </div>

      {/* Notebook panel */}
      {notebookOpen && (
        <div style={{ position: 'absolute', top: 58, right: 16, width: 310, background: 'white', borderRadius: 10, boxShadow: '0 4px 20px rgba(0,0,0,0.15)', padding: '1.2rem', zIndex: 300, border: '1px solid #ddd' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
            <h3 style={{ fontWeight: 600, fontSize: '1rem' }}>Notebook</h3>
            <button onClick={() => setNotebookOpen(false)} style={{ background:'transparent', border:'none', cursor:'pointer' }}><X size={15} /></button>
          </div>
          <input type="text" placeholder="Type a word to save…" value={lookupWord} onChange={e => setLookupWord(e.target.value)} onKeyDown={e => e.key === 'Enter' && saveWord()} style={{ width: '100%', padding: '7px 10px', marginBottom: '0.6rem', border: '1px solid #ccc', borderRadius: 6, fontSize: '0.93rem' }} />
          <button onClick={saveWord} style={{ width: '100%', padding: '8px', background: '#1e293b', color: 'white', border: 'none', borderRadius: 6, fontWeight: 600, cursor: 'pointer', fontSize: '0.9rem' }}>Save to Notebook</button>
          {state.confusedWordsList?.length > 0 && (
            <div style={{ marginTop: '0.75rem', borderTop: '1px solid #eee', paddingTop: '0.6rem', maxHeight: 240, overflowY: 'auto' }}>
              <p style={{ fontSize: '0.75rem', color: '#94a3b8', marginBottom: '0.4rem' }}>Saved words ({state.confusedWordsList.length}):</p>
              {[...state.confusedWordsList].reverse().map((w, i) => (
                <WordDefinition key={i} wordObj={w} onRemove={() => removeFromNotebook(w.word)} />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Diary panel */}
      {diaryOpen && (
        <div style={{ position: 'absolute', top: 58, right: 16, width: 320, background: 'white', borderRadius: 10, boxShadow: '0 4px 20px rgba(0,0,0,0.15)', padding: '1.2rem', zIndex: 300, border: '1px solid #ddd', display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
            <h3 style={{ fontWeight: 600, fontSize: '1rem', display: 'flex', alignItems: 'center', gap: 6 }}><BookOpen size={16} color="#6366f1"/> Question Diary</h3>
            <button onClick={() => setDiaryOpen(false)} style={{ background:'transparent', border:'none', cursor:'pointer' }}><X size={15} /></button>
          </div>
          <p style={{ fontSize: '0.75rem', color: '#64748b', marginBottom: '0.75rem' }}>Write your thoughts or reminders about this specific question. It will be saved automatically.</p>
          <textarea 
            value={diaryText} 
            onChange={e => { setDiaryText(e.target.value); updateQuestionNote(qId, e.target.value); }} 
            placeholder="I picked B because..."
            style={{ width: '100%', minHeight: 120, padding: '10px', border: '1px solid #ccc', borderRadius: 6, fontSize: '0.85rem', resize: 'vertical', fontFamily: 'inherit' }} 
          />
        </div>
      )}
    </div>
  );
}
