# Explainer reels: topic in, video out

```
npm run make -- "Why is the sky blue?"
        │
        ├─ 1a  script     Claude writes 5-7 scenes (narration + visual + on-screen elements)
        │                 → scripts/<slug>.json   (edit it and re-run to tweak)
        ├─ 1b  voice      ElevenLabs /with-timestamps → audio + per-character timing
        ├─ 1c  timings    → public/videos/<slug>/voice.mp3, words.json, timeline.json
        ├─ 2   Remotion   elements pop in on their cue word, karaoke captions
        └─ 4   render     Remotion → FFmpeg (loudness + faststart) → out/<slug>.mp4
```

Output: 1080x1920 H.264 MP4, 30fps, sized to the voice track (target 45-60s).

## Setup

Needs Node 18+ and FFmpeg (`ffmpeg -version`).

```bash
npm install
cp .env.example .env   # then fill in your keys
```

| `.env` key | What it does | If empty |
|---|---|---|
| `ELEVENLABS_API_KEY`, `ELEVENLABS_VOICE_ID` | Real voice + exact word timings | **Mock mode**: silent track, estimated timings. Good for designing the look for free |
| `ANTHROPIC_API_KEY` | Claude writes the script | You write `scripts/<slug>.json` yourself (copy the sample) |

## Use it

```bash
npm run make -- "How do vaccines work?"   # script → voice → timings → out/how-do-vaccines-work.mp4
npm run make -- "..." --no-render         # stop before rendering, then preview in studio
npm run make -- "..." --new               # throw away scripts/<slug>.json, ask Claude again
npm run make -- "..." --fresh-voice       # re-generate the voice even if narration is unchanged
npm run render                            # re-render the last video (e.g. after a style change)
npm run render -- why-is-the-sky-blue     # re-render a specific one
```

The voice is only regenerated when the narration (or voice settings) change, so
restyling and re-rendering never spends ElevenLabs credits.

### Preview in Remotion Studio

```bash
npx remotion studio
```

Opens http://localhost:3000 showing the **Explainer** composition for the last
video you made. To view another one, change `slug` in the right-hand props panel.
Edits to `style.json` or `src/` hot-reload instantly.

## Changing the look: `style.json`

Every video reads this one file. Each key has a `_note` next to it.

- `colors`: background gradient, text, and the accent list (each scene takes the next accent)
- `fonts`: heading/body font + weight (options listed in the file; add more in `src/fonts.ts`)
- `layout`: sizes of each element type, where visuals start, the progress bar
- `captions`: size, position, words per page, `box` vs `color` highlight, colors, outline
- `motion`: entrance type (`pop` / `slide-up` / `fade` / `zoom`), spring bounce, lead frames, scene cross-fade
- `voice`: ElevenLabs model and voice settings
- `script`: scene count, target length, speaking rate, tone given to Claude

## Script format

`scripts/why-is-the-sky-blue.json` is a full example. Each scene has:

```json
{
  "narration": "Those molecules scatter short waves far more than long ones...",
  "visual": "Light bouncing off molecules in every direction.",
  "elements": [
    { "kind": "headline", "text": "Rayleigh scattering", "label": "", "cue": "Rayleigh" },
    { "kind": "stat", "text": "5x", "label": "more scattering for blue", "cue": "five" }
  ]
}
```

- `kind`: `emoji` (one emoji), `headline` (1-4 words), `stat` (big number + `label`), `bullet` (chip)
- `cue`: a word from that scene's narration. The element animates in the moment that word is spoken.
  If the word isn't found, `make` prints a warning and the element appears near the start of the scene.

## Where things live

```
style.json                 the look (edit this)
scripts/<slug>.json        scripts (Claude writes them, you can edit)
pipeline/make.mjs          the `npm run make` command
pipeline/render.mjs        the `npm run render` command
pipeline/lib/script.mjs    Claude script writer + format checks
pipeline/lib/voice.mjs     ElevenLabs with-timestamps call + mock mode
pipeline/lib/timeline.mjs  characters → words → scenes → cue times
pipeline/lib/ffmpeg.mjs    duration probe, silence, final loudness pass
src/Explainer.tsx          the composition: scenes, captions, progress bar, audio
src/SceneView.tsx          one scene: glow + elements animating in on cue
src/Elements.tsx           how each element kind is drawn
src/Captions.tsx           karaoke captions
src/motion.ts              entrance animations
src/fonts.ts               Google Fonts loading
```
