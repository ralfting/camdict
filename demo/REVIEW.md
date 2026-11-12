# Review

## Creative calls

- One lesson per video, one command per step, each with a caption that says
  what the command does. The flag being taught has the same accent colour in
  the caption and in the typed command.
- Words were picked so each step fits one screen without scrolling (10 to 13
  lines of output) and has no offensive definitions. "tea" (cannabis),
  "apple" and "banana" (ethnic slurs) and "cookie" (sexual and drug senses)
  were rejected after reading their full output.
- GIFs carry no sound, so the audio lesson shows a speaker with moving waves
  next to the real "Playing pronunciation" line.

## Measured

- `hyperframes check` passes for all three. Kept warnings:
  - `line_unread` on spinner lines (0.4 s, the real spinner's length) and on
    the `--all` scroll, which shows volume rather than text to read.
  - `contrast_aa_failure` on rows already scrolled out of the screen and
    clipped by the window. Visible dim text is about 4.9:1.
- Glyphs (braille spinner, notes) render through a fallback font.

## Only looked at

- Contact sheets of every step and a frame of the converted audio GIF.

## Weakest shot

- The `--all` step ends scrolled past the header, so the "1 of 8" against
  "all 8" contrast relies on the numbering 1 to 8 being visible.

## Re-rendering

After the CLI's output changes, from the repository root:

```
python3 demo/scripts/capture.py demo/scripts/captures.json
python3 demo/scripts/build_demo.py demo/scripts/captures.json demo
```

Then in each of `demo/basics`, `demo/audio` and `demo/options`:

```
npx hyperframes render -o renders/<name>.mp4 -q delivery
ffmpeg -i renders/<name>.mp4 -vf "fps=15,scale=960:-1:flags=lanczos,split[a][b];[a]palettegen=max_colors=128:stats_mode=full[p];[b][p]paletteuse=dither=none:diff_mode=rectangle" -loop 0 ../../docs/demo-<name>.gif
```
