import json, re, html, sys, os
SP, OUT = sys.argv[1], sys.argv[2]
cap = json.load(open(os.path.join(SP, "captures.json")))
LH, ROWS = 42, 22
CHAR = 0.055

def ansi_to_html(line):
    out, st, pos = [], set(), 0
    def span(text):
        if not text: return ""
        t = html.escape(text)
        return f'<span class="{" ".join(sorted(st))}">{t}</span>' if st else t
    for m in re.finditer(r"\x1b\[([0-9;]*)m", line):
        out.append(span(line[pos:m.start()])); pos = m.end()
        for c in (m.group(1) or "0").split(";"):
            c = int(c or 0)
            if c == 0: st.clear()
            elif c == 1: st.add("b")
            elif c == 2: st.add("dim")
            elif c == 3: st.add("i")
            elif c == 7: st.add("inv")
            elif c == 22: st.discard("b"); st.discard("dim")
            elif c == 23: st.discard("i")
            elif c == 27: st.discard("inv")
    out.append(span(line[pos:]))
    return "".join(out) or "&#8203;"

def lines(key):
    ls = cap[key].rstrip("\n").split("\n")
    return [ansi_to_html(l) for l in ls]

CSS = """
  #root { position: absolute; inset: 0; background: #7d8f7a; }
  #root .win { position: absolute; left: 190px; top: 33px; width: 1540px; height: 1014px;
    border-radius: 14px; overflow: hidden; background: #1c1e1f;
    box-shadow: 0 24px 60px rgba(0,0,0,.35); }
  #root .bar { height: 46px; background: #2b2d2e; position: relative;
    font: 400 20px/46px Inter, sans-serif; color: #9a9893; text-align: center; }
  #root .dots { position: absolute; left: 20px; top: 16px; display: flex; gap: 9px; }
  #root .dots span { width: 14px; height: 14px; border-radius: 50%; }
  #root .screen { position: absolute; left: 50px; top: 68px; width: 1440px; height: 924px; overflow: hidden; }
  #root .scroll { position: absolute; left: 0; top: 0; width: 100%; }
  #root .row { height: 42px; font: 400 30px/42px "IBM Plex Mono", monospace; color: #e8e4da;
    white-space: pre; }
  #root .abs { position: absolute; left: 0; width: 100%; }
  #root .out { opacity: 0; }
  #root .b { font-weight: 700; }
  #root .i { font-style: italic; }
  #root .dim { color: rgba(232,228,218,.55); }
  #root .inv { background: #e8e4da; color: #1c1e1f; }
  #root .cyan { color: #6cc3c6; }
  #root .typed { display: inline-block; vertical-align: top; overflow: hidden;
    width: calc(var(--n, 0) * 1ch); }
  #root .caret { display: inline-block; vertical-align: top; width: 1ch; height: 36px;
    margin-top: 3px; background: #e8e4da; }
  #root .frame { position: absolute; left: 0; top: 0; opacity: 0; }
  #root .glyph { position: relative; display: inline-block; width: 1ch; height: 42px; vertical-align: top; }
"""

JS_HELPERS = """
  const tl = gsap.timeline({ paused: true });
  const CHAR = %s;
  function typeIn(sel, n, at) {
    tl.fromTo(sel, { "--n": 0 }, { "--n": n, duration: n * CHAR, ease: "steps(" + n + ")" }, at);
    return at + n * CHAR;
  }
  function blink(sel, from, to) {
    for (let t = from, k = 0; t < to; t += 0.5, k++) tl.set(sel, { opacity: k %% 2 ? 0 : 1 }, t);
  }
  function show(sel, at) { tl.set(sel, { opacity: 1 }, at); }
  function hide(sel, at) { tl.set(sel, { opacity: 0 }, at); }
  // Steps through overlapping glyph frames, like ora redrawing its spinner.
  function cycle(prefix, count, from, to, step) {
    let k = 0;
    for (let t = from; t < to - 1e-6; t += step, k++) {
      tl.set(prefix + (k %% count), { opacity: 1 }, t);
      tl.set(prefix + ((k + count - 1) %% count), { opacity: 0 }, t);
    }
    tl.set(prefix + ((k + count - 1) %% count), { opacity: 0 }, to);
  }
""" % CHAR

DOTS = "⠋⠙⠹⠸⠼⠴⠦⠧⠇⠏"

def glyph(id_prefix, chars, cls=""):
    spans = "".join(f'<span id="{id_prefix}{k}" class="frame {cls}">{html.escape(c)}</span>' for k, c in enumerate(chars))
    return f'<span class="glyph">{spans}</span>'

def prompt(pid, text=""):
    return (f'<div class="row" id="{pid}"><span>$ </span>'
            f'<span class="typed" id="{pid}-t">{html.escape(text)}</span>'
            f'<span class="caret" id="{pid}-c"></span></div>')

def window(sid, inner):
    return f"""<div class="win">
      <div class="bar" data-layout-ignore data-layout-allow-occlusion><div class="dots"><span style="background:#ff5f57"></span><span style="background:#febc2e"></span><span style="background:#28c840"></span></div>camdict</div>
      <div class="screen">{inner}</div>
    </div>"""

def scene(sid, dur, inner, script):
    return f"""<template>
  <style>{CSS}</style>
  <div id="root" data-composition-id="{sid}" data-width="1920" data-height="1080">
    {window(sid, inner)}
  </div>
  <script>{JS_HELPERS}
{script}
    window.__timelines["{sid}"] = tl;
  </script>
</template>
"""

def out_rows(cls, ls, first_row):
    return "\n".join(f'<div class="row out {cls}">{l}</div>' for l in ls)

# Scene 1: lookup
run = lines("run")
cmd1 = "camdict run -n 2"
inner1 = f"""
  {prompt("l-p1", cmd1)}
  <div class="row abs out" id="l-spin" style="top:{LH}px">{glyph("l-sp", DOTS, "cyan")} Searching in dictionary...</div>
  {out_rows("l-out", run, 1)}
  <div class="row out l-out" id="l-p2"><span>$ </span><span class="caret" id="l-p2-c"></span></div>
"""
js1 = f"""
  blink("#l-p1-c", 0, 0.4);
  tl.set("#l-p1-c", {{ opacity: 1 }}, 0.4);
  const typed1 = typeIn("#l-p1-t", {len(cmd1)}, 0.4);
  hide("#l-p1-c", 1.5);
  show("#l-spin", 1.5);
  cycle("#l-sp", 10, 1.5, 2.0, 0.08);
  hide("#l-spin", 2.0);
  show(".l-out", 2.0);
  blink("#l-p2-c", 2.0, 5.8);
"""

# Scene 2: audio
wrap = lines("wrap")
cmd2 = 'camdict "wrap up" -a'
play_row = 1 + len(wrap)
inner2 = f"""
  {prompt("a-p1", cmd2)}
  <div class="row abs out" id="a-spin" style="top:{LH}px">{glyph("a-sp", DOTS, "cyan")} Searching in dictionary...</div>
  {out_rows("a-out", wrap, 1)}
  <div class="row abs out" id="a-fetch" style="top:{play_row*LH}px">{glyph("a-fp", DOTS, "cyan")} Fetching pronunciation...</div>
  <div class="row abs out" id="a-play" style="top:{play_row*LH}px">{glyph("a-pl", "♪♫", "cyan")} Playing pronunciation (AU)...</div>
  <div class="row abs out" id="a-p2" style="top:{play_row*LH}px"><span>$ </span><span class="caret" id="a-p2-c"></span></div>
"""
js2 = f"""
  blink("#a-p1-c", 0, 0.3);
  tl.set("#a-p1-c", {{ opacity: 1 }}, 0.3);
  typeIn("#a-p1-t", {len(cmd2)}, 0.3);
  hide("#a-p1-c", 1.6);
  show("#a-spin", 1.6);
  cycle("#a-sp", 10, 1.6, 2.0, 0.08);
  hide("#a-spin", 2.0);
  show(".a-out", 2.0);
  show("#a-fetch", 2.0);
  cycle("#a-fp", 10, 2.0, 2.4, 0.08);
  hide("#a-fetch", 2.4);
  show("#a-play", 2.4);
  cycle("#a-pl", 2, 2.4, 4.4, 0.3);
  hide("#a-play", 4.4);
  show("#a-p2", 4.4);
  blink("#a-p2-c", 4.4, 5.8);
"""

# Scene 3: all
allr = lines("all")
cmd3 = "camdict run --all"
cmd4 = "npm i -g camdict"
total = 1 + len(allr) + 1
scroll_rows = total - ROWS
inner3 = f"""
  <div class="scroll" id="w-scroll" data-layout-allow-overflow>
  {prompt("w-p1", cmd3)}
  <div class="row abs out" id="w-spin" style="top:{LH}px">{glyph("w-sp", DOTS, "cyan")} Searching in dictionary...</div>
  {out_rows("w-out", allr, 1)}
  <div class="row out w-out" id="w-p2"><span>$ </span><span class="typed" id="w-p2-t">{cmd4}</span><span class="caret" id="w-p2-c"></span></div>
  </div>
"""
js3 = f"""
  blink("#w-p1-c", 0, 0.3);
  tl.set("#w-p1-c", {{ opacity: 1 }}, 0.3);
  typeIn("#w-p1-t", {len(cmd3)}, 0.3);
  hide("#w-p1-c", 1.4);
  show("#w-spin", 1.4);
  cycle("#w-sp", 10, 1.4, 1.8, 0.08);
  hide("#w-spin", 1.8);
  show(".w-out", 1.8);
  tl.fromTo("#w-scroll", {{ y: 0 }}, {{ y: {-scroll_rows*LH}, duration: 0.8, ease: "steps({scroll_rows})" }}, 1.8);
  blink("#w-p2-c", 2.6, 3.0);
  tl.set("#w-p2-c", {{ opacity: 1 }}, 3.0);
  const typed4 = typeIn("#w-p2-t", {len(cmd4)}, 3.0);
  blink("#w-p2-c", typed4 + 0.3, 6.2);
"""

os.makedirs(os.path.join(OUT, "compositions"), exist_ok=True)
for sid, dur, inner, js in [("lookup", 5.8, inner1, js1), ("audio", 5.8, inner2, js2), ("all", 6.2, inner3, js3)]:
    open(os.path.join(OUT, "compositions", f"{sid}.html"), "w").write(scene(sid, dur, inner, js))

hosts = ""
t = 0
for i, (sid, dur) in enumerate([("lookup", 5.8), ("audio", 5.8), ("all", 6.2)]):
    hosts += f"""
      <div id="{sid}" data-composition-id="{sid}" data-composition-src="compositions/{sid}.html"
        data-start="{round(t,2)}" data-duration="{dur}" data-track-index="1" data-track-kind="graphics"
        data-width="1920" data-height="1080"></div>"""
    t += dur
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
    <div id="root" data-composition-id="main" data-start="0" data-duration="{round(t,2)}"
      data-width="1920" data-height="1080">{hosts}
    </div>
    <script>
      window.__timelines = window.__timelines || {{}};
      window.__timelines["main"] = gsap.timeline({{ paused: true }});
    </script>
  </body>
</html>
"""
open(os.path.join(OUT, "index.html"), "w").write(index)
print("total", t, "s; scroll rows", scroll_rows, "; audio play row", play_row)
