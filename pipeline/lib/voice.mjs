// STEP 1b: turn the narration into speech + per-character timings.
//
// Real mode: ElevenLabs "with-timestamps" endpoint. It returns the MP3 (base64)
// and, for every character of the text, when it starts and ends (in seconds).
// Docs: https://elevenlabs.io/docs/api-reference/text-to-speech/convert-with-timestamps
//
// Mock mode (no API key): a silent MP3 + timings estimated from word length.
// Both modes return the same shape, so everything downstream works the same.

import fs from "node:fs";
import { makeSilence } from "./ffmpeg.mjs";

/**
 * @returns {Promise<{ alignment: { characters: string[], character_start_times_seconds: number[], character_end_times_seconds: number[] }, mock: boolean }>}
 */
export async function synthesize({ text, audioPath, style }) {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  const voiceId = process.env.ELEVENLABS_VOICE_ID;

  if (!apiKey || !voiceId) {
    console.log("  ⚠ ELEVENLABS_API_KEY / ELEVENLABS_VOICE_ID not set: using MOCK voice (silent, estimated timings)");
    const alignment = estimateAlignment(text, style.script.wordsPerSecond);
    const duration = alignment.character_end_times_seconds.at(-1) ?? 1;
    makeSilence(audioPath, duration + 0.2);
    return { alignment, mock: true };
  }

  const v = style.voice;
  const url =
    `https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(voiceId)}/with-timestamps` +
    `?output_format=mp3_44100_128`;

  const res = await fetch(url, {
    method: "POST",
    headers: { "xi-api-key": apiKey, "Content-Type": "application/json" },
    body: JSON.stringify({
      text,
      model_id: v.modelId,
      voice_settings: {
        stability: v.stability,
        similarity_boost: v.similarityBoost,
        style: v.style,
        speed: v.speed,
      },
    }),
  });

  if (!res.ok) {
    throw new Error(`ElevenLabs error ${res.status}: ${await res.text()}`);
  }

  const data = await res.json();
  fs.writeFileSync(audioPath, Buffer.from(data.audio_base64, "base64"));

  // "alignment" matches the text we sent character-for-character, which is what
  // we need to map words back to scenes. (normalized_alignment may differ.)
  return { alignment: data.alignment, mock: false };
}

// Fake per-character timings: words take time proportional to their length,
// with short pauses after commas and longer ones after sentence ends.
function estimateAlignment(text, wordsPerSecond) {
  const characters = [...text];
  const starts = [];
  const ends = [];

  const avgWordLen = 5.5;
  const secondsPerChar = 1 / (wordsPerSecond * (avgWordLen + 1));
  let t = 0.15; // small lead-in

  for (let i = 0; i < characters.length; i++) {
    const ch = characters[i];
    starts.push(t);
    t += secondsPerChar;
    if (/[,;:]/.test(ch)) t += 0.18;
    if (/[.!?]/.test(ch)) t += 0.35;
    ends.push(t);
  }
  return { characters, character_start_times_seconds: starts, character_end_times_seconds: ends };
}
