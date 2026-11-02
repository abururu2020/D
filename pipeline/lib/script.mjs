// STEP 1a: get a script (5-7 scenes, each with narration + visual description).
//
// Where the script comes from, in order:
//   1. scripts/<slug>.json, if it exists. Edit this file by hand to tweak a script.
//   2. Claude (if ANTHROPIC_API_KEY is set). The result is saved to scripts/<slug>.json.
//   3. Otherwise: an error explaining how to write the file yourself.
//
// Script format (see scripts/why-is-the-sky-blue.json for a full example):
// {
//   "title": "Why is the sky blue?",
//   "scenes": [
//     {
//       "narration": "Ever wondered why the sky is blue?",
//       "visual": "A bright sky with a big question mark",       // description, for humans
//       "elements": [                                             // what's drawn on screen
//         { "kind": "emoji",    "text": "🌤️", "label": "", "cue": "sky" },
//         { "kind": "headline", "text": "Why blue?", "label": "", "cue": "blue" }
//       ]
//     }
//   ]
// }
// Each element appears on the spoken word in "cue" (it must be a word in that scene's narration).

import fs from "node:fs";
import path from "node:path";
import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";

export const ELEMENT_KINDS = ["emoji", "headline", "stat", "bullet"];

// The shape Claude must return. Structured outputs guarantee valid JSON in this shape.
const ScriptSchema = z.object({
  title: z.string(),
  scenes: z.array(
    z.object({
      narration: z.string(),
      visual: z.string(),
      elements: z.array(
        z.object({
          kind: z.enum(ELEMENT_KINDS),
          text: z.string(),
          label: z.string(),
          cue: z.string(),
        }),
      ),
    }),
  ),
});

export async function getScript({ topic, slug, style, root, forceNew }) {
  const file = path.join(root, "scripts", `${slug}.json`);

  if (fs.existsSync(file) && !forceNew) {
    console.log(`  using existing script: scripts/${slug}.json`);
    return validateScript(JSON.parse(fs.readFileSync(file, "utf8")), style);
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error(
      `No script found at scripts/${slug}.json and ANTHROPIC_API_KEY is not set.\n` +
        `Either add ANTHROPIC_API_KEY to .env, or write scripts/${slug}.json by hand ` +
        `(copy scripts/why-is-the-sky-blue.json as a template).`,
    );
  }

  console.log("  asking Claude to write the script...");
  const script = await writeWithClaude(topic, style);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(script, null, 2) + "\n");
  console.log(`  saved to scripts/${slug}.json (edit it and re-run to tweak)`);
  return validateScript(script, style);
}

async function writeWithClaude(topic, style) {
  const s = style.script;
  const [minSec, maxSec] = s.targetSeconds;
  const minWords = Math.round(minSec * s.wordsPerSecond);
  const maxWords = Math.round(maxSec * s.wordsPerSecond * 0.95);

  const client = new Anthropic(); // reads ANTHROPIC_API_KEY from the environment

  const prompt = `Write a vertical short-form explainer video script about: "${topic}"

Rules:
- ${s.minScenes} to ${s.maxScenes} scenes.
- Total narration across all scenes: ${minWords}-${maxWords} words (spoken at ~${s.wordsPerSecond} words/second, the video must run ${minSec}-${maxSec} seconds).
- Tone: ${s.tone}
- Narration is read aloud by a text-to-speech voice: write numbers the way they should be spoken, no symbols, no stage directions.
- "visual" is a one-sentence description of what the viewer sees.
- "elements" are 2-4 on-screen items per scene that animate in. Kinds:
  - "emoji": text is exactly ONE emoji. label is "".
  - "headline": text is 1-4 words. label is "".
  - "stat": text is a short number like "93%" or "8 min"; label is 2-5 words describing it.
  - "bullet": text is 2-5 words. label is "".
- "cue" is ONE word copied exactly from that scene's narration. The element appears the moment that word is spoken, so pick the word the element is about. Cues in a scene should follow the order they are spoken.
- Facts must be accurate.`;

  const response = await client.messages.parse(
    {
      model: "claude-opus-5-5",
      max_tokens: 16000,
      output_config: {
        effort: "medium", // "low" = cheaper/faster, "high" = more careful writing
        format: zodOutputFormat(ScriptSchema),
      },
      // If a safety classifier declines the request, the API retries it on a
      // fallback model automatically instead of failing.
      fallbacks: "default",
      messages: [{ role: "user", content: prompt }],
    },
    { headers: { "anthropic-beta": "server-side-fallback-2026-07-01" } },
  );

  if (response.stop_reason === "refusal") {
    throw new Error(`Claude declined to write this script. Write scripts/<slug>.json by hand instead.`);
  }
  if (!response.parsed_output) {
    throw new Error(`Claude's reply could not be parsed (stop_reason: ${response.stop_reason}).`);
  }
  return response.parsed_output;
}

// Light checks so a hand-written script fails early with a clear message.
export function validateScript(script, style) {
  const { minScenes, maxScenes } = style.script;
  if (!script?.scenes?.length) throw new Error("Script has no scenes.");
  if (script.scenes.length < minScenes || script.scenes.length > maxScenes) {
    console.warn(`  ⚠ script has ${script.scenes.length} scenes (style.json asks for ${minScenes}-${maxScenes})`);
  }
  script.scenes.forEach((scene, i) => {
    if (!scene.narration?.trim()) throw new Error(`Scene ${i + 1} has no narration.`);
    scene.elements = (scene.elements ?? []).map((el) => ({ label: "", cue: "", ...el }));
    for (const el of scene.elements) {
      if (!ELEMENT_KINDS.includes(el.kind)) {
        throw new Error(`Scene ${i + 1}: unknown element kind "${el.kind}" (use ${ELEMENT_KINDS.join(", ")}).`);
      }
    }
  });
  return script;
}
