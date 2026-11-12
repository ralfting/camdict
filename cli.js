#!/usr/bin/env node
const yargs = require("yargs");
const chalk = require("chalk");
const ora = require("ora");

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
  .demandCommand(1, "You need at least one command before moving on")
  .help().argv;

async function handler(argv) {
  const { value, limit } = argv;
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

    printHeader(value);
    groupMeanings(entries).forEach((meaning) => printMeaning(meaning, limit));
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

function printHeader(value) {
  console.log(chalk.bgWhite.black(` ${value.toUpperCase()} `));
}

function printMeaning({ partOfSpeech, definitions }, limit) {
  const shown = definitions.slice(0, Math.max(1, limit));
  const hidden = definitions.length - shown.length;

  console.log("\n" + chalk.underline.gray(partOfSpeech));

  shown.forEach(({ definition, example }, index) => {
    console.log(`  ${index + 1}. ${definition}`);

    if (example) {
      console.log(chalk.italic.gray(`     "${example}"`));
    }
  });

  if (hidden > 0) {
    console.log(chalk.gray(`  ...and ${hidden} more (use --limit to see them)`));
  }
}
