// Minimal API bodies for cases the recorded fixtures don't show. Each test
// overrides only the fields its behavior depends on.
function dictionaryEntries({ word, phonetic, phonetics = [], meanings } = {}) {
  return [
    {
      word,
      ...(phonetic && { phonetic }),
      phonetics,
      meanings: meanings || [
        { partOfSpeech: "noun", definitions: [{ definition: `A definition of ${word}.` }] },
      ],
    },
  ];
}

function commonsPage(pageId, videoinfo) {
  return { query: { pages: { [pageId]: { pageid: Number(pageId), videoinfo: [videoinfo] } } } };
}

module.exports = { dictionaryEntries, commonsPage };
