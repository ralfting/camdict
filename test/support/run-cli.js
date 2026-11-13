const { spawnSync } = require("node:child_process");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

const CLI = path.join(__dirname, "..", "..", "cli.js");
const PRELOAD = path.join(__dirname, "fake-network.cjs");

// Installed under every player name the CLI may try, so the same tests run
// on macOS (afplay) and elsewhere (mpg123 first). PATH holds only these, so
// the script names node by absolute path.
const FAKE_PLAYER = `#!${process.execPath}
const fs = require("fs");
const path = require("path");
const file = process.argv.at(-1);
fs.appendFileSync(process.env.FAKE_PLAYER_LOG, JSON.stringify({
  command: path.basename(process.argv[1]),
  args: process.argv.slice(2),
  file,
  sound: fs.readFileSync(file, "utf8"),
}) + "\\n");
process.exitCode = Number(process.env.FAKE_PLAYER_EXIT || 0);
`;

function readJsonLines(file) {
  return fs
    .readFileSync(file, "utf8")
    .split("\n")
    .filter(Boolean)
    .map((line) => JSON.parse(line));
}

// responses maps a fixture name, such as "dict-tomato", to the body the fake
// network returns for it, so a test can state the exact shape it relies on.
function runCli(args, { env = {}, players = true, responses = {} } = {}) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "camdict-test-"));
  const bin = path.join(dir, "bin");
  const tmpDir = path.join(dir, "tmp");
  const requestLog = path.join(dir, "requests.jsonl");
  const playerLog = path.join(dir, "player.jsonl");
  const responsesDir = path.join(dir, "responses");

  fs.mkdirSync(bin);
  fs.mkdirSync(tmpDir);
  fs.writeFileSync(requestLog, "");
  fs.writeFileSync(playerLog, "");
  fs.mkdirSync(responsesDir);
  for (const [name, body] of Object.entries(responses)) {
    fs.writeFileSync(path.join(responsesDir, `${name}.json`), JSON.stringify(body));
  }

  if (players) {
    for (const name of ["afplay", "mpg123", "ffplay", "mpv"]) {
      fs.writeFileSync(path.join(bin, name), FAKE_PLAYER, { mode: 0o755 });
    }
  }

  try {
    const result = spawnSync(process.execPath, ["--require", PRELOAD, CLI, ...args], {
      encoding: "utf8",
      timeout: 10000,
      env: {
        PATH: bin,
        TMPDIR: tmpDir,
        FAKE_REQUEST_LOG: requestLog,
        FAKE_PLAYER_LOG: playerLog,
        FAKE_RESPONSES_DIR: responsesDir,
        ...env,
      },
    });

    return {
      stdout: result.stdout,
      stderr: result.stderr,
      code: result.status,
      requests: readJsonLines(requestLog),
      played: readJsonLines(playerLog),
      tmpDir,
      tmpFilesLeft: fs.readdirSync(tmpDir),
    };
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

module.exports = { runCli };
