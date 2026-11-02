#!/usr/bin/env node
// Topic in, explainer reel out.
//
//   npm run make -- "Why is the sky blue?"
//
// Options:
//   --new          ignore scripts/<slug>.json and ask Claude for a fresh script
//   --fresh-voice  re-generate the voice even if the narration hasn't changed
//   --no-render    stop after audio + timings (preview in `npx remotion studio`)

import "dotenv/config";
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";
import { getScript } from "./lib/script.mjs";
import { synthesize } from "./lib/voice.mjs";
import { buildTimeline } from "./lib/timeline.mjs";
import { checkFfmpeg, getDuration } from "./lib/ffmpeg.mjs";
import { renderVideo } from "./render.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

// ---------- read arguments ----------
const args = process.argv.slice(2);
const flags = new Set(args.filter((a) => a.startsWith("--")));
const topic = args.filter((a) => !a.startsWith("--")).join(" ").trim();

if (!topic) {
  console.error('Usage: npm run make -- "your topic" [--new] [--fresh-voice] [--no-render]');
  process.exit(1);
}

// "Why is the sky blue?" -> "why-is-the-sky-blue"
const slug = topic.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 60);

const style = JSON.parse(fs.readFileSync(path.join(ROOT, "style.json"), "utf8"));
const videoDir = path.join(ROOT, "public", "videos", slug);
fs.mkdirSync(videoDir, { recursive: true });

async function main() {
  // ---------- 0. preflight ----------
  const major = Number(process.versions.node.split(".")[0]);
  if (major < 18) throw new Error(`Node 18+ required (you have ${process.version}).`);
  checkFfmpeg();

  console.log(`\n▶ Topic: "${topic}"  (id: ${slug})`);

  // ---------- 1a. script ----------
  console.log("\n[1/4] Script");
  const script = await getScript({ topic, slug, style, root: ROOT, forceNew: flags.has("--new") });
  console.log(`  "${script.title}": ${script.scenes.length} scenes`);

  // ---------- 1b. voice + timings ----------
  console.log("\n[2/4] Voice");
  // All scenes are voiced in ONE request so the delivery flows naturally.
  const text = script.scenes.map((s) => s.narration.trim()).join(" ");
  const audioPath = path.join(videoDir, "voice.mp3");
  const wordsPath = path.join(videoDir, "words.json");

  // Skip the (paid) TTS call if nothing that affects the audio has changed.
  const mockMode = !process.env.ELEVENLABS_API_KEY || !process.env.ELEVENLABS_VOICE_ID;
  const hash = crypto
    .createHash("sha1")
    .update(JSON.stringify([text, style.voice, process.env.ELEVENLABS_VOICE_ID ?? "", mockMode]))
    .digest("hex");
  const cached = fs.existsSync(wordsPath) && JSON.parse(fs.readFileSync(wordsPath, "utf8"));

  let alignment, mock;
  if (cached?.hash === hash && fs.existsSync(audioPath) && !flags.has("--fresh-voice")) {
    console.log("  narration unchanged: reusing existing voice.mp3");
    ({ alignment, mock } = cached);
  } else {
    ({ alignment, mock } = await synthesize({ text, audioPath, style }));
  }

  // ---------- 1c. save timings ----------
  const audioDuration = getDuration(audioPath);
  const timeline = buildTimeline({ script, alignment, audioDuration, tailSeconds: style.video.tailSeconds, mock });

  fs.writeFileSync(wordsPath, JSON.stringify({ hash, mock, words: timeline.words, alignment }, null, 1));
  fs.writeFileSync(path.join(videoDir, "timeline.json"), JSON.stringify(timeline, null, 2));
  // Tells Remotion Studio which video to open by default.
  fs.writeFileSync(path.join(ROOT, "src", "latest.json"), JSON.stringify({ slug }, null, 2) + "\n");

  const [minSec, maxSec] = style.script.targetSeconds;
  console.log(`  audio: ${audioDuration.toFixed(1)}s, ${timeline.words.length} words${mock ? " (mock)" : ""}`);
  if (timeline.duration < minSec || timeline.duration > maxSec) {
    console.warn(`  ⚠ video is ${timeline.duration.toFixed(1)}s; target is ${minSec}-${maxSec}s. Edit scripts/${slug}.json to adjust.`);
  }
  console.log(`  saved public/videos/${slug}/{voice.mp3, words.json, timeline.json}`);

  // ---------- 2-4. render ----------
  if (flags.has("--no-render")) {
    console.log("\n✔ Done (render skipped). Preview with: npx remotion studio");
    return;
  }
  const out = await renderVideo(slug);
  console.log(`\n✔ Done: ${path.relative(ROOT, out)}`);
}

main().catch((err) => {
  console.error(`\n✖ ${err.message}`);
  process.exit(1);
});
