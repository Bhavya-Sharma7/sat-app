/**
 * Free Dictionary API utility
 * https://dictionaryapi.dev/
 *
 * Endpoint: https://api.dictionaryapi.dev/api/v2/entries/en/<word>
 */

const BASE_URL = 'https://api.dictionaryapi.dev/api/v2/entries/en';

// Simple in-memory cache to avoid redundant network calls
const cache = new Map();

/**
 * Fetch dictionary data for a word.
 * Returns an array of entry objects on success, or null on failure.
 *
 * @param {string} word
 * @returns {Promise<Array|null>}
 */
export async function fetchWordDefinition(word) {
  if (!word) return null;
  const key = word.trim().toLowerCase();
  if (cache.has(key)) return cache.get(key);

  try {
    const res = await fetch(`${BASE_URL}/${encodeURIComponent(key)}`);
    if (!res.ok) {
      // Word not found or API error
      cache.set(key, null);
      return null;
    }
    const data = await res.json();
    cache.set(key, data);
    return data;
  } catch {
    return null;
  }
}

/**
 * Extract the most useful phonetic audio URL from the entries array.
 * @param {Array} entries
 * @returns {string|null}
 */
export function getPhoneticAudio(entries) {
  for (const entry of entries) {
    for (const ph of entry.phonetics || []) {
      if (ph.audio) return ph.audio.startsWith('//') ? `https:${ph.audio}` : ph.audio;
    }
  }
  return null;
}

/**
 * Extract phonetic text (IPA) from entries.
 * @param {Array} entries
 * @returns {string|null}
 */
export function getPhoneticText(entries) {
  for (const entry of entries) {
    if (entry.phonetic) return entry.phonetic;
    for (const ph of entry.phonetics || []) {
      if (ph.text) return ph.text;
    }
  }
  return null;
}

/**
 * Flatten all meanings from all entries into a single array.
 * Each meaning: { partOfSpeech, definitions: [{definition, example, synonyms, antonyms}], synonyms, antonyms }
 * @param {Array} entries
 * @returns {Array}
 */
export function getMeanings(entries) {
  const meanings = [];
  for (const entry of entries) {
    for (const meaning of entry.meanings || []) {
      meanings.push(meaning);
    }
  }
  return meanings;
}
