# Camdict

English dictionary in your terminal

![Camdict demo](https://i.imgur.com/WTkqGIf.gif)

## Description

A simple command line to look up English words in the terminal. It shows the
part of speech, the definition and usage examples.

> Definitions come from the [Free Dictionary API](https://dictionaryapi.dev/).
> Camdict used to scrape Cambridge Dictionary, which now blocks automated
> requests with a Cloudflare challenge.

## Getting Started

### Requirements

- Node.js 22 or newer

### Installing

> npm i camdict -g

### How use it

```
camdict <word> // Exp.: $ camdict house
camdict "<phrase>" // Exp.: $ camdict "wrap up"
camdict --help
```
