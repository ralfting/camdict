# Camdict

English dictionary in your terminal.

```
npm i -g camdict
camdict pizza
```

## Features

- Every meaning of the word, grouped by part of speech and numbered, with a
  usage example under each definition.
- The phonetic transcription next to the word.
- `--audio` plays the pronunciation. It picks the US recording when there is
  one.
- Text that stays legible on light and dark themes. Camdict styles it with
  bold, italic and dim instead of fixed colors, aligns wrapped lines under
  their definition, and honors `NO_COLOR`.
- Errors go to stderr with exit code 1, and camdict never wraps piped output,
  so it works in scripts.

## Installing

Requires Node.js 22 or newer.

```
npm i -g camdict
```

On macOS, `--audio` plays sound with the built-in `afplay`. On Linux or
Windows, install `mpg123`, `ffmpeg` or `mpv` first.

## Usage

### Look up a word or phrase

![Looking up "pizza", then the phrase "give up", in camdict](docs/demo-basics.gif)

Type `camdict` and the word. For a phrase, put it in quotes so your shell
passes it as one argument.

```
camdict pizza
camdict "give up"
```

### Hear the pronunciation

![Running camdict wonderful -a: the definitions print, then the pronunciation plays](docs/demo-audio.gif)

Add `-a` (or `--audio`). Camdict prints the definitions, then plays the
recording through your speakers.

```
camdict wonderful -a
```

### Choose how many definitions

![Running camdict library -n 1, then camdict library --all](docs/demo-options.gif)

Camdict shows 3 definitions per part of speech. `-n` changes that number and
`--all` shows every one. When definitions are cut, the last lines say how many
it hid and print the command that shows them all.

```
camdict library -n 1
camdict library --all
```

### All options

| Option | Alias | Default | Description |
|---|---|---|---|
| `--audio` | `-a` | `false` | Play the pronunciation |
| `--limit` | `-n` | `3` | Maximum definitions shown per part of speech |
| `--all` | | `false` | Show every definition (overrides `--limit`) |
| `--no-color` | | | Disable colors and styles (same as `NO_COLOR=1`) |
| `--help` | | | Show usage |

### Exit codes

| Code | Meaning |
|---|---|
| `0` | The word was found |
| `1` | The dictionary has no such word, no word was given, or camdict could not reach the dictionary service |

With `--audio`, a word that has no recording still exits with `0`. Camdict
shows the definitions and prints a warning.

## Data sources

Definitions come from the [Free Dictionary API](https://dictionaryapi.dev/).
Pronunciations come from [Wikimedia Commons](https://commons.wikimedia.org/),
because the API's own audio host no longer serves files.

Camdict used to scrape Cambridge Dictionary, which now blocks automated
requests with a Cloudflare challenge.
