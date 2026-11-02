// The full video: background, one <Sequence> per scene, captions, progress bar, voice.
import React from "react";
import { AbsoluteFill, Html5Audio, Sequence, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { Captions } from "./Captions";
import { SceneView } from "./SceneView";
import { accentFor, style, toFrames } from "./style";
import type { ExplainerProps } from "./types";

export const Explainer: React.FC<ExplainerProps> = ({ slug, timeline }) => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();

  if (!timeline) return null; // loaded by calculateMetadata in Root.tsx

  const [bgTop, bgBottom] = style.colors.background;
  const currentScene = Math.max(
    0,
    timeline.scenes.findIndex((s) => frame / style.video.fps < s.end),
  );

  return (
    <AbsoluteFill style={{ background: `linear-gradient(180deg, ${bgTop} 0%, ${bgBottom} 100%)` }}>
      {/* Scenes. Each one overlaps the next by sceneFadeFrames so they cross-fade. */}
      {timeline.scenes.map((scene, i) => {
        const from = toFrames(scene.start);
        const duration = Math.max(1, toFrames(scene.end) - from + (i < timeline.scenes.length - 1 ? style.motion.sceneFadeFrames : 0));
        return (
          <Sequence key={i} from={from} durationInFrames={duration} name={`Scene ${i + 1}`}>
            <SceneView scene={scene} index={i} durationInFrames={duration} />
          </Sequence>
        );
      })}

      <Captions words={timeline.words} />

      {style.layout.showProgressBar ? (
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            height: style.layout.progressBarHeight,
            width: `${(frame / durationInFrames) * 100}%`,
            background: accentFor(currentScene),
          }}
        />
      ) : null}

      <Html5Audio src={staticFile(`videos/${slug}/voice.mp3`)} />
    </AbsoluteFill>
  );
};
