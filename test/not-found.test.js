const test = require("node:test");
const assert = require("node:assert/strict");
const { runCli } = require("./support/run-cli");

test("a misspelled word exits 1 and suggests close spellings with a command to try", () => {
  const { stdout, stderr, code } = runCli(["pizzza"]);

  assert.equal(code, 1);
  assert.equal(stdout, "");
  assert.match(stderr, /^Error: No definitions found for "pizzza"\.$/m);
  assert.match(stderr, /^Did you mean: pizza · piazza$/m);
  assert.match(stderr, /^Try: camdict pizza$/m);
});

test("suggests the word a common misspelling stands for first", () => {
  const { stderr } = runCli(["recieve"]);

  assert.match(stderr, /^Did you mean: receive · /m);
  assert.match(stderr, /^Try: camdict receive$/m);
});

test("prints only the error when there is nothing to suggest", () => {
  const { stderr, code } = runCli(["zzzqqq"]);

  assert.equal(code, 1);
  assert.match(stderr, /^Error: No definitions found for "zzzqqq"\.$/m);
  assert.doesNotMatch(stderr, /Did you mean/);
  assert.doesNotMatch(stderr, /Try:/);
});

test("an entry with no meanings counts as not found", () => {
  const { stdout, stderr, code } = runCli(["nomeanings"]);

  assert.equal(code, 1);
  assert.equal(stdout, "");
  assert.match(stderr, /^Error: No definitions found for "nomeanings"\.$/m);
});

test("asks Datamuse for suggestions with the camdict User-Agent", () => {
  const datamuse = runCli(["pizzza"]).requests.filter(({ url }) =>
    url.startsWith("https://api.datamuse.com/")
  );

  assert.equal(datamuse.length, 1);
  assert.match(datamuse[0].url, /[?&]sp=pizzza(&|$)/);
  assert.equal(datamuse[0].userAgent, "camdict (https://github.com/ralfting/camdict)");
});
