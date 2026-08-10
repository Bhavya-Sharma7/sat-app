import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useApp } from '../store/AppContext';
import { ArrowLeft, ArrowRight, RotateCcw, BookMarked } from 'lucide-react';

export default function VocabMode() {
  const { dayNumber } = useParams();
  const navigate = useNavigate();
  const { state, updateState } = useApp();

  const [currentIndex, setCurrentIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [guess, setGuess] = useState('');
  const inputRef = useRef(null);

  // Build pool
  let pool = [];
  if (dayNumber === 'extra') {
    pool = (state.unusedVocab || []).slice(0, 25);
  } else {
    const dayObj = state.generatedDays.find(d => d.dayNumber === parseInt(dayNumber));
    if (dayObj) pool = dayObj.vocabQueue || [];
  }

  useEffect(() => {
    setFlipped(false);
    setGuess('');
    setTimeout(() => inputRef.current?.focus(), 50);
  }, [currentIndex]);

  const goNext = () => setCurrentIndex(c => Math.min(pool.length, c + 1));
  const goPrev = () => { setCurrentIndex(c => Math.max(0, c - 1)); };

  const handleRating = (rating) => {
    if (!currentWord) return;
    updateState(prev => {
      const history = { ...(prev.vocabHistory || {}) };
      history[currentWord.word] = {
        seenCount: ((history[currentWord.word]?.seenCount) || 0) + 1,
        lastSeen: new Date().toISOString(),
        status: rating
      };
      return { ...prev, vocabHistory: history };
    });
    goNext();
  };

  const handleMarkConfused = () => {
    if (!currentWord) return;
    updateState(prev => {
      const list = prev.vocabConfusedList || [];
      const already = list.find(w => w.word === currentWord.word);
      if (already) return prev; // already saved
      return {
        ...prev,
        vocabConfusedList: [
          ...list,
          { word: currentWord.word, partOfSpeech: currentWord.partOfSpeech, definition: currentWord.definition, example: currentWord.example, addedDate: new Date().toISOString() }
        ]
      };
    });
  };

  const isWordConfused = (word) => (state.vocabConfusedList || []).some(w => w.word === word);

  if (!pool || pool.length === 0) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', flexDirection: 'column', gap: '1rem', fontFamily: 'Inter, system-ui, sans-serif' }}>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 700 }}>No vocab words available.</h2>
        <button onClick={() => navigate('/')} style={primaryBtn}>Go to Dashboard</button>
      </div>
    );
  }

  if (currentIndex >= pool.length) {
    const knew = pool.filter(w => state.vocabHistory?.[w.word]?.status === 'knew it').length;
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', flexDirection: 'column', gap: '1.5rem', fontFamily: 'Inter, system-ui, sans-serif', background: '#f8fafc' }}>
        <div style={{ textAlign: 'center', maxWidth: 480, padding: '3rem', background: 'white', borderRadius: 16, boxShadow: '0 4px 24px rgba(0,0,0,0.08)' }}>
          <div style={{ fontSize: '3rem', marginBottom: '0.5rem' }}>🎉</div>
          <h2 style={{ fontSize: '1.75rem', fontWeight: 700, marginBottom: '0.5rem' }}>Session Complete!</h2>
          <p style={{ color: '#64748b', marginBottom: '2rem' }}>You reviewed {pool.length} words this session.</p>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '2rem', marginBottom: '2rem' }}>
            <div style={{ textAlign: 'center' }}><div style={{ fontSize: '2rem', fontWeight: 700, color: '#10b981' }}>{knew}</div><div style={{ fontSize: '0.85rem', color: '#64748b' }}>Knew It</div></div>
            <div style={{ textAlign: 'center' }}><div style={{ fontSize: '2rem', fontWeight: 700, color: '#ef4444' }}>{pool.length - knew}</div><div style={{ fontSize: '0.85rem', color: '#64748b' }}>Still Learning</div></div>
          </div>
          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center' }}>
            <button onClick={() => { setCurrentIndex(0); setFlipped(false); }} style={{ ...secondaryBtn, display: 'flex', alignItems: 'center', gap: 6 }}>
              <RotateCcw size={14} /> Restart
            </button>
            <button onClick={() => navigate(dayNumber === 'extra' ? '/' : `/day/${dayNumber}`)} style={primaryBtn}>Return →</button>
          </div>
        </div>
      </div>
    );
  }

  const currentWord = pool[currentIndex];
  const pct = Math.round((currentIndex / pool.length) * 100);
  const confused = isWordConfused(currentWord?.word);

  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc', fontFamily: 'Inter, system-ui, sans-serif', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <div style={{ background: 'white', borderBottom: '1px solid #e2e8f0', padding: '0.9rem 2rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <button onClick={() => navigate(dayNumber === 'extra' ? '/' : `/day/${dayNumber}`)} style={{ color: '#64748b', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, fontWeight: 500, fontSize: '0.9rem' }}>
          <ArrowLeft size={15} /> Exit
        </button>
        <div style={{ fontWeight: 600, fontSize: '0.95rem', color: '#1e293b' }}>
          Vocabulary · {dayNumber === 'extra' ? 'Extra Practice' : `Day ${dayNumber}`}
        </div>
        <span style={{ color: '#64748b', fontSize: '0.9rem', fontWeight: 500 }}>{currentIndex + 1} / {pool.length}</span>
      </div>

      {/* Progress bar */}
      <div style={{ height: 4, background: '#e2e8f0' }}>
        <div style={{ height: '100%', width: `${pct}%`, background: '#2563eb', transition: 'width 0.3s' }} />
      </div>

      {/* Main card */}
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}>
        <div style={{ width: '100%', maxWidth: 580, background: 'white', borderRadius: 16, boxShadow: '0 4px 24px rgba(0,0,0,0.08)', overflow: 'hidden' }}>

          {/* Word front */}
          <div style={{ padding: '2.5rem 3rem 1.75rem', textAlign: 'center', borderBottom: '1px solid #f1f5f9', position: 'relative' }}>
            {/* Confused mark button */}
            <button
              onClick={handleMarkConfused}
              title={confused ? 'Already saved to confused list' : 'Mark as confused vocab'}
              style={{
                position: 'absolute', top: '1rem', right: '1rem',
                display: 'flex', alignItems: 'center', gap: 5,
                padding: '5px 12px', borderRadius: 20, border: '1px solid',
                borderColor: confused ? '#f59e0b' : '#e2e8f0',
                background: confused ? '#fef9c3' : 'white',
                color: confused ? '#92400e' : '#94a3b8',
                fontWeight: 600, fontSize: '0.78rem', cursor: confused ? 'default' : 'pointer'
              }}
            >
              <BookMarked size={13} fill={confused ? 'currentColor' : 'none'} />
              {confused ? 'Saved' : 'Mark Confused'}
            </button>

            <h1 style={{ fontSize: '2.75rem', fontWeight: 700, fontFamily: 'Georgia, serif', color: '#1e293b', marginBottom: '0.4rem' }}>
              {currentWord.word}
            </h1>
            <span style={{ fontSize: '1.05rem', color: '#94a3b8', fontStyle: 'italic' }}>
              {currentWord.partOfSpeech || ''}
            </span>
          </div>

          {/* Card body */}
          <div style={{ padding: '2rem 3rem 2.5rem' }}>
            {!flipped ? (
              <div style={{ textAlign: 'center' }}>
                <p style={{ color: '#64748b', marginBottom: '1.25rem', fontSize: '0.95rem' }}>
                  What does this word mean?
                </p>
                <input
                  ref={inputRef}
                  type="text"
                  value={guess}
                  onChange={e => setGuess(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && setFlipped(true)}
                  placeholder="Type your guess… (or skip)"
                  style={{ width: '100%', padding: '0.8rem 1rem', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: '1rem', marginBottom: '1rem', textAlign: 'center', outline: 'none' }}
                />
                <div style={{ display: 'flex', gap: '0.75rem' }}>
                  <button
                    onClick={goNext}
                    style={{ flex: 1, padding: '0.8rem', borderRadius: 8, border: '1px solid #e2e8f0', background: 'white', color: '#475569', fontWeight: 600, cursor: 'pointer', fontSize: '0.9rem' }}
                  >
                    Skip →
                  </button>
                  <button
                    onClick={() => setFlipped(true)}
                    style={{ flex: 2, padding: '0.8rem', borderRadius: 8, border: 'none', background: '#2563eb', color: 'white', fontWeight: 700, cursor: 'pointer', fontSize: '0.95rem' }}
                  >
                    Reveal Definition
                  </button>
                </div>
              </div>
            ) : (
              <div>
                {guess.trim() && (
                  <div style={{ marginBottom: '0.9rem', padding: '0.65rem 1rem', background: '#f8fafc', borderRadius: 8, border: '1px solid #e2e8f0' }}>
                    <span style={{ fontSize: '0.78rem', color: '#94a3b8', display: 'block', marginBottom: 2 }}>Your guess:</span>
                    <span style={{ fontSize: '0.95rem', color: '#334155', fontStyle: 'italic' }}>"{guess}"</span>
                  </div>
                )}

                <div style={{ padding: '1.25rem 1.5rem', background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 10, marginBottom: '1.25rem' }}>
                  <p style={{ fontSize: '1.1rem', fontWeight: 500, color: '#1e3a8a', lineHeight: 1.6, marginBottom: '0.75rem' }}>
                    {currentWord.definition}
                  </p>
                  {currentWord.example && (
                    <p style={{ fontSize: '0.97rem', color: '#3730a3', fontStyle: 'italic', lineHeight: 1.6 }}>
                      "{currentWord.example}"
                    </p>
                  )}
                </div>

                <p style={{ textAlign: 'center', fontWeight: 600, color: '#475569', marginBottom: '0.9rem', fontSize: '0.9rem' }}>How did you do?</p>
                <div style={{ display: 'flex', gap: '0.9rem' }}>
                  <button
                    onClick={() => handleRating('still learning')}
                    style={{ flex: 1, padding: '0.85rem', borderRadius: 10, border: '1.5px solid #fca5a5', background: '#fff', color: '#b91c1c', fontWeight: 700, cursor: 'pointer', fontSize: '0.92rem' }}
                    onMouseEnter={e => e.target.style.background = '#fef2f2'}
                    onMouseLeave={e => e.target.style.background = '#fff'}
                  >
                    😕 Still Learning
                  </button>
                  <button
                    onClick={() => handleRating('knew it')}
                    style={{ flex: 1, padding: '0.85rem', borderRadius: 10, border: '1.5px solid #6ee7b7', background: '#fff', color: '#065f46', fontWeight: 700, cursor: 'pointer', fontSize: '0.92rem' }}
                    onMouseEnter={e => e.target.style.background = '#f0fdf4'}
                    onMouseLeave={e => e.target.style.background = '#fff'}
                  >
                    ✓ Knew It
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Bottom nav */}
      <div style={{ background: 'white', borderTop: '1px solid #e2e8f0', padding: '0.9rem 2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <button
          onClick={goPrev}
          disabled={currentIndex === 0}
          style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '7px 18px', borderRadius: 20, border: '1px solid #e2e8f0', background: currentIndex === 0 ? '#f8fafc' : 'white', color: currentIndex === 0 ? '#cbd5e1' : '#475569', fontWeight: 600, cursor: currentIndex === 0 ? 'not-allowed' : 'pointer', fontSize: '0.88rem' }}
        >
          <ArrowLeft size={14} /> Previous
        </button>

        {/* Dot navigator */}
        <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
          {pool.slice(0, Math.min(pool.length, 30)).map((w, i) => (
            <div
              key={i}
              onClick={() => setCurrentIndex(i)}
              style={{
                width: i === currentIndex ? 14 : 6, height: 6, borderRadius: 3,
                background: i === currentIndex ? '#2563eb' : i < currentIndex ? '#10b981' : '#e2e8f0',
                transition: 'all 0.2s', cursor: 'pointer'
              }}
            />
          ))}
          {pool.length > 30 && <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>…</span>}
        </div>

        <button
          onClick={goNext}
          style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '7px 18px', borderRadius: 20, border: 'none', background: '#2563eb', color: 'white', fontWeight: 600, cursor: 'pointer', fontSize: '0.88rem' }}
        >
          {currentIndex === pool.length - 1 ? 'Finish' : 'Next'} <ArrowRight size={14} />
        </button>
      </div>
    </div>
  );
}

const primaryBtn = {
  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
  padding: '9px 22px', borderRadius: 20, border: 'none',
  background: '#2563eb', color: 'white', fontWeight: 600, cursor: 'pointer',
  fontSize: '0.93rem', fontFamily: 'inherit'
};

const secondaryBtn = {
  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
  padding: '9px 22px', borderRadius: 20, border: '1px solid #e2e8f0',
  background: 'white', color: '#475569', fontWeight: 600, cursor: 'pointer',
  fontSize: '0.93rem', fontFamily: 'inherit'
};
