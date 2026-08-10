/**
 * Shuffles an array in place.
 */
function shuffle(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

/**
 * Group questions by Skill, then by Difficulty
 */
function groupQuestions(questions) {
  const grouped = {};
  for (const q of questions) {
    if (!grouped[q.skill]) {
      grouped[q.skill] = { Easy: [], Medium: [], Hard: [], Unspecified: [] };
    }
    const diff = q.difficulty || 'Unspecified';
    if (grouped[q.skill][diff]) {
      grouped[q.skill][diff].push(q);
    } else {
      grouped[q.skill]['Unspecified'].push(q);
    }
  }
  
  // Shuffle all arrays so we pull randomly
  for (const skill in grouped) {
    for (const diff in grouped[skill]) {
      shuffle(grouped[skill][diff]);
    }
  }
  return grouped;
}

/**
 * Helper to pull exactly `targetCount` questions matching proportions: 30% Easy, 40% Medium, 30% Hard
 * Fallback to other difficulties if one runs out.
 */
function pullQuestions(pool, skill, targetCount) {
  const selected = [];
  if (!pool[skill]) return selected;
  
  const targetEasy = Math.round(targetCount * 0.30);
  const targetMedium = Math.round(targetCount * 0.40);
  const targetHard = Math.round(targetCount * 0.30);
  
  const skillPool = pool[skill];
  
  // Try to pull exact targets
  const pullExact = (diff, count) => {
    const pulled = skillPool[diff].splice(0, count);
    selected.push(...pulled);
    return pulled.length;
  };

  let easyPulled = pullExact('Easy', targetEasy);
  let mediumPulled = pullExact('Medium', targetMedium);
  let hardPulled = pullExact('Hard', targetHard);
  
  let totalPulled = easyPulled + mediumPulled + hardPulled;
  
  // Fill any remaining deficits due to rounding or exhaustion by pulling from whatever is left
  let deficit = targetCount - totalPulled;
  
  const fallbackOrder = ['Medium', 'Easy', 'Hard', 'Unspecified'];
  for (const diff of fallbackOrder) {
    if (deficit <= 0) break;
    const additional = pullExact(diff, deficit);
    deficit -= additional;
  }
  
  return selected;
}

export function generateDays(questions, vocabWords, numDays = 11) {
  // Filter out table/graph questions that have no image (garbled text only).
  // Questions with an image_path have their chart extracted from the PDF and are fine to include.
  const cleanQuestions = questions.filter(q => {
    if (q.image_path) return true; // has an extracted image — keep it
    const text = (q.question || "").toLowerCase();
    return !(
      text.includes("data from the table") ||
      text.includes("data from the graph") ||
      text.includes("data in the table") ||
      text.includes("data in the graph")
    );
  });

  const pool = groupQuestions(cleanQuestions);
  
  const infoIdeasSkills = ["Central Ideas and Details", "Command of Evidence", "Inferences"];
  const secondarySkills = [
    "Words in Context", 
    "Text Structure and Purpose", 
    "Rhetorical Synthesis", 
    "Boundaries", 
    "Transitions", 
    "Form, Structure, and Sense", 
    "Cross-Text Connections"
  ];
  
  const days = [];
  
  const vocabPool = [...vocabWords];
  shuffle(vocabPool);
  
  let infoSkillIndex = 0;
  let secSkillIndex = 0;
  
  for (let i = 1; i <= numDays; i++) {
    // Info & Ideas Block: ~45 questions
    const primarySkill = infoIdeasSkills[infoSkillIndex % infoIdeasSkills.length];
    infoSkillIndex++;
    
    // Secondary Block: ~25 questions
    const secondarySkill = secondarySkills[secSkillIndex % secondarySkills.length];
    secSkillIndex++;
    
    const dayQuestions = [];
    
    const primaryPulled = pullQuestions(pool, primarySkill, 45);
    const secondaryPulled = pullQuestions(pool, secondarySkill, 25);
    
    dayQuestions.push(...primaryPulled);
    dayQuestions.push(...secondaryPulled);
    
    // Convert pulled questions to Day state format
    const formattedQuestions = dayQuestions.map(q => ({
      id: q.id,
      status: "unanswered", // unanswered, correct, incorrect
      selectedAnswer: null,
      timeSpent: 0,
      confused: false, // live toggle
      domain: q.domain,
      skill: q.skill,
      difficulty: q.difficulty
    }));
    
    // Vocab Block: ~25 words per day
    const dayVocab = vocabPool.splice(0, 25);
    const formattedVocab = dayVocab.map(v => ({
      word: v.word,
      definition: v.definition,
      example: v.example,
      partOfSpeech: v.partOfSpeech
    }));
    
    days.push({
      dayNumber: i,
      status: "Not Started",
      questions: formattedQuestions,
      vocabQueue: formattedVocab
    });
  }
  
  // Flatten remaining pool to track unused questions
  const unusedQuestions = [];
  for (const skill in pool) {
    for (const diff in pool[skill]) {
      unusedQuestions.push(...pool[skill][diff]);
    }
  }
  
  return {
    generatedDays: days,
    unusedQuestions: unusedQuestions,
    unusedVocab: vocabPool
  };
}
