const test = require("node:test");
const assert = require("node:assert/strict");
const { runCli } = require("./support/run-cli");

const terminal = (columns, env = {}) => ({ env: { FAKE_COLUMNS: String(columns), ...env } });
const colorTerminal = (env = {}) => terminal(80, { TERM: "xterm-256color", ...env });
const hasColor = (text) => text.includes("\x1b[");

test("wraps long lines to the terminal, aligned under the text", () => {
  const { stdout } = runCli(["run", "-n", "4"], terminal(60));

  assert.ok(
    stdout.includes(
      "  4. (of a vessel) To sail before the wind, in distinction\n" +
        "     from reaching or sailing close-hauled.\n"
    )
  );
  assert.ok(
    stdout.includes("Showing 4 of 35 verb · 4 of 23 noun · 4 of 5 adjective\ndefinitions.\n")
  );
});

test("wraps examples aligned under the definition", () => {
  const { stdout } = runCli(["house"], terminal(70));

  assert.ok(
    stdout.includes(
      '     "On arriving at the zoo, we immediately headed for the monkey\n' +
        '     house."\n'
    )
  );
});

test("never wraps wider than 80 columns, however wide the terminal", () => {
  const { stdout } = runCli(["house", "--all"], terminal(200));

  // "used" would make the first line 81 columns.
  assert.ok(
    stdout.includes(
      "  10. An animal's shelter or den, or the shell of an animal such as a snail,\n" +
        "      used for protection.\n"
    )
  );
  for (const line of stdout.split("\n")) {
    assert.ok(line.length <= 80, line);
  }
});

test("keeps at least 20 columns of text in a very narrow terminal", () => {
  const { stdout } = runCli(["library"], terminal(12));

  assert.ok(
    stdout.includes(
      [
        "  2. (by extension) Any",
        "     institution that",
        "     lends out its goods",
        "     for use by the",
        "     public or a",
        "     community.",
      ].join("\n")
    )
  );
});

test("does not wrap output sent to a pipe", () => {
  const { stdout } = runCli(["run", "-n", "4"]);

  assert.match(
    stdout,
    /^ {2}4\. \(of a vessel\) To sail before the wind, in distinction from reaching or sailing close-hauled\.$/m
  );
});

test("colors output in a color terminal", () => {
  assert.ok(hasColor(runCli(["house", "-n", "1"], colorTerminal()).stdout));
});

test("NO_COLOR turns colors off", () => {
  assert.ok(!hasColor(runCli(["house", "-n", "1"], colorTerminal({ NO_COLOR: "1" })).stdout));
});

test("--no-color turns colors off", () => {
  assert.ok(!hasColor(runCli(["house", "-n", "1", "--no-color"], colorTerminal()).stdout));
});

test("prints no colors to a pipe unless FORCE_COLOR is set", () => {
  assert.ok(!hasColor(runCli(["house", "-n", "1"]).stdout));
  assert.ok(hasColor(runCli(["house", "-n", "1"], { env: { FORCE_COLOR: "1" } }).stdout));
});

test("FORCE_COLOR wins over NO_COLOR", () => {
  const { stdout } = runCli(["house", "-n", "1"], { env: { NO_COLOR: "1", FORCE_COLOR: "1" } });

  assert.ok(hasColor(stdout));
});
