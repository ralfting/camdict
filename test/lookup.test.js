const test = require("node:test");
const assert = require("node:assert/strict");
const { runCli } = require("./support/run-cli");

const firstLine = (text) => text.split("\n")[0];

test("prints numbered definitions with each example quoted under its definition", () => {
  const { stdout, code } = runCli(["pizza"]);

  assert.equal(code, 0);
  assert.equal(
    stdout,
    [
      " pizza  /ˈpiːt.sə/",
      "",
      "noun",
      "  1. A baked Italian dish of a thinly rolled bread dough crust typically topped before baking with tomato sauce, cheese and other ingredients such as meat, vegetables or fruit",
      '     "Want to go out for pizza tonight?"',
      "  2. A single instance of this dish",
      '     "He ate a whole pizza!"',
      "",
    ].join("\n")
  );
});

test("shows the transcription that has a recording over the entry's bare one", () => {
  assert.equal(firstLine(runCli(["library"]).stdout), " library  /ˈlaɪbɹəɹi/");
  assert.equal(firstLine(runCli(["wonderful"]).stdout), " wonderful  /ˈwʌn.dɚ.fl̩/");
});

test("without a recording, prefers the entry's own transcription over the first listed", () => {
  assert.equal(firstLine(runCli(["tomato"]).stdout), " tomato  /təˈmɑːtəʊ/");
});

test("prints only the headword when the dictionary has no transcription", () => {
  assert.equal(firstLine(runCli(["give up"]).stdout), " give up ");
});

test("shows the dictionary's headword instead of the word as typed", () => {
  const { stdout, requests } = runCli(["RUNNING"]);

  assert.equal(requests[0].url, "https://api.dictionaryapi.dev/api/v2/entries/en/RUNNING");
  assert.equal(firstLine(stdout), " run  /ɹʌn/");
});

test("merges a part of speech that the dictionary splits across entries", () => {
  const { stdout } = runCli(["house", "--all"]);
  const lines = stdout.split("\n");

  assert.equal(lines.filter((line) => line === "noun").length, 1);
  assert.ok(lines.includes("   1. A structure built or serving as an abode of human beings."));
  assert.ok(lines.includes("  19. House music."));
});

test("lists parts of speech in the order the dictionary first gives them", () => {
  const sections = runCli(["run"]).stdout.split("\n").filter((line) => /^[a-z]+$/.test(line));

  assert.deepEqual(sections, ["verb", "noun", "adjective"]);
});

test("looks up a phrase with its space URL-encoded", () => {
  const { stdout, requests, code } = runCli(["give up"]);

  assert.equal(code, 0);
  assert.equal(requests[0].url, "https://api.dictionaryapi.dev/api/v2/entries/en/give%20up");
  assert.match(stdout, /^ {2}1\. To surrender \(someone or something\)$/m);
});

for (const command of ["d", "dictionary"]) {
  test(`looks up a word through the "${command}" command`, () => {
    const { stdout, code } = runCli([command, "pizza"]);

    assert.equal(code, 0);
    assert.equal(firstLine(stdout), " pizza  /ˈpiːt.sə/");
    assert.match(stdout, /^ {2}2\. A single instance of this dish$/m);
  });
}

test("sends the dictionary request with a timeout signal", () => {
  const { requests } = runCli(["pizza"]);

  assert.equal(requests.length, 1);
  assert.equal(requests[0].hasSignal, true);
});
