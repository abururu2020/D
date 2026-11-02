// Gives every component typed access to style.json.
import styleJson from "../style.json";

export const style = styleJson;
export type Style = typeof styleJson;

/** Accent color for a scene: cycles through style.colors.accents. */
export const accentFor = (sceneIndex: number) =>
  style.colors.accents[sceneIndex % style.colors.accents.length];

/** Seconds -> frames at the video's frame rate. */
export const toFrames = (seconds: number) => Math.round(seconds * style.video.fps);
