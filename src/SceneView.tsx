// One scene: its background glow + elements that animate in on their cue word.
// Rendered inside a <Sequence>, so useCurrentFrame() here starts at 0 for each scene.
import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { ElementView } from "./Elements";
import { entrance } from "./motion";
import { accentFor, style, toFrames } from "./style";
import type { Scene } from "./types";

export const SceneView: React.FC<{ scene: Scene; index: number; durationInFrames: number }> = ({
  scene,
  index,
  durationInFrames,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const accent = accentFor(index);
  const fade = style.motion.sceneFadeFrames;

  // Cross-fade in (except the first scene) and out at the end.
  const opacity = interpolate(
    frame,
    [0, fade, durationInFrames - fade, durationInFrames],
    [index === 0 ? 1 : 0, 1, 1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );

  // Slow drifting glow in the scene's accent color.
  const drift = style.motion.backgroundDrift;
  const glowX = 50 + Math.sin(frame / 40) * 18 * drift;
  const glowY = 32 + Math.cos(frame / 55) * 10 * drift;

  return (
    <AbsoluteFill style={{ opacity }}>
      <AbsoluteFill
        style={{
          background: `radial-gradient(circle at ${glowX}% ${glowY}%, ${accent}55 0%, transparent 45%)`,
        }}
      />
      <AbsoluteFill
        style={{
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "flex-start",
          gap: style.layout.elementGap,
          paddingTop: style.layout.contentTop,
          paddingLeft: style.layout.padding,
          paddingRight: style.layout.padding,
        }}
      >
        {scene.elements.map((el, i) => {
          // el.at is absolute (from video start); convert to this scene's clock.
          const appearFrame = toFrames(el.at - scene.start);
          return (
            <div key={i} style={entrance(frame, appearFrame, fps)}>
              <ElementView el={el} accent={accent} />
            </div>
          );
        })}
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
