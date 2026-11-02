// The on-screen building blocks a scene can use. Each one is a plain styled box,
// so changing the look is mostly editing style.json (or the CSS here).
import React from "react";
import { bodyFont, headingFont } from "./fonts";
import { style } from "./style";
import type { SceneElement } from "./types";

const { layout, colors, fonts } = style;

const textShadow = "0 6px 24px rgba(0,0,0,0.45)";

export const ElementView: React.FC<{ el: SceneElement; accent: string }> = ({ el, accent }) => {
  switch (el.kind) {
    // One big emoji used as an icon.
    case "emoji":
      return (
        <div style={{ fontSize: layout.emojiSize, lineHeight: 1, filter: "drop-shadow(0 18px 30px rgba(0,0,0,0.45))" }}>
          {el.text}
        </div>
      );

    // Short, bold title text.
    case "headline":
      return (
        <div
          style={{
            fontFamily: headingFont,
            fontWeight: Number(fonts.headingWeight),
            fontSize: layout.headlineSize,
            lineHeight: 1.05,
            color: colors.text,
            textAlign: "center",
            textShadow,
          }}
        >
          {el.text}
        </div>
      );

    // A big number in the accent color with a small label under it.
    case "stat":
      return (
        <div style={{ textAlign: "center" }}>
          <div
            style={{
              fontFamily: headingFont,
              fontWeight: Number(fonts.headingWeight),
              fontSize: layout.statSize,
              lineHeight: 1,
              color: accent,
              textShadow,
            }}
          >
            {el.text}
          </div>
          {el.label ? (
            <div
              style={{
                fontFamily: bodyFont,
                fontWeight: Number(fonts.bodyWeight),
                fontSize: layout.bulletSize,
                color: colors.muted,
                marginTop: 12,
              }}
            >
              {el.label}
            </div>
          ) : null}
        </div>
      );

    // A rounded "chip" with an accent dot.
    case "bullet":
      return (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 24,
            padding: "22px 40px",
            borderRadius: 999,
            background: colors.cardBackground,
            border: `3px solid ${colors.cardBorder}`,
            fontFamily: bodyFont,
            fontWeight: Number(fonts.bodyWeight),
            fontSize: layout.bulletSize,
            color: colors.text,
          }}
        >
          <span style={{ width: 22, height: 22, borderRadius: 999, background: accent, flexShrink: 0 }} />
          {el.text}
        </div>
      );

    default:
      return null;
  }
};
