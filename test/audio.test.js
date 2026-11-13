const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const { runCli } = require("./support/run-cli");
const { commonsPage } = require("./support/factories");

const USER_AGENT = "camdict (https://github.com/ralfting/camdict)";
const PLAYER =
  process.platform === "darwin"
    ? { command: "afplay", flags: [] }
    : { command: "mpg123", flags: ["-q"] };

test("plays the pronunciation with the platform's player", () => {
  const { stdout, played, tmpDir, code } = runCli(["house", "-a", "-n", "1"]);

  assert.equal(code, 0);
  assert.match(stdout, /^ {2}1\. A structure built or serving as an abode of human beings\.$/m);
  assert.equal(played.length, 1);
  assert.equal(played[0].command, PLAYER.command);
  assert.deepEqual(played[0].args, [...PLAYER.flags, played[0].file]);
  assert.equal(path.dirname(played[0].file), tmpDir);
});

test("plays nothing without -a", () => {
  const { played, requests } = runCli(["house", "-n", "1"]);

  assert.deepEqual(played, []);
  assert.deepEqual(
    requests.map(({ url }) => url),
    ["https://api.dictionaryapi.dev/api/v2/entries/en/house"]
  );
});

// The house fixture lists its Canadian and UK recordings before the US one.
test("prefers the US recording, played from Wikimedia Commons' MP3", () => {
  const { played } = runCli(["house", "--audio", "-n", "1"]);

  assert.equal(
    played[0].sound,
    "MP3 from https://upload.wikimedia.org/wikipedia/commons/transcoded/5/55/En-us-house-noun.ogg/En-us-house-noun.ogg.mp3"
  );
});

test("plays the Commons original when it is already an MP3", () => {
  const { played } = runCli(["house", "-a", "-n", "1"], {
    responses: {
      "commons-711134": commonsPage("711134", {
        mime: "audio/mpeg",
        url: "https://upload.wikimedia.org/original/house.mp3",
        derivatives: [{ type: "audio/mpeg", src: "https://upload.wikimedia.org/derived/house.mp3" }],
      }),
    },
  });

  assert.equal(played[0].sound, "MP3 from https://upload.wikimedia.org/original/house.mp3");
});

test("plays Commons' MP3 rendition when the original file is not an MP3", () => {
  const { played } = runCli(["wonderful", "-a"]);

  assert.equal(
    played[0].sound,
    "MP3 from https://upload.wikimedia.org/wikipedia/commons/transcoded/e/e2/En-us-wonderful.ogg/En-us-wonderful.ogg.mp3"
  );
});

test("falls back to the dictionary's own audio URL when Commons fails", () => {
  const { played, code } = runCli(["house", "-a", "-n", "1"], {
    env: { FAKE_NETWORK: "commons-500" },
  });

  assert.equal(code, 0);
  assert.equal(
    played[0].sound,
    "MP3 from https://api.dictionaryapi.dev/media/pronunciations/en/house-1-us.mp3"
  );
});

test("says no audio is available when every download fails", () => {
  const { stdout, stderr, played, code } = runCli(["house", "-a", "-n", "1"], {
    env: { FAKE_NETWORK: "audio-404" },
  });

  assert.equal(code, 0);
  assert.match(stdout, /^noun$/m);
  assert.match(stderr, /No pronunciation audio available for this word\./);
  assert.deepEqual(played, []);
});

test("says no audio is available when the word has no recording", () => {
  const { stderr, played, requests, code } = runCli(["pizza", "-a"]);

  assert.equal(code, 0);
  assert.match(stderr, /No pronunciation audio available for this word\./);
  assert.deepEqual(played, []);
  assert.equal(requests.length, 1);
});

test("explains how to get a player when none is installed", () => {
  const { stderr, code, tmpFilesLeft } = runCli(["house", "-a", "-n", "1"], { players: false });

  assert.equal(code, 0);
  assert.match(
    stderr,
    /No audio player found\. Install mpg123, ffmpeg \(ffplay\) or mpv to hear pronunciations\./
  );
  assert.deepEqual(tmpFilesLeft, []);
});

test("reports a failing player as an error and exits 1", () => {
  const { stdout, stderr, code, played, tmpFilesLeft } = runCli(["house", "-a", "-n", "1"], {
    env: { FAKE_PLAYER_EXIT: "3" },
  });

  assert.equal(code, 1);
  assert.match(stdout, /^noun$/m);
  assert.equal(played.length, 1);
  assert.match(stderr, new RegExp(`^Error: ${PLAYER.command} exited with code 3$`, "m"));
  assert.deepEqual(tmpFilesLeft, []);
});

test("removes the downloaded MP3 once it has played", () => {
  const { played, tmpFilesLeft } = runCli(["house", "-a", "-n", "1"]);

  assert.notEqual(played[0].sound, "");
  assert.deepEqual(tmpFilesLeft, []);
});

test("identifies itself to Wikimedia with the camdict User-Agent", () => {
  const { requests } = runCli(["house", "-a", "-n", "1"]);
  const audioRequests = requests.slice(1);

  assert.ok(audioRequests.some(({ url }) => url.startsWith("https://commons.wikimedia.org/")));
  assert.ok(audioRequests.some(({ url }) => url.startsWith("https://upload.wikimedia.org/")));
  for (const { url, userAgent } of audioRequests) {
    assert.equal(userAgent, USER_AGENT, url);
  }
});
