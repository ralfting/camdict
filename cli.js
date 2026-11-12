#!/usr/bin/env node
const yargs = require("yargs");
const fetch = require("node-fetch");
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
  .demandCommand(1, "You need at least one command before moving on")
  .help().argv;

async function handler(argv) {
  const { value } = argv;
  const spinner = ora("Searching in dictionary...").start();

  if (!value) {
    spinner.stop();
    console.warn("Word not provided");

    return;
  }

  try {
    const entry = await getWordEntry(value);
    spinner.stop();

    if (!entry) {
      console.error(
        `Error: Word ${chalk.underline(value)} not found, try another one...`
      );
      return;
    }

    const meaning = entry.meanings[0];

    getHeader(value, meaning);
    getDescription(meaning);
    getExamples(meaning);
  } catch (error) {
    spinner.stop();
    console.error("Error: " + error.message);
  }
}

async function getWordEntry(value) {
  const response = await fetch(
    `https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(value)}`
  );

  if (response.status === 404) {
    return null;
  }

  if (!response.ok) {
    throw new Error(`Dictionary service unavailable (HTTP ${response.status})`);
  }

  const [entry] = await response.json();

  return entry && entry.meanings && entry.meanings.length ? entry : null;
}

function getDescription(meaning) {
  const definition = meaning.definitions[0].definition;

  if (definition) {
    console.log("Definition:", definition);
  }
}

function getHeader(value, meaning) {
  const word = chalk.bgWhite.black(value.toUpperCase());
  const type = chalk.underline.gray(meaning.partOfSpeech);

  console.log(`${word} (${type})`);
}

function getExamples(meaning) {
  const examples = meaning.definitions
    .map((definition) => definition.example)
    .filter(Boolean);

  if (!examples.length) {
    return;
  }

  console.log(chalk.bgWhite.black("\nExamples"));
  examples.forEach((example) => console.log("- " + example));
}
