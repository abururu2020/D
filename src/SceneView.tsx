// One scene: its background glow + elements that animate in on their cue word.
// Rendered inside a <Sequence>, so useCurrentFrame() here starts at 0 for each scene.
import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { DiagramView } from "./Diagrams";
import { ElementView } from "./Elements";
import { entrance } from "./motion";
import { accentFor, style, toFrames } from "./style";
import type { Scene, Word } from "./types";

const normalize = (s: string) => s.toLowerCase().replace(/[^\p{L}\p{N}]/gu, "");

// Layout when a scene has a diagram: diagram on top, elements (slightly smaller) below.
const DIAGRAM_TOP = 170;
const DIAGRAM_HEIGHT = 700;
const ELEMENTS_TOP = 930;
const ELEMENT_SCALE = 0.82;

export const SceneView: React.FC<{ scene: Scene; index: number; durationInFrames: number; words: Word[] }> = ({
  scene,
  index,
  durationInFrames,
  words,
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
  // Scene-relative time (seconds) when a word is spoken; first match wins.
  const cue = (word: string) => {
    const w = words.find((wd) => normalize(wd.text) === normalize(word)) ?? words.find((wd) => normalize(wd.text).startsWith(normalize(word)));
    return (w ? w.start : scene.start + 0.5) - scene.start;
  };
  const hasDiagram = Boolean(scene.diagram);

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
      {hasDiagram ? (
        <div style={{ position: "absolute", top: DIAGRAM_TOP, left: 40, right: 40, height: DIAGRAM_HEIGHT }}>
          <DiagramView name={scene.diagram!} t={frame / fps} fps={fps} accent={accent} cue={cue} />
        </div>
      ) : null}
      <AbsoluteFill
        style={{
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "flex-start",
          gap: style.layout.elementGap * (hasDiagram ? ELEMENT_SCALE : 1),
          paddingTop: hasDiagram ? ELEMENTS_TOP : style.layout.contentTop,
          paddingLeft: style.layout.padding,
          paddingRight: style.layout.padding,
        }}
      >
        {scene.elements.map((el, i) => {
          // el.at is absolute (from video start); convert to this scene's clock.
          const appearFrame = toFrames(el.at - scene.start);
          return (
            <div key={i} style={entrance(frame, appearFrame, fps)}>
              <div style={hasDiagram ? { zoom: ELEMENT_SCALE } : undefined}>
                <ElementView el={el} accent={accent} />
              </div>
            </div>
          );
        })}
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
