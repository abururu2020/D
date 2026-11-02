// STEP 1c: turn per-character timings into the timeline the video reads.
//
// timeline.json looks like:
// {
//   "title": "...", "duration": 52.3, "mock": false,
//   "words":  [ { "text": "Ever", "start": 0.12, "end": 0.35, "scene": 0 }, ... ],
//   "scenes": [ { "start": 0, "end": 7.9, "narration": "...", "visual": "...",
//                 "elements": [ { "kind": "emoji", "text": "🌤️", "cue": "sky", "at": 1.42 } ] } ]
// }
// "at" is the moment (seconds) the element's cue word starts being spoken.

/** Group character timings into words (a word = a run of non-space characters). */
export function charsToWords(alignment) {
  const { characters, character_start_times_seconds: starts, character_end_times_seconds: ends } = alignment;
  const words = [];
  let current = null;

  characters.forEach((ch, i) => {
    if (/\s/.test(ch)) {
      current = null;
      return;
    }
    if (!current) {
      current = { text: "", start: starts[i], end: ends[i] };
      words.push(current);
    }
    current.text += ch;
    current.end = ends[i];
  });
  return words;
}

/** Lowercase and strip punctuation, so "Blue," matches the cue "blue". */
export const normalize = (s) => s.toLowerCase().replace(/[^\p{L}\p{N}]/gu, "");

export function buildTimeline({ script, alignment, audioDuration, tailSeconds, mock }) {
  const words = charsToWords(alignment);

  // Assign words to scenes in order: scene 1 owns its first N words, and so on.
  // (We sent the scenes joined with spaces, so the word counts line up.)
  let w = 0;
  const scenes = script.scenes.map((scene, sceneIndex) => {
    const count = scene.narration.trim().split(/\s+/).length;
    const sceneWords = words.slice(w, w + count);
    sceneWords.forEach((word) => (word.scene = sceneIndex));
    w += count;
    return { ...scene, words: sceneWords };
  });

  if (w !== words.length) {
    console.warn(`  ⚠ word count mismatch (script ${w}, audio ${words.length}). Timings may drift slightly.`);
    words.slice(w).forEach((word) => (word.scene = scenes.length - 1));
  }

  const totalDuration = audioDuration + tailSeconds;

  const timelineScenes = scenes.map((scene, i) => {
    // A scene starts when its first word starts and lasts until the next scene starts.
    const start = i === 0 ? 0 : scene.words[0]?.start ?? 0;
    const next = scenes[i + 1];
    const end = next ? next.words[0]?.start ?? totalDuration : totalDuration;

    // Find each element's cue word, scanning forward so cues keep their spoken order.
    let searchFrom = 0;
    const elements = scene.elements.map((el, elIndex) => {
      const cue = normalize(el.cue.split(/\s+/)[0] ?? "");
      let idx = scene.words.findIndex((wd, k) => k >= searchFrom && normalize(wd.text) === cue);
      if (idx === -1) idx = scene.words.findIndex((wd) => normalize(wd.text) === cue);
      if (idx === -1 && cue) idx = scene.words.findIndex((wd) => normalize(wd.text).startsWith(cue));

      if (idx === -1) {
        console.warn(`  ⚠ scene ${i + 1}: cue "${el.cue}" not found in narration; element will appear near the scene start`);
        return { ...el, at: start + 0.25 + elIndex * 0.4, cueFound: false };
      }
      searchFrom = idx + 1;
      return { ...el, at: scene.words[idx].start, cueFound: true };
    });

    return { start, end, narration: scene.narration, visual: scene.visual, elements };
  });

  return {
    title: script.title,
    duration: totalDuration,
    audioDuration,
    mock,
    words: words.map(({ text, start, end, scene }) => ({ text, start, end, scene })),
    scenes: timelineScenes,
  };
}
