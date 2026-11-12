# Camdict

English dictionary in your terminal

![Camdict demo](https://i.imgur.com/WTkqGIf.gif)

## Description

A simple command line to look up English words in the terminal. It shows the
phonetic transcription and every meaning grouped by part of speech, with usage
examples, and can play the pronunciation out loud.

> Definitions come from the [Free Dictionary API](https://dictionaryapi.dev/)
> and pronunciations from [Wikimedia Commons](https://commons.wikimedia.org/).
> Camdict used to scrape Cambridge Dictionary, which now blocks automated
> requests with a Cloudflare challenge.

## Getting Started

### Requirements

- Node.js 22 or newer
- To use `--audio`: macOS works out of the box (`afplay`); on Linux or
  Windows install one of `mpg123`, `ffmpeg` (`ffplay`) or `mpv`

### Installing

> npm i camdict -g

### How use it

```
camdict <word>          # Exp.: $ camdict house
camdict "<phrase>"      # Exp.: $ camdict "wrap up"
camdict <word> --audio  # also play the pronunciation (alias -a)
camdict <word> -n 10    # show up to 10 definitions per part of speech (default 3)
camdict --help
```
