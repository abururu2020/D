// Registers the "Explainer" composition with Remotion.
// Size and frame rate come from style.json; length comes from the voice track.
import React from "react";
import { CalculateMetadataFunction, Composition, staticFile } from "remotion";
import { Explainer } from "./Explainer";
import latest from "./latest.json"; // written by `npm run make` (the last video you made)
import { style } from "./style";
import type { ExplainerProps, Timeline } from "./types";

// Before rendering, load public/videos/<slug>/timeline.json and size the video to fit.
const calculateMetadata: CalculateMetadataFunction<ExplainerProps> = async ({ props }) => {
  const res = await fetch(staticFile(`videos/${props.slug}/timeline.json`));
  if (!res.ok) {
    throw new Error(`No timeline for "${props.slug}". Run: npm run make -- "your topic"`);
  }
  const timeline = (await res.json()) as Timeline;
  return {
    durationInFrames: Math.ceil(timeline.duration * style.video.fps),
    props: { ...props, timeline },
  };
};

export const RemotionRoot: React.FC = () => (
  <Composition
    id="Explainer"
    component={Explainer}
    width={style.video.width}
    height={style.video.height}
    fps={style.video.fps}
    durationInFrames={1} // replaced by calculateMetadata
    defaultProps={{ slug: latest.slug } as ExplainerProps}
    calculateMetadata={calculateMetadata}
  />
);
