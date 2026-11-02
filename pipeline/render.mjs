#!/usr/bin/env node
// STEP 4: render a prepared video to MP4.
//
//   npm run render                      -> renders the most recent `make`
//   npm run render -- why-is-the-sky-blue
//
// 1. Remotion renders the frames + audio  -> out/<slug>/raw.mp4
// 2. FFmpeg normalizes loudness + faststart -> out/<slug>.mp4

import "dotenv/config";
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { finalize, getDuration } from "./lib/ffmpeg.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

export async function renderVideo(slug) {
  const timelinePath = path.join(ROOT, "public", "videos", slug, "timeline.json");
  if (!fs.existsSync(timelinePath)) {
    throw new Error(`No timeline for "${slug}". Run: npm run make -- "your topic"`);
  }

  const outDir = path.join(ROOT, "out");
  fs.mkdirSync(outDir, { recursive: true });
  const raw = path.join(outDir, `${slug}.raw.mp4`);
  const final = path.join(outDir, `${slug}.mp4`);

  console.log("\n[3/4] Render (Remotion)");
  const result = spawnSync(
    "npx",
    ["remotion", "render", "src/index.ts", "Explainer", raw, `--props=${JSON.stringify({ slug })}`],
    { cwd: ROOT, stdio: "inherit", env: process.env },
  );
  if (result.status !== 0) throw new Error("Remotion render failed (see output above).");

  console.log("\n[4/4] Finish (FFmpeg: loudness + faststart)");
  finalize(raw, final);
  fs.rmSync(raw);
  console.log(`  ${path.relative(ROOT, final)}: ${getDuration(final).toFixed(1)}s, 1080x1920`);
  return final;
}

// Run directly: `node pipeline/render.mjs [slug]`
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const slug =
    process.argv[2] ?? JSON.parse(fs.readFileSync(path.join(ROOT, "src", "latest.json"), "utf8")).slug;
  renderVideo(slug).catch((err) => {
    console.error(`\n✖ ${err.message}`);
    process.exit(1);
  });
}
