#!/usr/bin/env node
const yargs = require("yargs");
const chalk = require("chalk");
const ora = require("ora");
const { spawn } = require("child_process");
const fs = require("fs/promises");
const os = require("os");
const path = require("path");

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
  const spinner = ora("Searching in dictionary...").start();

  if (!value) {
    spinner.stop();
    console.warn("Word not provided");

    return;
  }

  try {
    const entries = await getWordEntries(value);
    spinner.stop();

    if (!entries) {
      console.error(
        `Error: Word ${chalk.underline(value)} not found, try another one...`
      );
      return;
    }

    printHeader(value, getPhonetic(entries));
    const meanings = groupMeanings(entries);

    meanings.forEach((meaning) => printMeaning(meaning, limit));
    printHiddenSummary(value, meanings, limit);

    if (audio) {
      await playPronunciation(entries);
    }
  } catch (error) {
    spinner.stop();
    console.error("Error: " + error.message);
  }
}

async function getWordEntries(value) {
  const response = await fetch(
    `https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(value)}`
  );

  if (response.status === 404) {
    return null;
  }

  if (!response.ok) {
    throw new Error(`Dictionary service unavailable (HTTP ${response.status})`);
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

function printHeader(value, phonetic) {
  // inverse swaps the theme's own foreground and background, so the badge has
  // the same contrast as body text in any theme, unlike a fixed bgWhite.
  const word = chalk.inverse.bold(` ${value.toUpperCase()} `);

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
  const word = /^[\w-]+$/.test(value) ? value : `"${value}"`;

  console.log();
  printWrapped(`Showing ${counts} definitions.`, 0, "", chalk.dim);
  console.log(chalk.dim("See all: ") + `camdict ${word} --all`);
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

async function downloadPronunciation(entries) {
  for (const { audio, sourceUrl } of getRecordings(entries)) {
    const urls = [await getCommonsMp3Url(sourceUrl).catch(() => null), audio];

    for (const url of urls.filter(Boolean)) {
      const response = await fetch(url, {
        headers: { "User-Agent": USER_AGENT },
      }).catch(() => null);

      if (response && response.ok) {
        return Buffer.from(await response.arrayBuffer());
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
  const spinner = ora("Fetching pronunciation...").start();
  const sound = await downloadPronunciation(entries).finally(() =>
    spinner.stop()
  );

  if (!sound) {
    console.warn("\nNo pronunciation audio available for this word.");
    return;
  }

  const file = path.join(os.tmpdir(), `camdict-${process.pid}.mp3`);
  await fs.writeFile(file, sound);

  try {
    for (const [command, ...args] of AUDIO_PLAYERS) {
      if (await runPlayer(command, [...args, file])) {
        return;
      }
    }

    console.warn(
      "\nNo audio player found. Install mpg123, ffmpeg (ffplay) or mpv to hear pronunciations."
    );
  } finally {
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
