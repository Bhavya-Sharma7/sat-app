import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useApp } from '../store/AppContext';
import { ArrowLeft, ArrowRight, RotateCcw, BookMarked, BookOpen, Volume2, Loader2, X } from 'lucide-react';
import { fetchWordDefinition, getPhoneticAudio, getPhoneticText, getMeanings } from '../utils/dictionaryApi';

export default function VocabMode() {
  const { dayNumber } = useParams();
  const navigate = useNavigate();
  const { state, updateState } = useApp();

  const [currentIndex, setCurrentIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [guess, setGuess] = useState('');
  const inputRef = useRef(null);

  // Dictionary lookup state
  const [dictData, setDictData] = useState(null);   // fetched entries array
  const [dictLoading, setDictLoading] = useState(false);
  const [dictError, setDictError] = useState(false);
  const [showDict, setShowDict] = useState(false);
  const audioRef = useRef(null);

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
    setShowDict(false);
    setDictData(null);
    setDictError(false);
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

  // --- Dictionary API lookup ---
  const handleLookup = async () => {
    if (!currentWord) return;
    if (showDict && dictData) { setShowDict(false); return; }
    setShowDict(true);
    if (dictData !== null) return; // already fetched
    setDictLoading(true);
    setDictError(false);
    const entries = await fetchWordDefinition(currentWord.word);
    setDictLoading(false);
    if (!entries) {
      setDictError(true);
    } else {
      setDictData(entries);
    }
  };

  const playAudio = () => {
    if (audioRef.current) {
      audioRef.current.play().catch(() => {});
    }
  };

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

  // Derived dictionary data
  const phoneticText = dictData ? getPhoneticText(dictData) : null;
  const phoneticAudio = dictData ? getPhoneticAudio(dictData) : null;
  const meanings = dictData ? getMeanings(dictData) : [];

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
      <div style={{ flex: 1, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '2rem', overflowY: 'auto' }}>
        <div style={{ width: '100%', maxWidth: 620 }}>

          {/* Card */}
          <div style={{ background: 'white', borderRadius: 16, boxShadow: '0 4px 24px rgba(0,0,0,0.08)', overflow: 'hidden', marginBottom: showDict ? '1rem' : 0 }}>

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
                    style={{ width: '100%', padding: '0.8rem 1rem', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: '1rem', marginBottom: '1rem', textAlign: 'center', outline: 'none', boxSizing: 'border-box' }}
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
                    <p style={{ fontSize: '1.1rem', fontWeight: 500, color: '#1e3a8a', lineHeight: 1.6, marginBottom: currentWord.example ? '0.75rem' : 0 }}>
                      {currentWord.definition}
                    </p>
                    {currentWord.example && (
                      <p style={{ fontSize: '0.97rem', color: '#3730a3', fontStyle: 'italic', lineHeight: 1.6, marginBottom: 0 }}>
                        "{currentWord.example}"
                      </p>
                    )}
                  </div>

                  {/* Dictionary lookup button */}
                  <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1.25rem' }}>
                    <button
                      onClick={handleLookup}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 7,
                        padding: '7px 18px', borderRadius: 20,
                        border: '1.5px solid',
                        borderColor: showDict ? '#7c3aed' : '#c4b5fd',
                        background: showDict ? '#7c3aed' : '#f5f3ff',
                        color: showDict ? 'white' : '#6d28d9',
                        fontWeight: 600, fontSize: '0.84rem', cursor: 'pointer',
                        transition: 'all 0.18s'
                      }}
                    >
                      {dictLoading
                        ? <><Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> Looking up…</>
                        : <><BookOpen size={14} /> {showDict ? 'Hide Dictionary' : 'Dictionary Lookup'}</>
                      }
                    </button>
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

          {/* ── Dictionary Panel ── */}
          {flipped && showDict && (
            <div style={{
              background: 'white', borderRadius: 14,
              boxShadow: '0 4px 24px rgba(109,40,217,0.10)',
              border: '1.5px solid #ede9fe',
              overflow: 'hidden',
              animation: 'slideDown 0.22s ease'
            }}>
              {/* Panel header */}
              <div style={{ padding: '0.9rem 1.4rem', background: '#7c3aed', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <BookOpen size={16} color="white" />
                  <span style={{ color: 'white', fontWeight: 700, fontSize: '0.92rem' }}>Free Dictionary</span>
                  {phoneticText && (
                    <span style={{ color: '#ddd6fe', fontSize: '0.88rem', fontStyle: 'italic' }}>{phoneticText}</span>
                  )}
                  {phoneticAudio && (
                    <>
                      <audio ref={audioRef} src={phoneticAudio} preload="none" />
                      <button
                        onClick={playAudio}
                        title="Play pronunciation"
                        style={{ background: 'rgba(255,255,255,0.18)', border: 'none', borderRadius: '50%', width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
                      >
                        <Volume2 size={14} color="white" />
                      </button>
                    </>
                  )}
                </div>
                <button
                  onClick={() => setShowDict(false)}
                  style={{ background: 'rgba(255,255,255,0.18)', border: 'none', borderRadius: '50%', width: 26, height: 26, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
                >
                  <X size={14} color="white" />
                </button>
              </div>

              {/* Panel body */}
              <div style={{ padding: '1.2rem 1.4rem', maxHeight: 360, overflowY: 'auto' }}>
                {dictLoading && (
                  <div style={{ textAlign: 'center', padding: '2rem', color: '#94a3b8' }}>
                    <Loader2 size={22} style={{ animation: 'spin 1s linear infinite', display: 'inline-block' }} />
                    <p style={{ marginTop: 8 }}>Fetching definition…</p>
                  </div>
                )}
                {dictError && (
                  <div style={{ textAlign: 'center', padding: '1.5rem', color: '#ef4444' }}>
                    <p style={{ fontWeight: 600 }}>Word not found in dictionary.</p>
                    <p style={{ fontSize: '0.84rem', color: '#94a3b8', marginTop: 4 }}>Try a different form of the word.</p>
                  </div>
                )}
                {!dictLoading && !dictError && meanings.length > 0 && meanings.map((meaning, mi) => (
                  <div key={mi} style={{ marginBottom: mi < meanings.length - 1 ? '1.2rem' : 0 }}>
                    {/* Part of speech badge */}
                    <span style={{
                      display: 'inline-block', padding: '2px 10px', borderRadius: 12,
                      background: '#ede9fe', color: '#6d28d9', fontSize: '0.78rem',
                      fontWeight: 700, marginBottom: '0.6rem', textTransform: 'uppercase', letterSpacing: '0.04em'
                    }}>
                      {meaning.partOfSpeech}
                    </span>

                    {/* Definitions */}
                    <ol style={{ margin: 0, paddingLeft: '1.3rem' }}>
                      {meaning.definitions.slice(0, 3).map((def, di) => (
                        <li key={di} style={{ marginBottom: '0.55rem' }}>
                          <p style={{ margin: 0, fontSize: '0.93rem', color: '#1e293b', lineHeight: 1.55 }}>{def.definition}</p>
                          {def.example && (
                            <p style={{ margin: '0.25rem 0 0', fontSize: '0.84rem', color: '#64748b', fontStyle: 'italic' }}>"{def.example}"</p>
                          )}
                        </li>
                      ))}
                    </ol>

                    {/* Synonyms */}
                    {(meaning.synonyms?.length > 0 || meaning.definitions.some(d => d.synonyms?.length > 0)) && (() => {
                      const syns = [
                        ...(meaning.synonyms || []),
                        ...meaning.definitions.flatMap(d => d.synonyms || [])
                      ].slice(0, 6);
                      return syns.length > 0 ? (
                        <div style={{ marginTop: '0.5rem', display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                          <span style={{ fontSize: '0.78rem', color: '#94a3b8', fontWeight: 600, alignSelf: 'center' }}>syn:</span>
                          {syns.map((s, si) => (
                            <span key={si} style={{ padding: '2px 8px', borderRadius: 10, background: '#f0fdf4', color: '#166534', fontSize: '0.78rem', fontWeight: 500 }}>{s}</span>
                          ))}
                        </div>
                      ) : null;
                    })()}

                    {/* Antonyms */}
                    {(meaning.antonyms?.length > 0 || meaning.definitions.some(d => d.antonyms?.length > 0)) && (() => {
                      const ants = [
                        ...(meaning.antonyms || []),
                        ...meaning.definitions.flatMap(d => d.antonyms || [])
                      ].slice(0, 6);
                      return ants.length > 0 ? (
                        <div style={{ marginTop: '0.4rem', display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                          <span style={{ fontSize: '0.78rem', color: '#94a3b8', fontWeight: 600, alignSelf: 'center' }}>ant:</span>
                          {ants.map((a, ai) => (
                            <span key={ai} style={{ padding: '2px 8px', borderRadius: 10, background: '#fff1f2', color: '#9f1239', fontSize: '0.78rem', fontWeight: 500 }}>{a}</span>
                          ))}
                        </div>
                      ) : null;
                    })()}

                    {/* Divider between meanings */}
                    {mi < meanings.length - 1 && <hr style={{ margin: '0.9rem 0 0', border: 'none', borderTop: '1px solid #f1f5f9' }} />}
                  </div>
                ))}
              </div>

              {/* Attribution */}
              <div style={{ padding: '0.5rem 1.4rem 0.7rem', borderTop: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', gap: 5 }}>
                <span style={{ fontSize: '0.72rem', color: '#94a3b8' }}>Powered by</span>
                <a href="https://dictionaryapi.dev" target="_blank" rel="noopener noreferrer" style={{ fontSize: '0.72rem', color: '#7c3aed', fontWeight: 600, textDecoration: 'none' }}>
                  Free Dictionary API
                </a>
              </div>
            </div>
          )}
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

      {/* Spinner keyframe */}
      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes slideDown { from { opacity: 0; transform: translateY(-10px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>
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
