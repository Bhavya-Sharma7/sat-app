import React, { createContext, useContext, useState, useEffect } from 'react';
import { getInitialState, saveState, exportState, importState } from './db';
import { generateDays } from '../utils/dayGenerator';

const AppContext = createContext(null);

export const AppProvider = ({ children }) => {
  const [state, setState] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [allQuestions, setAllQuestions] = useState([]);
  const [allVocab, setAllVocab] = useState([]);

  useEffect(() => {
    async function load() {
      try {
        const [appState, qRes, vRes] = await Promise.all([
          getInitialState(),
          fetch(`${import.meta.env.BASE_URL}questions.json`).then(r => r.json()),
          fetch(`${import.meta.env.BASE_URL}vocab.json`).then(r => r.json())
        ]);
        setAllQuestions(qRes);
        setAllVocab(vRes);
        setState(appState);
      } catch (err) {
        console.error("Failed to load initial data", err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const updateState = (updater) => {
    setState(prev => {
      const nextState = typeof updater === 'function' ? updater(prev) : { ...prev, ...updater };
      saveState(nextState).catch(e => console.error("Save failed", e));
      return nextState;
    });
  };

  const startPlan = (startDate) => {
    const { generatedDays, unusedQuestions, unusedVocab } = generateDays(allQuestions, allVocab, 11);
    updateState({ hasStarted: true, startDate, generatedDays, unusedQuestions, unusedVocab });
  };

  /**
   * Called when user confirms/checks their answer.
   * dayNumber can be null for extra-practice mode.
   */
  const markQuestionAnswered = (dayNumber, questionId, selectedAnswer, timeSpent) => {
    updateState(prev => {
      // Find the full question data
      const fullQ = allQuestions.find(q => q.id === questionId);
      if (!fullQ) return prev;
      const isCorrect = selectedAnswer === fullQ.correct_answer;

      let nextState = { ...prev };

      if (dayNumber === 'bank') {
        const bp = { ...(prev.bankAnswers || {}) };
        bp[questionId] = { selectedAnswer, isCorrect, timeSpent };
        nextState.bankAnswers = bp;
      } else if (dayNumber !== null && dayNumber !== undefined && dayNumber !== 'extra') {
        const dayIndex = prev.generatedDays.findIndex(d => d.dayNumber === dayNumber);
        if (dayIndex !== -1) {
          const day = prev.generatedDays[dayIndex];
          const qIndex = day.questions.findIndex(q => q.id === questionId);
          if (qIndex !== -1) {
            const updatedDays = [...prev.generatedDays];
            updatedDays[dayIndex] = {
              ...day,
              questions: day.questions.map((q, i) => i === qIndex
                ? { ...q, status: isCorrect ? 'correct' : 'incorrect', selectedAnswer, timeSpent }
                : q
              )
            };
            nextState.generatedDays = updatedDays;
          }
        }
      } else {
        // Extra practice – store in a separate map
        const ep = { ...(prev.extraPracticeAnswers || {}) };
        ep[questionId] = { selectedAnswer, isCorrect, timeSpent };
        nextState.extraPracticeAnswers = ep;
      }

      // Update wrong list (persistent)
      if (!isCorrect) {
        const attempt = {
          date: new Date().toISOString(),
          selectedAnswer,
          correctAnswer: fullQ.correct_answer,
          timeSpent
        };
        const existing = prev.wrongList.findIndex(w => w.questionId === questionId);
        if (existing === -1) {
          nextState.wrongList = [...prev.wrongList, { questionId, attempts: [attempt] }];
        } else {
          const wl = [...prev.wrongList];
          wl[existing] = { ...wl[existing], attempts: [...wl[existing].attempts, attempt] };
          nextState.wrongList = wl;
        }
      }

      return nextState;
    });
  };

  const toggleConfused = (dayNumber, questionId) => {
    updateState(prev => {
      const nextState = { ...prev };

      if (dayNumber !== null && dayNumber !== undefined) {
        const dayIndex = prev.generatedDays.findIndex(d => d.dayNumber === dayNumber);
        if (dayIndex !== -1) {
          const day = prev.generatedDays[dayIndex];
          const updatedDays = [...prev.generatedDays];
          updatedDays[dayIndex] = {
            ...day,
            questions: day.questions.map(q =>
              q.id === questionId ? { ...q, confused: !q.confused } : q
            )
          };
          nextState.generatedDays = updatedDays;
        }
      }

      const cIndex = prev.confusedList.indexOf(questionId);
      nextState.confusedList = cIndex === -1
        ? [...prev.confusedList, questionId]
        : prev.confusedList.filter(id => id !== questionId);

      return nextState;
    });
  };

  const updateQuestionNote = (questionId, noteText) => {
    updateState(prev => ({
      ...prev,
      questionNotes: { ...(prev.questionNotes || {}), [questionId]: noteText }
    }));
  };

  const addHighlight = (questionId, highlight) => {
    updateState(prev => {
      const qHighlights = prev.questionHighlights || {};
      const existing = qHighlights[questionId] || [];
      return {
        ...prev,
        questionHighlights: {
          ...qHighlights,
          [questionId]: [...existing, highlight]
        }
      };
    });
  };

  const removeHighlight = (questionId, highlightId) => {
    updateState(prev => {
      const qHighlights = prev.questionHighlights || {};
      const existing = qHighlights[questionId] || [];
      return {
        ...prev,
        questionHighlights: {
          ...qHighlights,
          [questionId]: existing.filter(h => h.id !== highlightId)
        }
      };
    });
  };

  const updateHighlight = (questionId, highlightId, updates) => {
    updateState(prev => {
      const qHighlights = prev.questionHighlights || {};
      const existing = qHighlights[questionId] || [];
      return {
        ...prev,
        questionHighlights: {
          ...qHighlights,
          [questionId]: existing.map(h => h.id === highlightId ? { ...h, ...updates } : h)
        }
      };
    });
  };

  const addTextToDiary = (questionId, text) => {
    if (!text || !text.trim()) return;
    const cleanText = text.trim();
    updateState(prev => {
      const notes = prev.questionNotes || {};
      const currentNote = notes[questionId] || '';
      const newNote = currentNote ? `${currentNote}\n• ${cleanText}` : `• ${cleanText}`;

      return {
        ...prev,
        questionNotes: {
          ...notes,
          [questionId]: newNote
        }
      };
    });
  };

  const removeFromNotebook = (word) => {
    updateState(prev => ({
      ...prev,
      confusedWordsList: (prev.confusedWordsList || []).filter(w => (typeof w === 'string' ? w : w.word) !== word)
    }));
  };

  const handleExport = async () => exportState();
  const handleImport = async (jsonString) => {
    const success = await importState(jsonString);
    if (success) window.location.reload();
    return success;
  };

  const value = {
    state, allQuestions, allVocab,
    updateState, startPlan,
    markQuestionAnswered, toggleConfused, updateQuestionNote,
    addHighlight, removeHighlight, updateHighlight, addTextToDiary, addTextToNotebook: addTextToDiary,
    removeFromNotebook,
    handleExport, handleImport
  };

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', flexDirection: 'column', gap: '1rem', fontFamily: 'system-ui' }}>
      <div style={{ fontSize: '1.5rem', fontWeight: 600 }}>Loading SAT Driller…</div>
      <div style={{ color: '#64748b' }}>Fetching 1400+ questions…</div>
    </div>
  );
  if (error) return <div style={{ padding: 40, color: 'red' }}>Error: {error}</div>;

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};

export const useApp = () => useContext(AppContext);
