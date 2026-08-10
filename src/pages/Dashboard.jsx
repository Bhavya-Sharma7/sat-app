import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../store/AppContext';
import { BookOpen, PlayCircle, BarChart2, BookMarked } from 'lucide-react';

export default function Dashboard() {
  const { state, startPlan, handleExport, handleImport } = useApp();
  const navigate = useNavigate();

  if (!state.hasStarted) {
    return (
      <div style={{ maxWidth: 700, margin: '0 auto', padding: '6rem 2rem', textAlign: 'center' }}>
        <h1 style={{ fontSize: '2.75rem', marginBottom: '1rem', color: '#1e293b' }}>SAT Daily Drilling</h1>
        <p style={{ fontSize: '1.2rem', color: '#475569', marginBottom: '3rem', lineHeight: 1.7 }}>
          An 11-day intensive SAT reading & writing programme with a Bluebook-style interface.
        </p>
        <button
          style={{ fontSize: '1.2rem', padding: '1rem 3rem', background: '#2563eb', color: 'white', border: 'none', borderRadius: 50, fontWeight: 600, cursor: 'pointer' }}
          onClick={() => startPlan(new Date().toISOString())}
        >
          Start 11-Day Plan →
        </button>
      </div>
    );
  }

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (file) { const text = await file.text(); await handleImport(text); }
  };

  const downloadBackup = async () => {
    const json = await handleExport();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `sat-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
  };

  const wrongCount = state.wrongList?.length || 0;
  const notebookCount = state.confusedWordsList?.length || 0;

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#f8fafc' }}>

      {/* ── LEFT SIDEBAR ── */}
      <aside style={{ width: 280, background: '#1e293b', color: 'white', padding: '2rem 1.5rem', flexShrink: 0, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        <h2 style={{ fontSize: '1.4rem', fontWeight: 700, marginBottom: '1.5rem', borderBottom: '1px solid rgba(255,255,255,0.15)', paddingBottom: '1rem' }}>SAT Driller</h2>

        <p style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: '#94a3b8', letterSpacing: 1, marginBottom: '0.25rem' }}>Practice</p>
        <SideBtn icon={<PlayCircle size={18} />} label="Random Questions" sub="From unused pool" onClick={() => navigate('/solve/extra/all')} />
        <SideBtn icon={<BookOpen size={18} />} label="Extra Vocab" sub="Outside daily quota" onClick={() => navigate('/vocab/extra')} />

        <p style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: '#94a3b8', letterSpacing: 1, marginTop: '1.5rem', marginBottom: '0.25rem' }}>Review & Stats</p>
        <SideBtn icon={<BarChart2 size={18} />} label="Statistics" sub={`${wrongCount} in wrong list`} onClick={() => navigate('/stats')} />
        <SideBtn icon={<BookMarked size={18} />} label="Notebook" sub={`${notebookCount} saved words`} onClick={() => navigate('/stats?tab=notebook')} />

        <p style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: '#94a3b8', letterSpacing: 1, marginTop: '1.5rem', marginBottom: '0.25rem' }}>Explore</p>
        <SideBtn icon={<BookOpen size={18} />} label="Grand Bank" sub="Browse all questions" onClick={() => navigate('/bank')} />

        {/* Spacer */}
        <div style={{ flex: 1 }} />

        {/* Backup */}
        <div style={{ borderTop: '1px solid rgba(255,255,255,0.15)', paddingTop: '1rem', display: 'flex', flexDirection: 'column', gap: 8 }}>
          <button onClick={downloadBackup} style={{ background: 'rgba(255,255,255,0.1)', color: 'white', border: '1px solid rgba(255,255,255,0.2)', borderRadius: 8, padding: '8px 12px', cursor: 'pointer', textAlign: 'left', fontSize: '0.875rem', fontWeight: 500 }}>
            📦 Export Backup
          </button>
          <label style={{ background: 'rgba(255,255,255,0.1)', color: 'white', border: '1px solid rgba(255,255,255,0.2)', borderRadius: 8, padding: '8px 12px', cursor: 'pointer', fontSize: '0.875rem', fontWeight: 500 }}>
            📂 Import Backup
            <input type="file" accept=".json" style={{ display: 'none' }} onChange={handleFileUpload} />
          </label>
        </div>
      </aside>

      {/* ── MAIN CONTENT ── */}
      <main style={{ flex: 1, padding: '2rem 3rem', overflowY: 'auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2rem' }}>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 700 }}>Your 11-Day Plan</h1>
          <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
            <span style={{ fontSize: '0.9rem', color: '#64748b' }}>
              {state.generatedDays.filter(d => d.status === 'Completed').length} / 11 days done
            </span>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '1.25rem' }}>
          {state.generatedDays.map(day => {
            const total = day.questions.length;
            const answered = day.questions.filter(q => q.status !== 'unanswered').length;
            const correct = day.questions.filter(q => q.status === 'correct').length;
            const pct = total > 0 ? Math.round((answered / total) * 100) : 0;
            const acc = answered > 0 ? Math.round((correct / answered) * 100) : null;

            const borderTop = day.status === 'Completed' ? '#10b981' : day.status === 'In Progress' ? '#2563eb' : '#e2e8f0';

            return (
              <div
                key={day.dayNumber}
                onClick={() => navigate(`/day/${day.dayNumber}`)}
                style={{
                  background: 'white', borderRadius: 12, padding: '1.25rem',
                  boxShadow: '0 1px 4px rgba(0,0,0,0.07)', cursor: 'pointer',
                  borderTop: `4px solid ${borderTop}`, transition: 'box-shadow 0.2s'
                }}
                onMouseEnter={e => e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.12)'}
                onMouseLeave={e => e.currentTarget.style.boxShadow = '0 1px 4px rgba(0,0,0,0.07)'}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                  <span style={{ fontWeight: 700, fontSize: '1.1rem' }}>Day {day.dayNumber}</span>
                  <StatusBadge status={day.status} />
                </div>

                <div style={{ height: 8, background: '#f1f5f9', borderRadius: 4, overflow: 'hidden', marginBottom: '0.75rem' }}>
                  <div style={{ height: '100%', width: `${pct}%`, background: '#2563eb', borderRadius: 4, transition: 'width 0.3s' }} />
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: '#64748b' }}>
                  <span>{answered} / {total} questions</span>
                  {acc !== null && <span>Acc: {acc}%</span>}
                </div>
              </div>
            );
          })}
        </div>
      </main>
    </div>
  );
}

function SideBtn({ icon, label, sub, onClick }) {
  return (
    <button
      onClick={onClick}
      style={{
        display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px',
        background: 'rgba(255,255,255,0.07)', color: 'white', border: 'none',
        borderRadius: 8, cursor: 'pointer', textAlign: 'left', width: '100%',
        transition: 'background 0.15s'
      }}
      onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.15)'}
      onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.07)'}
    >
      <span style={{ opacity: 0.8 }}>{icon}</span>
      <div>
        <div style={{ fontWeight: 500, fontSize: '0.9rem' }}>{label}</div>
        {sub && <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: 1 }}>{sub}</div>}
      </div>
    </button>
  );
}

function StatusBadge({ status }) {
  const color = status === 'Completed' ? '#10b981' : status === 'In Progress' ? '#2563eb' : '#94a3b8';
  const bg = status === 'Completed' ? '#f0fdf4' : status === 'In Progress' ? '#eff6ff' : '#f8fafc';
  return (
    <span style={{ fontSize: '0.75rem', fontWeight: 600, padding: '3px 10px', borderRadius: 20, color, background: bg }}>
      {status}
    </span>
  );
}
