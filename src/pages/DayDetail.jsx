import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useApp } from '../store/AppContext';
import { BookOpen, PlayCircle, RotateCcw } from 'lucide-react';

export default function DayDetail() {
  const { dayNumber } = useParams();
  const navigate = useNavigate();
  const { state } = useApp();

  const day = state.generatedDays.find(d => d.dayNumber === parseInt(dayNumber));
  if (!day) return <div style={{ padding: '2rem' }}>Day not found</div>;

  const total = day.questions.length;
  const answered = day.questions.filter(q => q.status !== 'unanswered').length;
  const correct = day.questions.filter(q => q.status === 'correct').length;
  const incorrect = day.questions.filter(q => q.status === 'incorrect').length;
  const confused = day.questions.filter(q => q.confused).length;
  const pct = total > 0 ? Math.round((answered / total) * 100) : 0;
  const acc = answered > 0 ? Math.round((correct / answered) * 100) : null;

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#f8fafc' }}>
      {/* Sidebar */}
      <aside style={{ width: 220, background: '#1e293b', color: 'white', padding: '1.5rem 1rem', flexShrink: 0 }}>
        <button onClick={() => navigate('/')} style={{ color: '#94a3b8', background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.9rem', marginBottom: '1rem' }}>← Dashboard</button>
        <h2 style={{ fontWeight: 700, fontSize: '1.2rem' }}>Day {day.dayNumber}</h2>
        <p style={{ color: '#94a3b8', fontSize: '0.85rem', marginTop: '0.5rem' }}>{day.status}</p>
      </aside>

      <main style={{ flex: 1, padding: '2rem 3rem', overflowY: 'auto' }}>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 700, marginBottom: '2rem' }}>Day {day.dayNumber} Overview</h1>

        {/* Progress card */}
        <div style={{ background: 'white', borderRadius: 12, padding: '2rem', boxShadow: '0 1px 4px rgba(0,0,0,0.07)', marginBottom: '2rem' }}>
          <div style={{ display: 'flex', gap: '2rem', marginBottom: '1.5rem' }}>
            <div><p style={{ fontSize: '0.8rem', color: '#64748b', marginBottom: 4 }}>COMPLETED</p><p style={{ fontSize: '2rem', fontWeight: 700 }}>{answered}/{total}</p></div>
            {acc !== null && <div><p style={{ fontSize: '0.8rem', color: '#64748b', marginBottom: 4 }}>ACCURACY</p><p style={{ fontSize: '2rem', fontWeight: 700, color: acc >= 70 ? '#10b981' : '#ef4444' }}>{acc}%</p></div>}
            <div><p style={{ fontSize: '0.8rem', color: '#64748b', marginBottom: 4 }}>PROGRESS</p><p style={{ fontSize: '2rem', fontWeight: 700 }}>{pct}%</p></div>
          </div>
          <div style={{ height: 10, background: '#f1f5f9', borderRadius: 5, overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${pct}%`, background: '#2563eb', borderRadius: 5 }} />
          </div>
        </div>

        {/* Actions */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1rem', marginBottom: '2rem' }}>
          <ActionCard
            icon={<PlayCircle size={28} />}
            title={answered === 0 ? 'Start Solving' : answered < total ? 'Resume Solving' : 'Solved!'}
            sub={`${total - answered} questions remaining`}
            color="#2563eb"
            disabled={answered === total}
            onClick={() => navigate(`/solve/${day.dayNumber}/new`)}
          />
          <ActionCard
            icon={<BookOpen size={28} />}
            title="Vocab Practice"
            sub={`${day.vocabQueue?.length || 0} words assigned`}
            color="#7c3aed"
            onClick={() => navigate(`/vocab/${day.dayNumber}`)}
          />
          <ActionCard
            icon={<RotateCcw size={28} />}
            title={`Review Wrong (${incorrect})`}
            sub="Practice your mistakes"
            color="#ef4444"
            disabled={incorrect === 0}
            onClick={() => navigate(`/solve/${day.dayNumber}/wrong`)}
          />
          <ActionCard
            icon={<RotateCcw size={28} />}
            title={`Review Confused (${confused})`}
            sub="Flagged for review"
            color="#f59e0b"
            disabled={confused === 0}
            onClick={() => navigate(`/solve/${day.dayNumber}/confused`)}
          />
        </div>
      </main>
    </div>
  );
}

function ActionCard({ icon, title, sub, color, onClick, disabled }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        background: 'white', borderRadius: 12, padding: '1.5rem',
        boxShadow: '0 1px 4px rgba(0,0,0,0.07)', cursor: disabled ? 'not-allowed' : 'pointer',
        textAlign: 'left', border: `1px solid #e2e8f0`, opacity: disabled ? 0.5 : 1,
        display: 'flex', gap: '1rem', alignItems: 'center', transition: 'box-shadow 0.2s'
      }}
      onMouseEnter={e => !disabled && (e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)')}
      onMouseLeave={e => e.currentTarget.style.boxShadow = '0 1px 4px rgba(0,0,0,0.07)'}
    >
      <div style={{ padding: '0.75rem', borderRadius: '50%', background: color + '18', color }}>{icon}</div>
      <div>
        <p style={{ fontWeight: 700, fontSize: '1rem', color: '#1e293b' }}>{title}</p>
        <p style={{ fontSize: '0.85rem', color: '#64748b', marginTop: 2 }}>{sub}</p>
      </div>
    </button>
  );
}
