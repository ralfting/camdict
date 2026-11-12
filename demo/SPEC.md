GOAL:    a README visitor learns one camdict command per video, fast enough to
         copy it: basics (a word, then a phrase), audio (-a) and options
         (-n, --all).
OUTPUT:  three HyperFrames projects (basics/, audio/, options/), 1920 x 1080,
         30 fps; delivered as 960 px GIFs in docs/ (GIFs carry no sound).
TIME:    basics 12.6 s, audio 8.5 s, options 14.1 s. Silent on purpose.
LOOK:    ground #7d8f7a flat sage. Caption Inter 700 54 px #14201a, left-aligned
         with the terminal at x 300, top 92 px; flags in the caption are chips
         (IBM Plex Mono 600 48 px, #f2c14e on #1c1e1f). Terminal window
         1320 x 820 at (300, 220), radius 14, shadow 0 24 60 rgba(0,0,0,.35);
         IBM Plex Mono 34 px, line height 46 px, 60 columns x 15 rows,
         bg #1c1e1f, ink #e8e4da, dim ink at 55%, spinner cyan #6cc3c6.
         Accent #f2c14e appears only on the flag being taught: its caption
         chip and the same characters in the typed command.
OBJECTS: the terminal and camdict's real output, captured from `node cli.js`
         in a 60-column pty; a speaker drawn with three sound waves.
MOTION:  caption blurs in (8 px to 0, 0.2 s, power4.out). Typing in hard steps
         at 60 ms a character; the flag lights up 0.1 s after typing ends and
         Enter comes 0.5 s later. Output appears at once, as a terminal prints
         it. The speaker pops in with back.out(1.4) and its waves light in
         sequence every 0.15 s while the "Playing" line shows.
SHOTS:   basics: "Look up any English word" / camdict pizza; "Put phrases in
           quotes" / camdict "give up", quotes highlighted.
         audio: "Add -a to hear the pronunciation" / camdict wonderful -a,
           Fetching, then Playing (US) for 2.6 s beside the speaker.
         options: "Show fewer definitions with -n" / camdict library -n 1;
           "Show every definition with --all" / camdict library --all scrolls
           to its last definition.
BANNED:  dark void ground; glow; gradients; eased or sliding terminal text;
         output the CLI does not print; words whose definitions are
         offensive (tea, apple, banana and cookie were rejected for this).
QA:      every step's output frame readable at 960 px; the speaker visible
         while audio plays; the last frame of each video is a finished screen.
