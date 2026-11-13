#!/usr/bin/env node
const yargs = require("yargs");
const { getWordEntries, groupMeanings, getPhonetic } = require("./lib/dictionary");
const {
  startSpinner,
  printError,
  printSuggestions,
  printHeader,
  printMeaning,
  printHiddenSummary,
} = require("./lib/output");
const { playPronunciation } = require("./lib/pronunciation");
const { getSuggestions } = require("./lib/suggestions");

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
