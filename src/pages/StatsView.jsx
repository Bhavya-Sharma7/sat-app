import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useApp } from '../store/AppContext';
import { X } from 'lucide-react';

const fetchDefinition = async (word) => {
  try {
    const res = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${word}`);
    const data = await res.json();
    return data[0]?.meanings[0]?.definitions[0]?.definition || 'Definition not found.';
  } catch (e) {
    return 'Error fetching definition.';
  }
};

const WordDefinitionStatCard = ({ w, onRemove }) => {
  const [def, setDef] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleClick = async () => {
    if (def) { setDef(null); return; }
    setLoading(true);
    const text = await fetchDefinition(w.word);
    setDef(text);
    setLoading(false);
  };

  return (
    <div style={{ background: 'white', borderRadius: 10, padding: '1rem', boxShadow: '0 1px 4px rgba(0,0,0,0.07)', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
      <div style={{ flex: 1, cursor: 'pointer' }} onClick={handleClick}>
        <p style={{ fontWeight: 700, fontSize: '1.1rem', marginBottom: '0.25rem', display: 'flex', alignItems: 'center', gap: 6 }}>
          {w.word}
          {loading ? <span style={{fontSize:'0.7rem', color:'#94a3b8', fontWeight:400}}>...</span> : <span style={{fontSize:'0.7rem', color:'#cbd5e1', fontWeight:400}}>▼ click for def</span>}
        </p>
        {def && <p style={{ fontSize: '0.85rem', color: '#64748b', marginTop: 8, background: '#f8fafc', padding: '8px 12px', borderRadius: 6 }}>{def}</p>}
        {w.definition && !def && <p style={{ fontSize: '0.85rem', color: '#64748b' }}>{w.definition}</p>}
        <p style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '0.5rem' }}>{w.date ? new Date(w.date).toLocaleDateString() : ''}</p>
      </div>
      <button onClick={(e) => { e.stopPropagation(); onRemove(w.word); }} style={{ color: '#cbd5e1', background: 'none', border: 'none', cursor: 'pointer', marginLeft: 8, padding: 4 }}>
        <X size={16} />
      </button>
    </div>
  );
};

function normalizePdfText(text) {
  if (!text) return '';
  const paragraphs = text.split(/\n{2,}/);
  return paragraphs
    .map(p => p.replace(/([^\n])\n([^\n])/g, '$1 $2').trim())
    .filter(Boolean)
    .join('\n\n');
}

// Mini question review modal
function QuestionReviewModal({ questionId, onClose }) {
  const { allQuestions } = useApp();
  const fullQ = allQuestions.find(q => q.id === questionId);
  if (!fullQ) return null;

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}>
      <div style={{ background: 'white', borderRadius: 12, maxWidth: 900, width: '100%', maxHeight: '85vh', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <span style={{ fontWeight: 700 }}>{fullQ.skill}</span>
            <span style={{ marginLeft: 8, padding: '2px 8px', borderRadius: 12, fontSize: '0.8rem', background: '#f1f5f9', color: '#475569' }}>{fullQ.difficulty}</span>
          </div>
          <button onClick={onClose}><X size={20} /></button>
        </div>
        <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
          <div style={{ flex: 1, padding: '1.5rem 2rem', overflowY: 'auto', fontFamily: 'Georgia, serif', fontSize: '1.05rem', lineHeight: 1.8, borderRight: '1px solid #e2e8f0' }}>
            {normalizePdfText(fullQ.question)}
          </div>
          <div style={{ flex: 1, padding: '1.5rem 2rem', overflowY: 'auto' }}>
            {['A', 'B', 'C', 'D'].map(letter => {
              const isCorrect = fullQ.correct_answer === letter;
              return fullQ.options?.[letter] ? (
                <div key={letter} style={{ display: 'flex', gap: 10, marginBottom: '0.75rem', padding: '0.75rem', borderRadius: 8, background: isCorrect ? '#f0fdf4' : '#f8fafc', border: `1.5px solid ${isCorrect ? '#10b981' : '#e2e8f0'}` }}>
                  <span style={{ fontWeight: 700, color: isCorrect ? '#10b981' : '#555', minWidth: 20 }}>{letter}</span>
                  <span style={{ fontSize: '0.95rem' }}>{fullQ.options[letter]}</span>
                </div>
              ) : null;
            })}
            <div style={{ marginTop: '1rem', padding: '1rem', background: '#f8fafc', borderRadius: 8, border: '1px solid #e2e8f0' }}>
              <h4 style={{ fontWeight: 600, marginBottom: '0.5rem' }}>Explanation</h4>
              <p style={{ fontSize: '0.9rem', color: '#334155', lineHeight: 1.7 }}>{fullQ.rationale}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function StatsView() {
  const { state, allQuestions, updateState } = useApp();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const initTab = searchParams.get('tab') || 'overview';
  const [activeTab, setActiveTab] = useState(initTab);
  const [reviewingQId, setReviewingQId] = useState(null);

  useEffect(() => { setActiveTab(searchParams.get('tab') || 'overview'); }, [searchParams]);

  const removeFromWrongList = (questionId) => {
    updateState(prev => ({ ...prev, wrongList: prev.wrongList.filter(w => w.questionId !== questionId) }));
  };
  const removeFromNotebook = (word) => {
    updateState(prev => ({ ...prev, confusedWordsList: (prev.confusedWordsList || []).filter(w => w.word !== word) }));
  };
  const removeFromVocabConfused = (word) => {
    updateState(prev => ({ ...prev, vocabConfusedList: (prev.vocabConfusedList || []).filter(w => w.word !== word) }));
  };

  // Compute stats
  let totalAnswered = 0, totalCorrect = 0;
  const skillStats = {};
  const diffStats = { Easy: { a: 0, c: 0 }, Medium: { a: 0, c: 0 }, Hard: { a: 0, c: 0 } };

  state.generatedDays.forEach(day => {
    day.questions.forEach(q => {
      if (q.status !== 'unanswered') {
        totalAnswered++;
        if (q.status === 'correct') totalCorrect++;
        if (!skillStats[q.skill]) skillStats[q.skill] = { answered: 0, correct: 0 };
        skillStats[q.skill].answered++;
        if (q.status === 'correct') skillStats[q.skill].correct++;
        if (diffStats[q.difficulty]) {
          diffStats[q.difficulty].a++;
          if (q.status === 'correct') diffStats[q.difficulty].c++;
        }
      }
    });
  });

  const overallAcc = totalAnswered > 0 ? Math.round((totalCorrect / totalAnswered) * 100) : 0;
  const daysCompleted = state.generatedDays.filter(d => d.status === 'Completed').length;

  const tabs = [
    { id: 'overview', label: 'Overview' },
    { id: 'wrong', label: `Wrong Questions (${state.wrongList?.length || 0})` },
    { id: 'notebook', label: `Notebook (${state.confusedWordsList?.length || 0})` },
    { id: 'vocab_confused', label: `Confused Vocab (${state.vocabConfusedList?.length || 0})` },
  ];

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#f8fafc' }}>
      {/* Sidebar */}
      <aside style={{ width: 220, background: '#1e293b', color: 'white', padding: '1.5rem 1rem', flexShrink: 0 }}>
        <button onClick={() => navigate('/')} style={{ color: '#94a3b8', background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.9rem', marginBottom: '1rem' }}>← Dashboard</button>
        <h2 style={{ fontWeight: 700, fontSize: '1.2rem', marginBottom: '1.5rem' }}>Stats & Review</h2>
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{ display: 'block', width: '100%', textAlign: 'left', padding: '10px 12px', borderRadius: 8, border: 'none', cursor: 'pointer', marginBottom: 4, fontWeight: activeTab === tab.id ? 700 : 500, background: activeTab === tab.id ? 'rgba(255,255,255,0.15)' : 'transparent', color: 'white', fontSize: '0.9rem' }}
          >
            {tab.label}
          </button>
        ))}
      </aside>

      <main style={{ flex: 1, padding: '2rem 3rem', overflowY: 'auto' }}>
        {/* OVERVIEW */}
        {activeTab === 'overview' && (
          <div>
            <h1 style={{ fontSize: '1.75rem', fontWeight: 700, marginBottom: '2rem' }}>Performance Overview</h1>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1.25rem', marginBottom: '2rem' }}>
              <StatCard title="Overall Accuracy" value={`${overallAcc}%`} sub={`${totalCorrect} / ${totalAnswered} correct`} color="#2563eb" />
              <StatCard title="Days Completed" value={`${daysCompleted} / 11`} sub="Keep going!" color="#10b981" />
              <StatCard title="Questions Answered" value={totalAnswered} sub={`${state.wrongList?.length || 0} still wrong`} color="#f59e0b" />
            </div>

            <div style={{ background: 'white', borderRadius: 12, padding: '1.5rem', boxShadow: '0 1px 4px rgba(0,0,0,0.07)', marginBottom: '1.5rem' }}>
              <h3 style={{ fontWeight: 600, marginBottom: '1rem' }}>Accuracy by Skill</h3>
              {Object.entries(skillStats).sort((a, b) => a[0].localeCompare(b[0])).map(([skill, s]) => {
                const acc = Math.round((s.correct / s.answered) * 100);
                return (
                  <div key={skill} style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '0.75rem' }}>
                    <span style={{ width: 220, fontSize: '0.9rem', fontWeight: 500, flexShrink: 0 }}>{skill}</span>
                    <div style={{ flex: 1, height: 10, background: '#f1f5f9', borderRadius: 5, overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${acc}%`, background: acc >= 80 ? '#10b981' : acc >= 60 ? '#f59e0b' : '#ef4444', borderRadius: 5 }} />
                    </div>
                    <span style={{ width: 55, textAlign: 'right', fontSize: '0.9rem', fontWeight: 600 }}>{acc}% ({s.answered})</span>
                  </div>
                );
              })}
            </div>

            <div style={{ background: 'white', borderRadius: 12, padding: '1.5rem', boxShadow: '0 1px 4px rgba(0,0,0,0.07)' }}>
              <h3 style={{ fontWeight: 600, marginBottom: '1rem' }}>Accuracy by Difficulty</h3>
              {Object.entries(diffStats).map(([diff, s]) => {
                const acc = s.a > 0 ? Math.round((s.c / s.a) * 100) : 0;
                const color = diff === 'Easy' ? '#10b981' : diff === 'Medium' ? '#f59e0b' : '#ef4444';
                return s.a > 0 && (
                  <div key={diff} style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '0.75rem' }}>
                    <span style={{ width: 80, fontSize: '0.9rem', fontWeight: 600, color }}>{diff}</span>
                    <div style={{ flex: 1, height: 10, background: '#f1f5f9', borderRadius: 5, overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${acc}%`, background: color, borderRadius: 5 }} />
                    </div>
                    <span style={{ width: 55, textAlign: 'right', fontSize: '0.9rem' }}>{acc}% ({s.a})</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* WRONG QUESTIONS */}
        {activeTab === 'wrong' && (
          <div>
            <h1 style={{ fontSize: '1.75rem', fontWeight: 700, marginBottom: '2rem' }}>Wrong Questions</h1>
            {!state.wrongList?.length ? (
              <div style={{ background: 'white', borderRadius: 12, padding: '3rem', textAlign: 'center', color: '#94a3b8' }}>
                <p style={{ fontSize: '1.25rem' }}>No wrong questions yet — great job! 🎉</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {state.wrongList.map(w => {
                  const fullQ = allQuestions.find(q => q.id === w.questionId);
                  if (!fullQ) return null;
                  const latestAttempt = w.attempts[w.attempts.length - 1];
                  return (
                    <div key={w.questionId} style={{ background: 'white', borderRadius: 10, padding: '1rem 1.25rem', boxShadow: '0 1px 4px rgba(0,0,0,0.07)', display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: '0.5rem' }}>
                          <span style={{ fontSize: '0.78rem', background: '#eff6ff', color: '#2563eb', padding: '2px 8px', borderRadius: 12, fontWeight: 600 }}>{fullQ.skill}</span>
                          <span style={{ fontSize: '0.78rem', background: '#f1f5f9', color: '#475569', padding: '2px 8px', borderRadius: 12 }}>{fullQ.difficulty}</span>
                          <span style={{ fontSize: '0.78rem', color: '#94a3b8' }}>Attempts: {w.attempts.length}</span>
                        </div>
                        <p style={{ fontSize: '0.9rem', color: '#334155', lineHeight: 1.5 }}>
                          {normalizePdfText(fullQ.question || '').substring(0, 180)}...
                        </p>
                        {latestAttempt && (
                          <p style={{ fontSize: '0.8rem', color: '#94a3b8', marginTop: '0.25rem' }}>
                            Your answer: <strong style={{ color: '#ef4444' }}>{latestAttempt.selectedAnswer}</strong> — Correct: <strong style={{ color: '#10b981' }}>{latestAttempt.correctAnswer}</strong>
                          </p>
                        )}
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, flexShrink: 0 }}>
                        <button
                          onClick={() => setReviewingQId(w.questionId)}
                          style={{ padding: '6px 14px', background: '#2563eb', color: 'white', border: 'none', borderRadius: 20, cursor: 'pointer', fontSize: '0.85rem', fontWeight: 600, whiteSpace: 'nowrap' }}
                        >
                          Review →
                        </button>
                        <button
                          onClick={() => removeFromWrongList(w.questionId)}
                          style={{ padding: '6px 14px', background: '#fff', color: '#94a3b8', border: '1px solid #e2e8f0', borderRadius: 20, cursor: 'pointer', fontSize: '0.85rem' }}
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* NOTEBOOK */}
        {activeTab === 'notebook' && (
          <div>
            <h1 style={{ fontSize: '1.75rem', fontWeight: 700, marginBottom: '2rem' }}>Notebook — Saved Words</h1>
            {!state.confusedWordsList?.length ? (
              <div style={{ background: 'white', borderRadius: 12, padding: '3rem', textAlign: 'center', color: '#94a3b8' }}>
                <p style={{ fontSize: '1.25rem' }}>Your notebook is empty. Save words while solving questions!</p>
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '0.75rem' }}>
                {state.confusedWordsList.map((w, i) => (
                  <WordDefinitionStatCard key={i} w={w} onRemove={removeFromNotebook} />
                ))}
              </div>
            )}
          </div>
        )}

        {/* CONFUSED VOCAB */}
        {activeTab === 'vocab_confused' && (
          <div>
            <h1 style={{ fontSize: '1.75rem', fontWeight: 700, marginBottom: '2rem' }}>Confused Vocabulary</h1>
            {!state.vocabConfusedList?.length ? (
              <div style={{ background: 'white', borderRadius: 12, padding: '3rem', textAlign: 'center', color: '#94a3b8' }}>
                <p style={{ fontSize: '1.25rem' }}>No confused vocab words yet! Mark words as confused in Vocab Mode.</p>
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1rem' }}>
                {state.vocabConfusedList.map((w, i) => (
                  <div key={i} style={{ background: 'white', borderRadius: 10, padding: '1.25rem', boxShadow: '0 1px 4px rgba(0,0,0,0.07)', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <p style={{ fontWeight: 700, fontSize: '1.2rem', marginBottom: '0.25rem', fontFamily: 'Georgia, serif' }}>{w.word}</p>
                      {w.partOfSpeech && <p style={{ fontSize: '0.85rem', color: '#94a3b8', fontStyle: 'italic', marginBottom: '0.5rem' }}>{w.partOfSpeech}</p>}
                      {w.definition && <p style={{ fontSize: '0.9rem', color: '#334155', marginBottom: '0.5rem' }}>{w.definition}</p>}
                      {w.example && <p style={{ fontSize: '0.85rem', color: '#64748b', fontStyle: 'italic' }}>"{w.example}"</p>}
                      <p style={{ fontSize: '0.75rem', color: '#cbd5e1', marginTop: '0.5rem' }}>{w.addedDate ? new Date(w.addedDate).toLocaleDateString() : ''}</p>
                    </div>
                    <button onClick={() => removeFromVocabConfused(w.word)} style={{ color: '#cbd5e1', background: 'none', border: 'none', cursor: 'pointer', marginLeft: 8, flexShrink: 0 }}>
                      <X size={16} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </main>

      {/* Question review modal */}
      {reviewingQId && <QuestionReviewModal questionId={reviewingQId} onClose={() => setReviewingQId(null)} />}
    </div>
  );
}

function StatCard({ title, value, sub, color }) {
  return (
    <div style={{ background: 'white', borderRadius: 12, padding: '1.5rem', boxShadow: '0 1px 4px rgba(0,0,0,0.07)', borderLeft: `4px solid ${color}` }}>
      <p style={{ fontSize: '0.8rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: '0.5rem' }}>{title}</p>
      <p style={{ fontSize: '2.25rem', fontWeight: 700, color: color, lineHeight: 1 }}>{value}</p>
      <p style={{ fontSize: '0.85rem', color: '#94a3b8', marginTop: '0.5rem' }}>{sub}</p>
    </div>
  );
}
