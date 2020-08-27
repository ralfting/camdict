#!/usr/bin/env node
const yargs = require("yargs");
const fetch = require("node-fetch");
const cheerio = require("cheerio");
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
    const response = await getWordMean(value);

    if (isWordNotFound(response)) {
      throw "Word not found, try other one...";
    }

    spinner.stop();
    const $ = cheerio.load(await response.text());

    getHeader(value, $);
    getDescription($);
    getExamples($);
  } catch (error) {
    spinner.stop();
    console.error("Error: " + error);
  }
}

async function getWordMean(value) {
  const response = await fetch(
    `https://dictionary.cambridge.org/dictionary/english/${value}`
  );

  return response;
}

function getDescription($) {
  const defination = $(".ddef_d").first().text().trim();

  if (defination) {
    console.log("Definition:", defination);
  }
}

function getHeader(value, $) {
  const word = chalk.bgWhite.black(value);
  const type = chalk.underline.gray($(".pos.dpos").first().text());

  console.log(`${word.toUpperCase()} (${type})`);
}

function getExamples($) {
  const exampleWord = chalk.bgWhite.black("\nExamples");
  const examples = $(".def-body.ddef_b").first().find(".examp");

  console.log(exampleWord);
  examples.each((_idx, el) => console.log("- " + $(el).text().trim()));
}

function isWordNotFound(response) {
  return (
    response.url === "https://dictionary.cambridge.org/dictionary/english/"
  );
}
