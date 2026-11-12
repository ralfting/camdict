"""Build the three README lesson videos from captured camdict output.

Run from the repository root:
  python3 demo/scripts/build_demo.py demo/scripts/captures.json demo

Writes index.html and compositions/ inside demo/basics, demo/audio and
demo/options, overwriting them.
"""
import html
import json
import os
import re
import sys

CAPTURES, OUT = sys.argv[1], sys.argv[2]
cap = json.load(open(CAPTURES))

# Layout, in px at 1920 x 1080.
LH = 46            # terminal line height (34 px IBM Plex Mono, 60 columns)
ROWS = 15          # visible terminal rows
CHAR = 0.06        # seconds per typed character
ACCENT = "#f2c14e"
WIN = {"left": 300, "top": 220, "width": 1320, "height": 820}
SCREEN_TOP = 66    # title bar 46 + padding 20

SPINNER = "⠋⠙⠹⠸⠼⠴⠦⠧⠇⠏"


def ansi_to_html(line):
    """Convert one line of SGR-styled text to spans with matching classes."""
    out, styles, pos = [], set(), 0

    def span(text):
        if not text:
            return ""
        escaped = html.escape(text)
        if not styles:
            return escaped
        return f'<span class="{" ".join(sorted(styles))}">{escaped}</span>'

    codes = {1: ("add", "b"), 2: ("add", "dim"), 3: ("add", "i"), 7: ("add", "inv"),
             22: ("del", "b dim"), 23: ("del", "i"), 27: ("del", "inv")}
    for match in re.finditer(r"\x1b\[([0-9;]*)m", line):
        out.append(span(line[pos:match.start()]))
        pos = match.end()
        for code in (match.group(1) or "0").split(";"):
            code = int(code or 0)
            if code == 0:
                styles.clear()
            elif code in codes:
                action, names = codes[code]
                for name in names.split():
                    styles.add(name) if action == "add" else styles.discard(name)
    out.append(span(line[pos:]))
    return "".join(out) or "&#8203;"


def output_lines(key):
    return [ansi_to_html(line) for line in cap[key].rstrip("\n").split("\n")]


CSS = f"""
  #root {{ position: absolute; inset: 0; background: #7d8f7a; }}
  #root .cap {{ position: absolute; left: {WIN['left']}px; top: 92px; width: {WIN['width']}px;
    font: 700 54px/66px Inter, sans-serif; color: #14201a; letter-spacing: -0.01em; }}
  #root .chip {{ font: 600 48px/66px "IBM Plex Mono", monospace; color: {ACCENT};
    background: #1c1e1f; border-radius: 10px; padding: 0 14px; }}
  #root .win {{ position: absolute; left: {WIN['left']}px; top: {WIN['top']}px;
    width: {WIN['width']}px; height: {WIN['height']}px; border-radius: 14px; overflow: hidden;
    background: #1c1e1f; box-shadow: 0 24px 60px rgba(0,0,0,.35); }}
  #root .bar {{ height: 46px; background: #2b2d2e; position: relative;
    font: 400 20px/46px Inter, sans-serif; color: #9a9893; text-align: center; }}
  #root .dots {{ position: absolute; left: 20px; top: 16px; display: flex; gap: 9px; }}
  #root .dots span {{ width: 14px; height: 14px; border-radius: 50%; }}
  #root .screen {{ position: absolute; left: 48px; top: {SCREEN_TOP}px; width: 1224px;
    height: {ROWS * LH}px; overflow: hidden; }}
  #root .scroll {{ position: absolute; left: 0; top: 0; width: 100%; }}
  #root .row {{ height: {LH}px; font: 400 34px/{LH}px "IBM Plex Mono", monospace;
    color: #e8e4da; white-space: pre; }}
  #root .abs {{ position: absolute; left: 0; width: 100%; }}
  #root .out {{ opacity: 0; }}
  #root .b {{ font-weight: 700; }}
  #root .i {{ font-style: italic; }}
  #root .dim {{ color: rgba(232,228,218,.55); }}
  #root .inv {{ background: #e8e4da; color: #1c1e1f; }}
  #root .cyan {{ color: #6cc3c6; }}
  #root .flag {{ border-radius: 6px; }}
  #root .typed {{ display: inline-block; vertical-align: top; overflow: hidden;
    width: calc(var(--n, 0) * 1ch); }}
  #root .caret {{ display: inline-block; vertical-align: top; width: 1ch; height: 40px;
    margin-top: 3px; background: #e8e4da; }}
  #root .glyph {{ position: relative; display: inline-block; width: 1ch; height: {LH}px;
    vertical-align: top; }}
  #root .frame {{ position: absolute; left: 0; top: 0; opacity: 0; }}
  #root .speaker {{ position: absolute; left: {WIN['left'] + WIN['width'] + 44}px; width: 150px;
    height: 150px; opacity: 0; }}
  #root .speaker .wave {{ opacity: 0.2; }}
"""

JS_HELPERS = f"""
  const tl = gsap.timeline({{ paused: true }});
  const CHAR = {CHAR};
  function typeIn(sel, n, at) {{
    tl.fromTo(sel, {{ "--n": 0 }}, {{ "--n": n, duration: n * CHAR, ease: "steps(" + n + ")" }}, at);
    return at + n * CHAR;
  }}
  function blink(sel, from, to) {{
    for (let t = from, k = 0; t < to - 1e-6; t += 0.5, k++) tl.set(sel, {{ opacity: k % 2 ? 0 : 1 }}, t);
  }}
  function show(sel, at) {{ tl.set(sel, {{ opacity: 1 }}, at); }}
  function hide(sel, at) {{ tl.set(sel, {{ opacity: 0 }}, at); }}
  // Steps through overlapping glyph frames, the way ora redraws its spinner.
  function cycle(prefix, count, from, to, step) {{
    let k = 0;
    for (let t = from; t < to - 1e-6; t += step, k++) {{
      tl.set(prefix + (k % count), {{ opacity: 1 }}, t);
      tl.set(prefix + ((k + count - 1) % count), {{ opacity: 0 }}, t);
    }}
    tl.set(prefix + ((k + count - 1) % count), {{ opacity: 0 }}, to);
  }}
"""


def glyph(prefix, chars):
    frames = "".join(
        f'<span id="{prefix}{k}" class="frame cyan">{html.escape(c)}</span>'
        for k, c in enumerate(chars)
    )
    return f'<span class="glyph">{frames}</span>'


def command_html(parts):
    """parts: list of (text, is_flag). Flags get a span the timeline highlights."""
    return "".join(
        f'<span class="flag">{html.escape(text)}</span>' if flag else html.escape(text)
        for text, flag in parts
    )


def speaker_svg(sid, top):
    return f"""<svg class="speaker" id="{sid}-spk" style="top:{top}px" viewBox="0 0 150 150">
      <path d="M18 56 H46 L82 26 V124 L46 94 H18 Z" fill="#1c1e1f"/>
      <path id="{sid}-w0" class="wave" d="M98 58 Q110 75 98 92" stroke="#1c1e1f" stroke-width="9" fill="none" stroke-linecap="round"/>
      <path id="{sid}-w1" class="wave" d="M112 44 Q132 75 112 106" stroke="#1c1e1f" stroke-width="9" fill="none" stroke-linecap="round"/>
      <path id="{sid}-w2" class="wave" d="M126 30 Q154 75 126 120" stroke="#1c1e1f" stroke-width="9" fill="none" stroke-linecap="round"/>
    </svg>"""


def step(sid, caption, parts, out_key, mode="plain", hold=3.6):
    """One lesson step: caption, typed command, spinner, real output, prompt.

    mode: "plain", "audio" (fetch and play lines with a speaker), or
    "scroll" (output longer than the screen scrolls to its end).
    Returns (html, duration).
    """
    cmd = "".join(text for text, _ in parts)
    lines = output_lines(out_key)
    end_row = 1 + len(lines)          # row after the output
    js = []
    js.append(f'tl.fromTo("#{sid}-cap", {{ opacity: 0, filter: "blur(8px)" }}, '
              f'{{ opacity: 1, filter: "blur(0px)", duration: 0.2, ease: "power4.out" }}, 0.1);')
    js.append(f'blink("#{sid}-c1", 0, 0.7);')
    js.append(f'tl.set("#{sid}-c1", {{ opacity: 1 }}, 0.7);')
    typed_end = 0.7 + len(cmd) * CHAR
    js.append(f'typeIn("#{sid}-t1", {len(cmd)}, 0.7);')
    if any(flag for _, flag in parts):
        js.append(f'tl.fromTo("#{sid}-win .flag", {{ color: "#e8e4da", backgroundColor: "rgba(242,193,78,0)" }}, '
                  f'{{ color: "{ACCENT}", backgroundColor: "rgba(242,193,78,0.18)", duration: 0.2, ease: "power2.out" }}, {typed_end + 0.1:.2f});')
    enter = typed_end + 0.6
    out_at = enter + 0.4
    js.append(f'hide("#{sid}-c1", {enter:.2f});')
    js.append(f'show("#{sid}-spin", {enter:.2f});')
    js.append(f'cycle("#{sid}-sp", 10, {enter:.2f}, {out_at:.2f}, 0.08);')
    js.append(f'hide("#{sid}-spin", {out_at:.2f});')
    js.append(f'show(".{sid}-out", {out_at:.2f});')

    extra = ""
    prompt_at = out_at
    if mode == "audio":
        fetch_end, play_end = out_at + 0.4, out_at + 3.0
        top = SCREEN_TOP + end_row * LH
        extra = (f'<div class="row abs out" id="{sid}-fetch" style="top:{end_row * LH}px">{glyph(sid + "-fp", SPINNER)} Fetching pronunciation...</div>'
                 f'<div class="row abs out" id="{sid}-play" style="top:{end_row * LH}px">{glyph(sid + "-pl", "♪♫")} Playing pronunciation (US)...</div>')
        js.append(f'show("#{sid}-fetch", {out_at:.2f});')
        js.append(f'cycle("#{sid}-fp", 10, {out_at:.2f}, {fetch_end:.2f}, 0.08);')
        js.append(f'hide("#{sid}-fetch", {fetch_end:.2f});')
        js.append(f'show("#{sid}-play", {fetch_end:.2f});')
        js.append(f'cycle("#{sid}-pl", 2, {fetch_end:.2f}, {play_end:.2f}, 0.3);')
        js.append(f'hide("#{sid}-play", {play_end:.2f});')
        js.append(f'tl.fromTo("#{sid}-spk", {{ opacity: 0, scale: 0.85 }}, {{ opacity: 1, scale: 1, duration: 0.3, ease: "back.out(1.4)" }}, {fetch_end:.2f});')
        t, k = fetch_end + 0.15, 0
        while t < play_end - 1e-6:
            js.append(f'tl.set("#{sid}-w{k % 3}", {{ opacity: 1 }}, {t:.2f});')
            if k % 3 == 2:
                js.append(f'tl.set("#{sid}-w0, #{sid}-w1, #{sid}-w2", {{ opacity: 0.2 }}, {t + 0.15:.2f});')
            t, k = t + 0.15, k + 1
        js.append(f'tl.to("#{sid}-spk", {{ opacity: 0, duration: 0.2, ease: "power2.in" }}, {play_end:.2f});')
        prompt_at = play_end
        extra += speaker_svg(sid, WIN["top"] + top - 52)
    if mode == "scroll":
        scroll_rows = end_row + 1 - ROWS
        js.append(f'tl.fromTo("#{sid}-scroll", {{ y: 0 }}, {{ y: {-scroll_rows * LH}, duration: 1.6, ease: "steps({scroll_rows})" }}, {out_at + 0.4:.2f});')
        prompt_at = out_at + 2.0

    prompt_style = f'style="top:{end_row * LH}px"' if mode == "audio" else ""
    prompt_cls = "row abs out" if mode == "audio" else f"row out {sid}-out"
    js.append(f'show("#{sid}-p2", {prompt_at:.2f});')
    duration = round(prompt_at + hold, 2)
    js.append(f'blink("#{sid}-c2", {prompt_at:.2f}, {duration});')

    rows = "\n".join(f'<div class="row out {sid}-out">{line}</div>' for line in lines)
    scroll_open = f'<div class="scroll" id="{sid}-scroll" data-layout-allow-overflow>' if mode == "scroll" else ""
    scroll_close = "</div>" if mode == "scroll" else ""
    screen = f"""{scroll_open}
      <div class="row"><span>$ </span><span class="typed" id="{sid}-t1">{command_html(parts)}</span><span class="caret" id="{sid}-c1"></span></div>
      <div class="row abs out" id="{sid}-spin" style="top:{LH}px">{glyph(sid + "-sp", SPINNER)} Searching in dictionary...</div>
      {rows}
      <div class="{prompt_cls}" id="{sid}-p2" {prompt_style}><span>$ </span><span class="caret" id="{sid}-c2"></span></div>
      {scroll_close}"""
    speaker = ""
    if mode == "audio":
        speaker, extra = extra[extra.index("<svg"):], extra[:extra.index("<svg")]
    doc = f"""<template>
  <style>{CSS}</style>
  <div id="root" data-composition-id="{sid}" data-width="1920" data-height="1080">
    <div class="cap" id="{sid}-cap">{caption}</div>
    <div class="win" id="{sid}-win">
      <div class="bar" data-layout-ignore data-layout-allow-occlusion><div class="dots"><span style="background:#ff5f57"></span><span style="background:#febc2e"></span><span style="background:#28c840"></span></div>camdict</div>
      <div class="screen">{screen}{extra}</div>
    </div>
    {speaker}
  </div>
  <script>{JS_HELPERS}
  {chr(10).join("  " + line for line in js)}
    window.__timelines["{sid}"] = tl;
  </script>
</template>
"""
    return doc, duration


def chip(text):
    return f'<span class="chip">{html.escape(text)}</span>'


LESSONS = {
    "basics": [
        ("look", "Look up any English word", [("camdict pizza", False)], "pizza", "plain", 3.6),
        ("phrase", f"Put phrases in quotes", [("camdict ", False), ('"give up"', True)], "giveup", "plain", 3.8),
    ],
    "audio": [
        ("hear", f"Add {chip('-a')} to hear the pronunciation",
         [("camdict wonderful ", False), ("-a", True)], "wonderful", "audio", 2.6),
    ],
    "options": [
        ("fewer", f"Show fewer definitions with {chip('-n')}",
         [("camdict library ", False), ("-n 1", True)], "library1", "plain", 3.6),
        ("every", f"Show every definition with {chip('--all')}",
         [("camdict library ", False), ("--all", True)], "libraryall", "scroll", 2.6),
    ],
}

for lesson, steps in LESSONS.items():
    base = os.path.join(OUT, lesson)
    os.makedirs(os.path.join(base, "compositions"), exist_ok=True)
    hosts, t = "", 0.0
    for sid, caption, parts, key, mode, hold in steps:
        doc, duration = step(sid, caption, parts, key, mode, hold)
        open(os.path.join(base, "compositions", f"{sid}.html"), "w").write(doc)
        hosts += f"""
      <div id="{sid}" data-composition-id="{sid}" data-composition-src="compositions/{sid}.html"
        data-start="{round(t, 2)}" data-duration="{duration}" data-track-index="1"
        data-track-kind="graphics" data-width="1920" data-height="1080"></div>"""
        t += duration
    index = f"""<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=1920, height=1080" />
    <script src="https://cdn.jsdelivr.net/npm/gsap@3.15.0/dist/gsap.min.js"></script>
    <style>
      * {{ margin: 0; padding: 0; box-sizing: border-box; }}
      html, body {{ margin: 0; width: 1920px; height: 1080px; overflow: hidden; background: #7d8f7a; }}
    </style>
  </head>
  <body>
    <div id="root" data-composition-id="main" data-start="0" data-duration="{round(t, 2)}"
      data-width="1920" data-height="1080">{hosts}
    </div>
    <script>
      window.__timelines = window.__timelines || {{}};
      window.__timelines["main"] = gsap.timeline({{ paused: true }});
    </script>
  </body>
</html>
"""
    open(os.path.join(base, "index.html"), "w").write(index)
    print(f"{lesson}: {round(t, 2)} s")
