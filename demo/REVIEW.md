# Review

## Creative calls

- A realistic terminal session, no titles or captions: the README visitor
  should see exactly what the CLI prints. Every line of output was captured
  from `node cli.js` in an 80-column pty and converted from its ANSI codes,
  so styles (inverse header, bold parts of speech, italic examples, dim
  summary) match the real CLI.
- Three beats: `camdict run -n 2` (the layout), `camdict "wrap up" -a` (the
  playing indicator), `camdict run --all` then `npm i -g camdict` (volume,
  then the install command as the last frame).
- No storyline options were offered: the request was a README demo, and the
  realistic terminal recording is that format.
- Silent on purpose. The README embeds a GIF, which carries no sound.
- Window chrome and ground are hand-drawn. The registry's
  `terminal-simulator` is an IDE mock-up, not a terminal, so it was removed.

## Measured

- `hyperframes check`: ok. Kept warnings:
  - `film_silent`: GIF target, see above.
  - `line_unread` on the spinner lines (0.4-0.5 s): the real spinner is that
    short. On the `--all` scroll: the scroll shows volume and is not meant to
    be read.
  - `contrast_aa_failure` 2.79:1 at 16.8 s: a row already scrolled out of
    the screen, clipped by the window. The visible dim text is about 4.9:1.
- Braille spinner frames and the note glyphs render through a fallback font
  (checked with `snapshot --zoom`).

## Only looked at

- Contact sheets for every beat and both seams. Cuts between scenes read as
  a `clear`: the window stays put and only its content changes.

## Weakest shot

- Phone width: at 360 px the 30 px terminal text is too small to read. A
  terminal at 80 columns is dense by nature. With more time: a second,
  cropped render at 60 columns for mobile, or a tighter GIF crop around the
  window.

## Re-rendering

The output was captured from `node cli.js` at the time of recording. After
changing the CLI's output, capture it again from the repository root and
rebuild the scenes (this overwrites `index.html` and `compositions/`):

```
python3 demo/scripts/capture.py demo/scripts/captures.json
python3 demo/scripts/build_demo.py demo/scripts demo
```

Then render the MP4 and the README GIF from `demo/`:

```
npm run render -- -o renders/camdict-demo.mp4 -q delivery
ffmpeg -i renders/camdict-demo.mp4 -vf "fps=15,scale=960:-1:flags=lanczos,split[a][b];[a]palettegen=max_colors=128:stats_mode=full[p];[b][p]paletteuse=dither=none:diff_mode=rectangle" -loop 0 ../docs/demo.gif
```
