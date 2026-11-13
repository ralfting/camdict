// Preloaded with `node --require` ahead of cli.js. Every fetch is answered
// from test/fixtures and appended to FAKE_REQUEST_LOG, so no test touches
// the network.
const fs = require("fs");
const path = require("path");
const tty = require("tty");

const FIXTURES = path.join(__dirname, "..", "fixtures");
const { FAKE_NETWORK, FAKE_REQUEST_LOG, FAKE_COLUMNS, FAKE_RESPONSES_DIR } = process.env;

if (FAKE_COLUMNS) {
  process.stdout.isTTY = true;
  process.stdout.columns = Number(FAKE_COLUMNS);
  // chalk picks its color level from isatty(1), not from process.stdout.
  const isatty = tty.isatty;
  tty.isatty = (fd) => fd === 1 || isatty(fd);
}

// A response built by the test itself wins over the recorded fixture.
function fixture(name) {
  const dirs = FAKE_RESPONSES_DIR ? [FAKE_RESPONSES_DIR, FIXTURES] : [FIXTURES];
  const file = dirs.map((dir) => path.join(dir, name)).find((f) => fs.existsSync(f));
  return file ? fs.readFileSync(file, "utf8") : null;
}

function respond(body, status = 200) {
  return new Response(body, { status });
}

globalThis.fetch = async (input, options = {}) => {
  const url = String(input);
  fs.appendFileSync(
    FAKE_REQUEST_LOG,
    JSON.stringify({
      url,
      userAgent: new Headers(options.headers).get("User-Agent"),
      hasSignal: Boolean(options.signal),
    }) + "\n"
  );

  if (FAKE_NETWORK === "timeout") {
    throw new DOMException("The operation was aborted due to timeout", "TimeoutError");
  }
  if (FAKE_NETWORK === "offline") {
    throw new TypeError("fetch failed");
  }

  const { hostname, pathname, searchParams } = new URL(url);

  if (hostname === "api.dictionaryapi.dev" && pathname.startsWith("/api/")) {
    if (FAKE_NETWORK === "dictionary-500") return respond("{}", 500);
    // The real API ignores case: RUNNING returns the entries for "running".
    const word = decodeURIComponent(path.basename(pathname)).toLowerCase().replace(/ /g, "_");
    const body = fixture(`dict-${word}.json`);
    return body ? respond(body) : respond('{"title":"No Definitions Found"}', 404);
  }

  if (hostname === "api.datamuse.com") {
    return respond(fixture(`datamuse-${searchParams.get("sp")}.json`) || "[]");
  }

  if (hostname === "commons.wikimedia.org") {
    if (FAKE_NETWORK === "commons-500") return respond("{}", 500);
    const id = searchParams.get("pageids");
    const missing = JSON.stringify({ query: { pages: { [id]: { missing: "" } } } });
    return respond(fixture(`commons-${id}.json`) || missing);
  }

  if (pathname.endsWith(".mp3")) {
    if (FAKE_NETWORK === "audio-404") return respond("", 404);
    return respond(`MP3 from ${url}`);
  }

  return respond("", 404);
};
