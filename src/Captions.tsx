// Karaoke-style captions: a few words at a time, the spoken word highlighted.
// All settings live in style.json -> captions.
import React, { useMemo } from "react";
import { AbsoluteFill, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { headingFont } from "./fonts";
import { accentFor, style } from "./style";
import type { Word } from "./types";

const c = style.captions;

type Page = { words: Word[]; start: number; end: number };

/**
 * Split the words into "pages" (what's on screen at once).
 * A new page starts when the current one is full, at a sentence end, or at a scene change.
 */
function buildPages(words: Word[]): Page[] {
  const pages: Page[] = [];
  let current: Word[] = [];

  words.forEach((word, i) => {
    current.push(word);
    const next = words[i + 1];
    const full = current.length >= c.wordsPerPage;
    const sentenceEnd = /[.!?]["')]?$/.test(word.text);
    const sceneChange = next && next.scene !== word.scene;
    if (!next || full || sentenceEnd || sceneChange) {
      pages.push({ words: current, start: current[0].start, end: word.end });
      current = [];
    }
  });

  // Each page stays up until the next one starts (but not more than 0.6s after its last word).
  pages.forEach((page, i) => {
    const nextStart = pages[i + 1]?.start ?? Infinity;
    page.end = Math.min(nextStart, page.end + 0.6);
  });
  return pages;
}

export const Captions: React.FC<{ words: Word[] }> = ({ words }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps; // current time in seconds

  const pages = useMemo(() => buildPages(words), [words]);
  const page = pages.find((p) => t >= p.start && t < p.end);
  if (!page) return null;

  // Small pop when a new page appears.
  const pop = spring({ frame: frame - Math.round(page.start * fps), fps, config: { damping: 14, stiffness: 200 } });

  const accent = c.activeColor === "accent" ? accentFor(page.words[0].scene) : c.activeColor;

  return (
    <AbsoluteFill style={{ justifyContent: "flex-end", alignItems: "center", paddingBottom: c.bottom }}>
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          justifyContent: "center",
          gap: "6px 18px",
          maxWidth: style.video.width - style.layout.padding * 2,
          transform: `scale(${0.85 + 0.15 * pop})`,
          fontFamily: headingFont,
          fontWeight: Number(style.fonts.headingWeight),
          fontSize: c.fontSize,
          lineHeight: 1.25,
          textTransform: c.uppercase ? "uppercase" : "none",
        }}
      >
        {page.words.map((word, i) => {
          // Active = the last word that has started (stays lit through short pauses).
          const nextStart = page.words[i + 1]?.start ?? page.end;
          const isActive = t >= word.start && t < nextStart;
          const isSpoken = t >= nextStart;
          const box = c.highlight === "box" && isActive;

          return (
            <span
              key={i}
              style={{
                position: "relative",
                padding: "0 14px",
                borderRadius: 18,
                background: box ? accent : "transparent",
                color: box ? c.activeTextColor : isActive ? accent : isSpoken ? c.spokenColor : c.upcomingColor,
                // Outline only when there's no box behind the word.
                WebkitTextStroke: box ? undefined : `${c.strokeWidth}px ${c.strokeColor}`,
                paintOrder: "stroke fill",
                transform: `scale(${isActive ? c.activeScale : 1})`,
                display: "inline-block",
              }}
            >
              {word.text}
            </span>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};
