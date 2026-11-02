// Shape of public/videos/<slug>/timeline.json (written by pipeline/lib/timeline.mjs).

export type ElementKind = "emoji" | "headline" | "stat" | "bullet";

export type SceneElement = {
  kind: ElementKind;
  text: string;
  label: string; // used by "stat" (the caption under the number)
  cue: string; // the word this element is tied to
  at: number; // seconds: when the cue word starts (absolute, from video start)
  cueFound: boolean;
};

export type Word = {
  text: string;
  start: number; // seconds
  end: number; // seconds
  scene: number; // index of the scene this word belongs to
};

export type Scene = {
  start: number; // seconds
  end: number; // seconds
  narration: string;
  visual: string;
  elements: SceneElement[];
};

export type Timeline = {
  title: string;
  duration: number; // seconds, including the tail
  audioDuration: number;
  mock: boolean;
  words: Word[];
  scenes: Scene[];
};

export type ExplainerProps = {
  slug: string; // folder name under public/videos/
  timeline?: Timeline; // loaded automatically by calculateMetadata in Root.tsx
};
