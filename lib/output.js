const chalk = require("chalk");
const ora = require("ora");

// chalk 4 ignores the NO_COLOR convention (https://no-color.org), so apply
// it here. FORCE_COLOR still wins, matching Node's own behavior.
if (process.env.NO_COLOR && process.env.FORCE_COLOR === undefined) {
  chalk.level = 0;
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

function printSuggestions(words) {
  if (!words.length) {
    return;
  }

  console.error(chalk.dim("Did you mean: ") + words.join(" · "));
  console.error(chalk.dim("Try: ") + `camdict ${quoteArg(words[0])}`);
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

module.exports = {
  startSpinner,
  printError,
  printSuggestions,
  printHeader,
  printMeaning,
  printHiddenSummary,
};
