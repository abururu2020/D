// Entrance animations, driven by style.json -> motion.
import { interpolate, spring } from "remotion";
import { style } from "./style";

/**
 * Returns CSS for an element that should appear at `appearFrame`.
 * `frame` and `appearFrame` must use the same clock (both scene-relative here).
 */
export function entrance(frame: number, appearFrame: number, fps: number): React.CSSProperties {
  const m = style.motion;
  const t = frame - (appearFrame - m.leadFrames);

  if (t < 0) return { opacity: 0 };

  // 0 -> 1 with a little overshoot ("bounce"), controlled by damping/stiffness.
  const p = spring({ frame: t, fps, config: { damping: m.springDamping, stiffness: m.springStiffness } });
  const opacity = interpolate(t, [0, 6], [0, 1], { extrapolateRight: "clamp" });

  switch (m.entrance) {
    case "slide-up":
      return { opacity, transform: `translateY(${(1 - p) * 140}px)` };
    case "fade":
      return { opacity: interpolate(t, [0, 12], [0, 1], { extrapolateRight: "clamp" }) };
    case "zoom":
      return { opacity, transform: `scale(${1.6 - 0.6 * p})` };
    case "pop":
    default:
      return { opacity, transform: `scale(${0.4 + 0.6 * p})` };
  }
}
