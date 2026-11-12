GOAL:    a README visitor sees, in one loop, that camdict prints every meaning
         readably, plays the pronunciation, and can show everything, then
         knows the install command.
OUTPUT:  HyperFrames, 1920 x 1080, 30 fps; delivered as MP4 and as a
         960 px wide GIF for the GitHub README (GIFs carry no sound).
TIME:    17 s x 30 = 510 frames. Silent on purpose: the README embeds a GIF.
LOOK:    ground #7d8f7a flat sage, no texture. A macOS-style terminal window
         1540 x 1014 px, radius 14 px, shadow 0 24 px 60 px rgba(0,0,0,.35).
         Terminal bg #1c1e1f, ink #e8e4da, dim = ink at 55%, spinner cyan
         #6cc3c6 (the only accent, as in the real CLI). Title bar #2b2d2e,
         46 px, traffic-light dots, title "camdict" Inter 400 20 px #9a9893.
         Body IBM Plex Mono 30 px, line height 42 px, 80 columns x 22 rows.
OBJECTS: the terminal window and the CLI's real output, captured from
         `node cli.js` in an 80-column pty (styles from its ANSI codes).
MOTION:  typing in hard steps at 55 ms a character, caret solid while typing
         and blinking at 0.5 s when idle. Output appears at once, as a real
         terminal prints it. The --all output scrolls in line steps over 0.8 s.
         No eased moves anywhere: a terminal does not ease.
SHOTS:   lookup 0-5.8 s: type `camdict run -n 2`, spinner 0.5 s, the page of
           meanings; read hold 3.8 s.
         audio 5.8-10.8 s: type `camdict "wrap up" -a`, output, "Fetching",
           then "Playing pronunciation (AU)" with the note glyph alternating
           every 0.3 s for 2 s, line clears to a prompt.
         all 10.8-17 s: type `camdict run --all`, 120 lines scroll past, then
           type `npm i -g camdict` and hold 2.2 s on it.
BANNED:  dark void ground; glow; gradients; eased or sliding text; fake
         output that the CLI does not print; captions or titles over the
         terminal.
QA:      t=5.0 (whole run page readable), t=9.5 (playing line), t=12.6
         (scroll finished, prompt at bottom), t=16.8 (install command typed).
