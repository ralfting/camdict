const MAX_SUGGESTIONS = 3;
const MIN_FREQUENCY_PER_MILLION = 1;
const TIMEOUT_MS = 3000;

async function getSuggestions(value, userAgent) {
  try {
    const response = await fetch(
      `https://api.datamuse.com/words?sp=${encodeURIComponent(value)}&md=df&max=10`,
      {
        headers: { "User-Agent": userAgent },
        signal: AbortSignal.timeout(TIMEOUT_MS),
      }
    );
    const rows = await response.json();
    const input = value.toLowerCase();

    return [...new Set([...getCorrections(rows), ...getCommonWords(rows)])]
      .filter((word) => word.toLowerCase() !== input)
      .slice(0, MAX_SUGGESTIONS);
  } catch {
    return [];
  }
}

// Datamuse may not list the right word among close spellings (recieve ->
// receive), but it marks the typo itself as "Misspelling of receive."
function getCorrections(rows) {
  return rows.flatMap(({ defs = [] }) =>
    defs
      .map((def) => /(?:Misspelling|spelling) of ([^.\[]+?)\./.exec(def))
      .filter(Boolean)
      .map((match) => match[1])
  );
}

function getCommonWords(rows) {
  return rows
    .filter((row) => getFrequency(row) >= MIN_FREQUENCY_PER_MILLION)
    .sort((a, b) => getFrequency(b) - getFrequency(a))
    .map(({ word }) => word);
}

function getFrequency({ tags = [] }) {
  return Number((tags.find((tag) => tag.startsWith("f:")) || "f:0").slice(2));
}

module.exports = { getSuggestions };
