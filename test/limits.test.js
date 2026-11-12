const test = require("node:test");
const assert = require("node:assert/strict");
const { runCli } = require("./support/run-cli");

function numbersUnder(stdout, partOfSpeech) {
  const section = stdout.split("\n\n").find((block) => block.startsWith(`${partOfSpeech}\n`));

  return [...section.matchAll(/^ *(\d+)\. /gm)].map((match) => Number(match[1]));
}

test("shows 3 definitions per part of speech by default", () => {
  const { stdout } = runCli(["house"]);

  assert.deepEqual(numbersUnder(stdout, "noun"), [1, 2, 3]);
  assert.deepEqual(numbersUnder(stdout, "verb"), [1, 2, 3]);
});

test("-n and --limit set how many definitions each part of speech shows", () => {
  assert.deepEqual(numbersUnder(runCli(["library", "-n", "1"]).stdout, "noun"), [1]);
  assert.deepEqual(numbersUnder(runCli(["run", "--limit", "5"]).stdout, "verb"), [1, 2, 3, 4, 5]);
});

test("a limit of 0 still shows one definition", () => {
  assert.deepEqual(numbersUnder(runCli(["library", "-n", "0"]).stdout, "noun"), [1]);
});

test("--all shows every definition", () => {
  assert.deepEqual(
    numbersUnder(runCli(["library", "--all"]).stdout, "noun"),
    [1, 2, 3, 4, 5, 6, 7, 8]
  );
});

test("--all wins over -n", () => {
  assert.deepEqual(
    numbersUnder(runCli(["library", "-n", "1", "--all"]).stdout, "noun"),
    [1, 2, 3, 4, 5, 6, 7, 8]
  );
});

test("summarizes the hidden definitions and prints the command to see them all", () => {
  const { stdout } = runCli(["house"]);

  assert.ok(
    stdout.endsWith(
      "\nShowing 3 of 19 noun · 3 of 9 verb definitions.\nSee all: camdict house --all\n"
    )
  );
});

test("the summary names only the parts of speech that were cut", () => {
  const { stdout } = runCli(["run", "-n", "5"]);

  assert.deepEqual(numbersUnder(stdout, "adjective"), [1, 2, 3, 4, 5]);
  assert.match(stdout, /^Showing 5 of 35 verb · 5 of 23 noun definitions\.$/m);
});

test("prints no summary when nothing is hidden", () => {
  for (const args of [["pizza"], ["library", "--all"]]) {
    const { stdout } = runCli(args);

    assert.doesNotMatch(stdout, /Showing/);
    assert.doesNotMatch(stdout, /See all/);
  }
});

test("quotes a phrase in the See all command", () => {
  assert.match(runCli(["give up"]).stdout, /^See all: camdict "give up" --all$/m);
});
