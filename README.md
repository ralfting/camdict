# Camdict

English dictionary in your terminal.

```
npm i -g camdict
```

Requires Node.js 22 or newer.

## Look up a word

![Looking up the word pizza, then the phrase give up, in camdict](docs/demo-basics.gif)

```
camdict pizza
camdict "give up"
```

Put phrases in quotes. If a word is misspelled, camdict suggests the
closest matches.

## Hear the pronunciation

![Running camdict wonderful -a: the definitions print, then the pronunciation plays](docs/demo-audio.gif)

```
camdict wonderful -a
```

On macOS this needs no setup. On Linux or Windows, install `mpg123`, `ffmpeg`
or `mpv` first.

## Show more or fewer definitions

![Running camdict library -n 1, then camdict library --all](docs/demo-options.gif)

```
camdict library -n 1
camdict library --all
```

Camdict shows 3 definitions per part of speech unless you pass `-n` or
`--all`.

## Options

| Option | Alias | Description |
|---|---|---|
| `--audio` | `-a` | Play the pronunciation |
| `--limit` | `-n` | Definitions per part of speech (default 3) |
| `--all` | | Show every definition |
| `--no-color` | | Plain text, no styles (or set `NO_COLOR=1`) |
| `--help` | | Show usage |

Camdict exits with code 1 when the word is not found or the dictionary
service is unreachable.

## Data sources

Definitions come from the [Free Dictionary API](https://dictionaryapi.dev/),
pronunciations from [Wikimedia Commons](https://commons.wikimedia.org/) and
spelling suggestions from [Datamuse](https://www.datamuse.com/api/).
