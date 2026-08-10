import localforage from 'localforage';

export const db = localforage.createInstance({
  name: "SatBluebookApp",
  storeName: "sat_data"
});

// Helper to initialize the default state if empty
export const getInitialState = async () => {
  const existing = await db.getItem("appState");
  if (existing) return existing;
  
  return {
    hasStarted: false,
    startDate: null,
    generatedDays: [], // { dayNumber, status, questions: [], vocabQueue: [] }
    unusedQuestions: [],
    unusedVocab: [],
    wrongList: [], // { questionId, attempts: [] }
    confusedList: [], // string[] of questionIds
    vocabHistory: {}, // { "word": { seenCount, lastSeen, status } }
    confusedWordsList: [], // { word, definition, questionId, date } — from Notebook in Solver
    vocabConfusedList: [], // { word, partOfSpeech, definition, example, addedDate } — from VocabMode
    extraPracticeAnswers: {}, // { questionId: { selectedAnswer, isCorrect, timeSpent } }
    bankAnswers: {}, // { questionId: { selectedAnswer, isCorrect, timeSpent } }
    questionNotes: {}, // { questionId: "notes..." }
    questionHighlights: {}, // { questionId: Array<{ id, blockKey, text, startOffset, endOffset, color }> }
    globalStats: {
      totalTimeSpent: 0,
      totalCorrect: 0,
      totalAnswered: 0
    }
  };
};

export const saveState = async (state) => {
  await db.setItem("appState", state);
};

// Export to JSON string
export const exportState = async () => {
  const state = await db.getItem("appState");
  return JSON.stringify(state, null, 2);
};

// Import from JSON string
export const importState = async (jsonString) => {
  try {
    const state = JSON.parse(jsonString);
    await db.setItem("appState", state);
    return true;
  } catch(e) {
    console.error("Failed to import state", e);
    return false;
  }
};
