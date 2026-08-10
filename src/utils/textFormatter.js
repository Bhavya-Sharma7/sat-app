/**
 * Utility functions to clean PDF-extracted SAT question texts and explanations.
 */

// Common glued words from PDF line-wrap extractions
const GLUED_WORD_FIXES = [
  [/\bforthe\b/gi, 'for the'],
  [/\bafterthe\b/gi, 'after the'],
  [/\bbeforethe\b/gi, 'before the'],
  [/\bratherthan\b/gi, 'rather than'],
  [/\bhigherthan\b/gi, 'higher than'],
  [/\blongerthan\b/gi, 'longer than'],
  [/\bearlierthan\b/gi, 'earlier than'],
  [/\botherthan\b/gi, 'other than'],
  [/\bsimilarto\b/gi, 'similar to'],
  [/\borthe\b/gi, 'or the'],
  [/\bforthis\b/gi, 'for this'],
  [/\binthis\b/gi, 'in this'],
  [/\btoit\b/gi, 'to it'],
  [/\bfromthe\b/gi, 'from the'],
  [/\bonthe\b/gi, 'on the'],
  [/\batthe\b/gi, 'at the'],
  [/\bbythe\b/gi, 'by the'],
  [/\bofthis\b/gi, 'of this'],
  [/\bofits\b/gi, 'of its'],
  [/\btoits\b/gi, 'to its'],
  [/\bforits\b/gi, 'for its'],
  [/\bfactorthat\b/gi, 'factor that'],
  [/\binferthat\b/gi, 'infer that'],
  [/\beasierto\b/gi, 'easier to'],
  [/\bsuperiorto\b/gi, 'superior to'],
  [/\binferiorto\b/gi, 'inferior to'],
  [/\blesserthan\b/gi, 'lesser than'],
  [/\bgreaterthan\b/gi, 'greater than'],
  [/\bspeakerthinks\b/gi, 'speaker thinks'],
  [/\bElinorthinks\b/gi, 'Elinor thinks'],
  [/\bTreverthinks\b/gi, 'Trever thinks'],
  [/\bTrevorthinks\b/gi, 'Trevor thinks'],
  [/\bnarratorthinks\b/gi, 'narrator thinks'],
  [/\bauthorthinks\b/gi, 'author thinks'],
  [/\bwriterthinks\b/gi, 'writer thinks'],
  [/\bstudentthinks\b/gi, 'student thinks'],
  [/\bElinorthat\b/gi, 'Elinor that'],
  [/\bNeithertext\b/gi, 'Neither text'],
  [/\bNeitherthe\b/gi, 'Neither the'],
  [/\bForthe\b/gi, 'For the'],
  [/\bForthis\b/gi, 'For this'],
  [/\bRatherthan\b/gi, 'Rather than'],
  [/\bRatherthe\b/gi, 'Rather the'],
  [/\bafterthat\b/gi, 'after that'],
  [/\bafterthis\b/gi, 'after this'],
  [/\bairto\b/gi, 'air to'],
  [/\bairtravel\b/gi, 'air travel'],
  [/\banswerthat\b/gi, 'answer that'],
  [/\banswerto\b/gi, 'answer to'],
  [/\bauthorthan\b/gi, 'author than'],
  [/\bbya\b/gi, 'by a'],
  [/\beasierthan\b/gi, 'easier than'],
  [/\beithertext\b/gi, 'either text'],
  [/\beitherthe\b/gi, 'either the'],
  [/\beithertype\b/gi, 'either type'],
  [/\bfactorthan\b/gi, 'factor than'],
  [/\bfactorto\b/gi, 'factor to'],
  [/\bforthat\b/gi, 'for that'],
  [/\bgreaterthe\b/gi, 'greater the'],
  [/\bhigherthe\b/gi, 'higher the'],
  [/\blatertext\b/gi, 'later text'],
  [/\blaterthan\b/gi, 'later than'],
  [/\blaterto\b/gi, 'later to'],
  [/\blongerthe\b/gi, 'longer the'],
  [/\blongerto\b/gi, 'longer to'],
  [/\bnarratorto\b/gi, 'narrator to'],
  [/\bneithertext\b/gi, 'neither text'],
  [/\bneitherthe\b/gi, 'neither the'],
  [/\bofit\b/gi, 'of it'],
  [/\boflife\b/gi, 'of life'],
  [/\borthat\b/gi, 'or that'],
  [/\borthis\b/gi, 'or this'],
  [/\bortime\b/gi, 'or time'],
  [/\borto\b/gi, 'or to'],
  [/\botherthat\b/gi, 'other that'],
  [/\bothertime\b/gi, 'other time'],
  [/\bothertravel\b/gi, 'other travel'],
  [/\bothertype\b/gi, 'other type'],
  [/\bratherthat\b/gi, 'rather that'],
  [/\bratherthe\b/gi, 'rather the'],
  [/\bratherto\b/gi, 'rather to'],
  [/\bspeakerto\b/gi, 'speaker to'],
  [/\bwaterthan\b/gi, 'water than'],
  [/\bwaterthat\b/gi, 'water that'],
  [/\bwaterto\b/gi, 'water to'],
  [/\bwriterto\b/gi, 'writer to'],
  [/\bForthen\b/gi, 'For then'],
  [/\brememberthat\b/gi, 'remember that'],
  [/\bifit\b/gi, 'if it'],
  [/\bwaterthe\b/gi, 'water the']
];

/**
 * Cleans an explanation (rationale) string so lines flow continuously in standard English.
 * - Replaces artificial PDF soft newlines with single spaces.
 * - Fixes concatenated PDF words.
 * - Splits choice rationale paragraphs (Choice A is..., Choice B is...) cleanly.
 */
export function cleanExplanation(raw) {
  if (!raw) return '';

  let text = raw;

  // Replace non-breaking spaces with standard space
  text = text.replace(/\xa0/g, ' ');

  // Replace single newlines inside sentences with spaces (keep double newlines)
  text = text.replace(/(?<!\n)\n(?!\n)/g, ' ');
  text = text.replace(/ +/g, ' ');

  // Fix glued PDF words
  for (const [pattern, repl] of GLUED_WORD_FIXES) {
    text = text.replace(pattern, repl);
  }

  // Ensure double newlines before Choice A/B/C/D choices if they run together
  text = text.replace(/([.!?])\s*(Choice\s+[A-D]\s+is)/g, '$1\n\n$2');

  // Split into clean, trimmed non-empty paragraphs
  const paragraphs = text
    .split(/\n\s*\n/)
    .map(p => p.trim())
    .filter(Boolean);

  return paragraphs.join('\n\n');
}

/**
 * Splits a question's raw text into passage (left pane) and stem (right pane).
 * Cleans artificial soft line breaks inside passage paragraphs while preserving poetry verse lines.
 */
export function splitQuestionText(raw) {
  if (!raw) return { passage: '', stem: '' };
  
  // Split on real newlines
  const lines = raw.split('\n').map(l => l.trim()).filter(Boolean);
  if (lines.length === 0) return { passage: '', stem: '' };
  if (lines.length === 1) return { passage: '', stem: lines[0] };

  const stem = lines[lines.length - 1];
  const passageLines = lines.slice(0, -1);

  // Check if passage is poetry or has poetry lines
  let isPoemContext = false;
  let introEndIdx = -1;

  for (let i = 0; i < passageLines.length; i++) {
    const l = passageLines[i];
    if (/poem|lines from|stanza|verse|sonnet|ballad|canto/i.test(l)) {
      isPoemContext = true;
      if (/[.!?"’'\”]$/.test(l)) {
        introEndIdx = i;
      }
    }
  }

  // Count lines that look like verse (short lines starting with capital letter or bracket)
  const verseLinesCount = passageLines.filter(l => l.length < 95 && /^[A-Z"“\[]/.test(l)).length;
  if (verseLinesCount >= 3 && passageLines.length >= 4) {
    isPoemContext = true;
  }

  let passage = '';

  if (!isPoemContext) {
    // Standard prose reconstruction
    for (let i = 0; i < passageLines.length; i++) {
      const line = passageLines[i];
      if (i === 0) { passage = line; continue; }
      const prev = passageLines[i - 1];
      const prevEndsPara = /[.!?"']$/.test(prev);
      const currStartsUpper = /^[A-Z"“]/.test(line);
      
      if (prevEndsPara && currStartsUpper) {
        passage += '\n\n' + line;
      } else {
        passage += ' ' + line;
      }
    }
  } else {
    // Poetry passage reconstruction: preserve line breaks for verse lines
    let inVerse = false;
    for (let i = 0; i < passageLines.length; i++) {
      const line = passageLines[i];
      if (i === 0) {
        passage = line;
        if (introEndIdx === 0 || (isPoemContext && /[.!?"’'\”]$/.test(line))) {
          inVerse = true;
        }
        continue;
      }

      if (!inVerse) {
        if (i <= introEndIdx || !/[.!?"’'\”]$/.test(passageLines[i - 1])) {
          passage += ' ' + line;
        } else {
          passage += '\n\n' + line;
          inVerse = true;
        }
      } else {
        if (/^[”"’]$/.test(line)) {
          passage += line;
        } else {
          passage += '\n' + line;
        }
      }
    }
  }

  // Clean glued words in passage
  let cleanPassage = passage.trim();
  for (const [pattern, repl] of GLUED_WORD_FIXES) {
    cleanPassage = cleanPassage.replace(pattern, repl);
  }

  return { passage: cleanPassage, stem };
}

/**
 * Extracts question stem for image-based questions
 */
export function extractImageStem(raw) {
  if (!raw) return '';
  const lines = raw.split('\n').map(l => l.trim()).filter(Boolean);
  for (let i = lines.length - 1; i >= 0; i--) {
    const l = lines[i];
    if (/^(Which|What|According|Based|How|Why|The student|As used|For the).+\?$/i.test(l)) return l;
  }
  return lines[lines.length - 1] || '';
}

