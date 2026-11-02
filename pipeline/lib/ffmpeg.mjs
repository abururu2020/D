// Small FFmpeg / FFprobe helpers. Requires both on your PATH.

import { execFileSync } from "node:child_process";

function run(cmd, args) {
  return execFileSync(cmd, args, { stdio: ["ignore", "pipe", "pipe"] }).toString();
}

export function checkFfmpeg() {
  try {
    run("ffmpeg", ["-version"]);
    run("ffprobe", ["-version"]);
  } catch {
    throw new Error("FFmpeg not found. Install it (macOS: `brew install ffmpeg`, Ubuntu: `sudo apt install ffmpeg`).");
  }
}

/** Length of an audio/video file in seconds. */
export function getDuration(file) {
  const out = run("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", file]);
  return parseFloat(out.trim());
}

/** Write a silent MP3 of the given length (used by mock voice mode). */
export function makeSilence(file, seconds) {
  run("ffmpeg", ["-y", "-f", "lavfi", "-i", "anullsrc=r=44100:cl=mono", "-t", seconds.toFixed(2), "-q:a", "9", file]);
}

/**
 * Final polish on Remotion's output:
 *  - loudnorm: evens out voice volume to the level social apps expect (-14 LUFS)
 *  - +faststart: the video starts playing before it has fully downloaded
 * The video stream is copied untouched (no quality loss, fast).
 */
export function finalize(input, output) {
  run("ffmpeg", [
    "-y", "-i", input,
    "-c:v", "copy",
    "-af", "loudnorm=I=-14:TP=-1.5:LRA=11",
    "-c:a", "aac", "-b:a", "192k", "-ar", "48000",
    "-movflags", "+faststart",
    output,
  ]);
}
