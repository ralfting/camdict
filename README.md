# Camdict

English dictionary in your terminal.

![Camdict demo](https://i.imgur.com/WTkqGIf.gif)

## Features

- **Every meaning, grouped by part of speech**, numbered, with a usage example
  under each definition.
- **Phonetic transcription** next to the word.
- **Pronunciation out loud** with `--audio`, preferring the US recording.
- **Readable on any terminal theme**: styled with bold, italic and dim instead
  of fixed colors, long definitions wrap aligned under their text, and
  `NO_COLOR` is honored.
- **Script friendly**: errors go to stderr with exit code 1, and piped output
  is never wrapped.

```
$ camdict run -n 2
 run  /ɹʌn/

verb
  1. To run.
  2. To move swiftly.

noun
  1. Act or instance of running, of moving rapidly using the feet.
     "I just got back from my morning run."
  2. Act or instance of hurrying (to or from a place) (not necessarily
     by foot); dash or errand, trip.
     "I need to make a run to the store."

adjective
  1. In a liquid state; melted or molten.
     "Put some run butter on the vegetables."
  2. Cast in a mould.

Showing 2 of 35 verb · 2 of 23 noun · 2 of 5 adjective definitions.
See all: camdict run --all
```

## Installing

Requires Node.js 22 or newer.

```
npm i -g camdict
```

To hear pronunciations, macOS works out of the box (`afplay`). On Linux or
Windows, install one of `mpg123`, `ffmpeg` (for `ffplay`) or `mpv`.

## Usage

```
camdict <word>            # camdict house
camdict "<phrase>"        # camdict "wrap up"
camdict <word> --audio    # also play the pronunciation (alias -a)
camdict <word> -n 10      # up to 10 definitions per part of speech (default 3)
camdict <word> --all      # every definition
camdict --help
```

| Option | Alias | Default | Description |
|---|---|---|---|
| `--audio` | `-a` | `false` | Play the pronunciation |
| `--limit` | `-n` | `3` | Maximum definitions shown per part of speech |
| `--all` | | `false` | Show every definition (overrides `--limit`) |
| `--no-color` | | | Disable colors and styles (same as `NO_COLOR=1`) |

When definitions are cut by `--limit`, a summary at the end says how many were
hidden and gives the command to see them all.

### Exit codes

| Code | Meaning |
|---|---|
| `0` | The word was found |
| `1` | The word was not found, no word was given, or the dictionary service could not be reached |

A word with no recording still exits `0` with `--audio`; the CLI prints a
warning and shows the definitions.

## Data sources

Definitions come from the [Free Dictionary API](https://dictionaryapi.dev/).
Pronunciations come from [Wikimedia Commons](https://commons.wikimedia.org/),
because the API's own audio host no longer serves files.

Camdict used to scrape Cambridge Dictionary, which now blocks automated
requests with a Cloudflare challenge.
