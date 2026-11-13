const REQUEST_TIMEOUT_MS = 10000;

async function getWordEntries(value) {
  const url = `https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(value)}`;
  const signal = AbortSignal.timeout(REQUEST_TIMEOUT_MS);
  let response;

  try {
    response = await fetch(url, { signal });
  } catch (error) {
    // fetch only says "fetch failed"; translate it into something actionable.
    throw new Error(
      error.name === "TimeoutError"
        ? "The dictionary service took too long to respond. Try again in a moment."
        : "Could not reach the dictionary service. Check your connection and try again."
    );
  }

  if (response.status === 404) {
    return null;
  }

  if (!response.ok) {
    throw new Error(
      `The dictionary service is unavailable right now (HTTP ${response.status}). Try again later.`
    );
  }

  const entries = await response.json();
  const hasMeanings = entries.some(
    (entry) => entry.meanings && entry.meanings.length
  );

  return hasMeanings ? entries : null;
}

// The API can split one word into several entries and repeat a part of
// speech across them, so definitions are merged per part of speech.
function groupMeanings(entries) {
  const byPartOfSpeech = new Map();

  entries.forEach((entry) => {
    (entry.meanings || []).forEach(({ partOfSpeech, definitions }) => {
      const merged = byPartOfSpeech.get(partOfSpeech) || [];
      byPartOfSpeech.set(partOfSpeech, merged.concat(definitions));
    });
  });

  return [...byPartOfSpeech].map(([partOfSpeech, definitions]) => ({
    partOfSpeech,
    definitions,
  }));
}

// Prefer a transcription that has a recording, since it is usually the
// most complete one (the API lists bare UK/US variants without audio first).
function getPhonetic(entries) {
  const phonetics = entries.flatMap((entry) => entry.phonetics || []);
  const withAudio = phonetics.find(({ text, audio }) => text && audio);
  const anyText = phonetics.find(({ text }) => text);
  const entryPhonetic = entries.find((entry) => entry.phonetic);

  return (
    (withAudio && withAudio.text) ||
    (entryPhonetic && entryPhonetic.phonetic) ||
    (anyText && anyText.text) ||
    null
  );
}

module.exports = { getWordEntries, groupMeanings, getPhonetic };
