#!/usr/bin/env node
const yargs = require("yargs");
const chalk = require("chalk");
const ora = require("ora");
const { spawn } = require("child_process");
const fs = require("fs/promises");
const os = require("os");
const path = require("path");

// chalk 4 ignores the NO_COLOR convention (https://no-color.org), so apply
// it here. FORCE_COLOR still wins, matching Node's own behavior.
if (process.env.NO_COLOR && process.env.FORCE_COLOR === undefined) {
  chalk.level = 0;
}

// Declared before yargs runs: the handler starts synchronously while parsing.
const REQUEST_TIMEOUT_MS = 10000;

yargs
  .command({
    command: "$0 [value]",
    desc: "Brings the meaning of the word",
    handler,
  })
  .command({
    command: "dictionary [value]",
    aliases: ["d"],
    desc: "Brings the meaning of the word",
    handler,
  })
  .option("limit", {
    alias: "n",
    type: "number",
    default: 3,
    describe: "Maximum definitions shown per part of speech",
  })
  .option("all", {
    type: "boolean",
    default: false,
    describe: "Show every definition (ignores --limit)",
  })
  .option("audio", {
    alias: "a",
    type: "boolean",
    default: false,
    describe: "Play the pronunciation",
  })
  .demandCommand(1, "You need at least one command before moving on")
  .help().argv;

async function handler(argv) {
  const { value, audio, all } = argv;
  const limit = all ? Infinity : Math.max(1, argv.limit);

  if (!value) {
    printError("Provide a word or phrase to look up.\n");
    yargs.showHelp();
    return;
  }

  const spinner = startSpinner("Searching in dictionary...");

  try {
    const entries = await getWordEntries(value);
    const suggestions = entries ? [] : await getSuggestions(value);
    spinner.stop();

    if (!entries) {
      printError(`No definitions found for "${value}".`);
      printSuggestions(suggestions);
      return;
    }

    const headword = entries[0].word || value;

    printHeader(headword, getPhonetic(entries));
    const meanings = groupMeanings(entries);

    meanings.forEach((meaning) => printMeaning(meaning, limit));
    printHiddenSummary(headword, meanings, limit);

    if (audio) {
      await playPronunciation(entries);
    }
  } catch (error) {
    spinner.stop();
    printError(error.message);
  }
}

// ora colors its frames itself, so pass the color decision along.
function startSpinner(text) {
  return ora({ text, color: chalk.level > 0 ? "cyan" : false }).start();
}

// Only the label is colored; the message keeps the theme's text color so
// it stays readable on any background.
function printError(message) {
  console.error(`${chalk.red.bold("Error:")} ${message}`);
  process.exitCode = 1;
}

// Datamuse marks common misspellings with a "Misspelling of X." definition,
// and that is the only way to reach X when it is not among the close
// spellings it returns (recieve -> receive). Words rarer than once per
// million are dropped as too obscure to be what the user meant. Resolves
// empty on any failure, since the lookup has already failed and only the
// hint is lost.
async function getSuggestions(value) {
  try {
    const response = await fetch(
      `https://api.datamuse.com/words?sp=${encodeURIComponent(value)}&md=df&max=10`,
      {
        headers: { "User-Agent": USER_AGENT },
        // Short, so a typo never feels slower than a hit.
        signal: AbortSignal.timeout(3000),
      }
    );
    const rows = await response.json();
    const frequency = ({ tags = [] }) =>
      Number((tags.find((tag) => tag.startsWith("f:")) || "f:0").slice(2));
    const corrections = rows.flatMap(({ defs = [] }) =>
      defs
        .map((def) => /(?:Misspelling|spelling) of ([^.\[]+?)\./.exec(def))
        .filter(Boolean)
        .map((match) => match[1])
    );
    const common = rows
      .filter((row) => frequency(row) >= 1)
      .map(({ word }) => word);
    const input = value.toLowerCase();

    return [...new Set([...corrections, ...common])]
      .filter((word) => word.toLowerCase() !== input)
      .slice(0, 3);
  } catch {
    return [];
  }
}

// Printed with the error on stderr, so stdout stays empty for pipes.
function printSuggestions(words) {
  if (!words.length) {
    return;
  }

  console.error(chalk.dim("Did you mean: ") + words.join(" · "));
  console.error(chalk.dim("Try: ") + `camdict ${quoteArg(words[0])}`);
}

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

// Shows the dictionary's headword rather than the raw input, so "RUNNING"
// reads as "running". Not uppercased: all-caps is harder to read, and phrases
// suffer most.
function printHeader(headword, phonetic) {
  // inverse swaps the theme's own foreground and background, so the badge has
  // the same contrast as body text in any theme, unlike a fixed bgWhite.
  const word = chalk.inverse.bold(` ${headword} `);

  console.log(phonetic ? `${word} ${phonetic}` : word);
}

function printMeaning({ partOfSpeech, definitions }, limit) {
  const shown = definitions.slice(0, limit);
  const numberWidth = String(shown.length).length;

  console.log("\n" + chalk.bold(partOfSpeech));

  shown.forEach(({ definition, example }, index) => {
    const number = `${index + 1}.`.padStart(numberWidth + 1);
    const indent = 2 + number.length + 1;

    printWrapped(definition, indent, `  ${number} `);

    if (example) {
      printWrapped(`"${example}"`, indent, " ".repeat(indent), chalk.italic);
    }
  });
}

// One summary at the end instead of a hint per section, and only for the
// parts of speech that were cut, followed by the exact command to see all.
function printHiddenSummary(value, meanings, limit) {
  const cut = meanings.filter(({ definitions }) => definitions.length > limit);

  if (!cut.length) {
    return;
  }

  const counts = cut
    .map(({ partOfSpeech, definitions }) =>
      `${limit} of ${definitions.length} ${partOfSpeech}`
    )
    .join(" · ");

  console.log();
  printWrapped(`Showing ${counts} definitions.`, 0, "", chalk.dim);
  console.log(chalk.dim("See all: ") + `camdict ${quoteArg(value)} --all`);
}

function quoteArg(value) {
  return /^[\w-]+$/.test(value) ? value : `"${value}"`;
}

// Long lines are wrapped here, instead of by the terminal, so continuation
// lines stay aligned under the text. Capped at 80 columns for readability;
// output to a pipe or file is left unwrapped.
const MAX_WIDTH = 80;

function getOutputWidth() {
  if (!process.stdout.isTTY) {
    return Infinity;
  }

  return Math.min(process.stdout.columns || MAX_WIDTH, MAX_WIDTH);
}

function printWrapped(text, indent, firstPrefix, style = (line) => line) {
  const width = Math.max(getOutputWidth() - indent, 20);
  const lines = [];
  let line = "";

  text.split(/\s+/).forEach((word) => {
    if (line && line.length + 1 + word.length > width) {
      lines.push(line);
      line = word;
    } else {
      line = line ? `${line} ${word}` : word;
    }
  });
  lines.push(line);

  // Style each line separately so ANSI codes never span a line break.
  lines.forEach((content, index) => {
    const prefix = index === 0 ? firstPrefix : " ".repeat(indent);
    console.log(prefix + style(content));
  });
}

// Wikimedia asks API clients to identify themselves.
const USER_AGENT = "camdict (https://github.com/ralfting/camdict)";

// Recordings with audio, US first since it is the most common accent asked for.
function getRecordings(entries) {
  const recordings = entries
    .flatMap((entry) => entry.phonetics || [])
    .filter(({ audio }) => audio);
  const isUs = ({ audio }) => /-us\.mp3$/.test(audio);

  return [
    ...recordings.filter(isUs),
    ...recordings.filter((recording) => !isUs(recording)),
  ];
}

// The dictionary API's own media host stopped serving files, but every
// recording links to its Wikimedia Commons page, which provides an MP3.
async function getCommonsMp3Url(sourceUrl) {
  const match = /[?&]curid=(\d+)/.exec(sourceUrl || "");

  if (!match) {
    return null;
  }

  const response = await fetch(
    "https://commons.wikimedia.org/w/api.php?action=query&format=json" +
      `&prop=videoinfo&viprop=url|mime|derivatives&pageids=${match[1]}`,
    { headers: { "User-Agent": USER_AGENT } }
  );

  if (!response.ok) {
    return null;
  }

  const { query } = await response.json();
  const page = query && query.pages && query.pages[match[1]];
  const info = page && page.videoinfo && page.videoinfo[0];

  if (!info) {
    return null;
  }

  if (info.mime === "audio/mpeg") {
    return info.url;
  }

  const mp3 = (info.derivatives || []).find(
    ({ type }) => type === "audio/mpeg"
  );

  return mp3 ? mp3.src : null;
}

// Recordings are named like "run-us.mp3" or "house-1-uk.mp3".
function getAccent(audioUrl) {
  const match = /-([a-z]{2})\.mp3$/.exec(audioUrl);

  return match ? match[1].toUpperCase() : null;
}

async function downloadPronunciation(entries) {
  for (const { audio, sourceUrl } of getRecordings(entries)) {
    const urls = [await getCommonsMp3Url(sourceUrl).catch(() => null), audio];

    for (const url of urls.filter(Boolean)) {
      const response = await fetch(url, {
        headers: { "User-Agent": USER_AGENT },
      }).catch(() => null);

      if (response && response.ok) {
        return {
          sound: Buffer.from(await response.arrayBuffer()),
          accent: getAccent(audio),
        };
      }
    }
  }

  return null;
}

const AUDIO_PLAYERS = [
  ...(process.platform === "darwin" ? [["afplay"]] : []),
  ["mpg123", "-q"],
  ["ffplay", "-nodisp", "-autoexit", "-loglevel", "quiet"],
  ["mpv", "--no-video", "--really-quiet"],
];

async function playPronunciation(entries) {
  const spinner = startSpinner("Fetching pronunciation...");
  const recording = await downloadPronunciation(entries).catch((error) => {
    spinner.stop();
    throw error;
  });

  if (!recording) {
    spinner.stop();
    console.warn("\nNo pronunciation audio available for this word.");
    return;
  }

  const file = path.join(os.tmpdir(), `camdict-${process.pid}.mp3`);
  await fs.writeFile(file, recording.sound);

  // Keep a line on screen while the player runs; it is silent otherwise.
  const accent = recording.accent ? ` (${recording.accent})` : "";
  spinner.spinner = { interval: 300, frames: ["♪", "♫"] };
  spinner.text = `Playing pronunciation${accent}...`;

  try {
    for (const [command, ...args] of AUDIO_PLAYERS) {
      if (await runPlayer(command, [...args, file])) {
        return;
      }
    }

    spinner.stop();
    console.warn(
      "\nNo audio player found. Install mpg123, ffmpeg (ffplay) or mpv to hear pronunciations."
    );
  } finally {
    spinner.stop();
    await fs.rm(file, { force: true });
  }
}

// Resolves false when the player is not installed so the next one is tried.
function runPlayer(command, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { stdio: "ignore" });

    child.on("error", (error) =>
      error.code === "ENOENT" ? resolve(false) : reject(error)
    );
    child.on("close", (code) =>
      code === 0
        ? resolve(true)
        : reject(new Error(`${command} exited with code ${code}`))
    );
  });
}
