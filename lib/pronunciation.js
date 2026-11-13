const { spawn } = require("child_process");
const fs = require("fs/promises");
const os = require("os");
const path = require("path");
const { startSpinner } = require("./output");
const USER_AGENT = require("./user-agent");

// Recordings with audio, US first since it is the most common accent asked for.
function getRecordings(entries) {
  const recordings = entries
    .flatMap((entry) => entry.phonetics || [])
    .filter(({ audio }) => audio);
  const isUs = ({ audio }) => /-us\.mp3$/.test(audio);

  return [
    ...recordings.filter(isUs),
    ...recordings.filter((recording) => !isUs(recording)),
  ];
}

// The dictionary API's own media host stopped serving files, but every
// recording links to its Wikimedia Commons page, which provides an MP3.
async function getCommonsMp3Url(sourceUrl) {
  const match = /[?&]curid=(\d+)/.exec(sourceUrl || "");

  if (!match) {
    return null;
  }

  const response = await fetch(
    "https://commons.wikimedia.org/w/api.php?action=query&format=json" +
      `&prop=videoinfo&viprop=url|mime|derivatives&pageids=${match[1]}`,
    { headers: { "User-Agent": USER_AGENT } }
  );

  if (!response.ok) {
    return null;
  }

  const { query } = await response.json();
  const page = query && query.pages && query.pages[match[1]];
  const info = page && page.videoinfo && page.videoinfo[0];

  if (!info) {
    return null;
  }

  if (info.mime === "audio/mpeg") {
    return info.url;
  }

  const mp3 = (info.derivatives || []).find(
    ({ type }) => type === "audio/mpeg"
  );

  return mp3 ? mp3.src : null;
}

// Recordings are named like "run-us.mp3" or "house-1-uk.mp3".
function getAccent(audioUrl) {
  const match = /-([a-z]{2})\.mp3$/.exec(audioUrl);

  return match ? match[1].toUpperCase() : null;
}

async function downloadPronunciation(entries) {
  for (const { audio, sourceUrl } of getRecordings(entries)) {
    const urls = [await getCommonsMp3Url(sourceUrl).catch(() => null), audio];

    for (const url of urls.filter(Boolean)) {
      const response = await fetch(url, {
        headers: { "User-Agent": USER_AGENT },
      }).catch(() => null);

      if (response && response.ok) {
        return {
          sound: Buffer.from(await response.arrayBuffer()),
          accent: getAccent(audio),
        };
      }
    }
  }

  return null;
}

const AUDIO_PLAYERS = [
  ...(process.platform === "darwin" ? [["afplay"]] : []),
  ["mpg123", "-q"],
  ["ffplay", "-nodisp", "-autoexit", "-loglevel", "quiet"],
  ["mpv", "--no-video", "--really-quiet"],
];

async function playPronunciation(entries) {
  const spinner = startSpinner("Fetching pronunciation...");
  const recording = await downloadPronunciation(entries).catch((error) => {
    spinner.stop();
    throw error;
  });

  if (!recording) {
    spinner.stop();
    console.warn("\nNo pronunciation audio available for this word.");
    return;
  }

  const file = path.join(os.tmpdir(), `camdict-${process.pid}.mp3`);
  await fs.writeFile(file, recording.sound);

  // Keep a line on screen while the player runs; it is silent otherwise.
  const accent = recording.accent ? ` (${recording.accent})` : "";
  spinner.spinner = { interval: 300, frames: ["♪", "♫"] };
  spinner.text = `Playing pronunciation${accent}...`;

  try {
    for (const [command, ...args] of AUDIO_PLAYERS) {
      if (await runPlayer(command, [...args, file])) {
        return;
      }
    }

    spinner.stop();
    console.warn(
      "\nNo audio player found. Install mpg123, ffmpeg (ffplay) or mpv to hear pronunciations."
    );
  } finally {
    spinner.stop();
    await fs.rm(file, { force: true });
  }
}

// Resolves false when the player is not installed so the next one is tried.
function runPlayer(command, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { stdio: "ignore" });

    child.on("error", (error) =>
      error.code === "ENOENT" ? resolve(false) : reject(error)
    );
    child.on("close", (code) =>
      code === 0
        ? resolve(true)
        : reject(new Error(`${command} exited with code ${code}`))
    );
  });
}

module.exports = { playPronunciation };
