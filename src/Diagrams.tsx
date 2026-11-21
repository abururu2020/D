// Animated SVG diagrams. A scene opts in with "diagram": "<name>" in its script;
// the diagram fills the top of the frame and the scene's elements sit below it.
//
// Every diagram draws on a 1000x700 canvas and is driven by:
//   t    seconds since the scene started
//   cue  cue("word") -> seconds (scene clock) when that word is spoken
import React from "react";
import { spring } from "remotion";
import { bodyFont, headingFont } from "./fonts";
import { style } from "./style";

export type DiagramProps = {
  t: number;
  fps: number;
  accent: string;
  cue: (word: string) => number;
};

const WHITE = style.colors.text;
const MUTED = style.colors.muted;
const FAINT = "rgba(255,255,255,0.14)";
const FUR = "#f4a259";
const FUR_DARK = "#c9772f";
const PINK = "#f28aa0";

// ---------- small helpers ----------
const clamp01 = (x: number) => Math.min(1, Math.max(0, x));
/** 0 -> 1 between a and b seconds, eased out. */
const ramp = (t: number, a: number, b: number) => {
  const p = clamp01((t - a) / (b - a));
  return 1 - Math.pow(1 - p, 3);
};
/** Springy 0 -> ~1 starting at `at` seconds. */
const pop = (t: number, at: number, fps: number) =>
  t < at ? 0 : spring({ frame: (t - at) * fps, fps, config: { damping: 11, stiffness: 140 } });

/** Scale an SVG group around a point. */
const scaleAt = (x: number, y: number, s: number) => `translate(${x} ${y}) scale(${s}) translate(${-x} ${-y})`;

const wavePath = (x0: number, x1: number, y: number, fn: (x: number) => number, step = 4) => {
  let d = `M ${x0} ${y + fn(x0)}`;
  for (let x = x0 + step; x <= x1; x += step) d += ` L ${x} ${(y + fn(x)).toFixed(1)}`;
  return d;
};

const Label: React.FC<{ x: number; y: number; children: React.ReactNode; size?: number; color?: string; opacity?: number; anchor?: "start" | "middle" | "end"; bold?: boolean }> = ({
  x, y, children, size = 34, color = WHITE, opacity = 1, anchor = "middle", bold = false,
}) => (
  <text x={x} y={y} fill={color} opacity={opacity} fontSize={size} textAnchor={anchor}
    fontFamily={bold ? headingFont : bodyFont} fontWeight={bold ? 800 : 600}>
    {children}
  </text>
);

/** Simple flat cat head. */
const CatHead: React.FC<{ x: number; y: number; r: number; eyes?: "open" | "closed"; color?: string }> = ({
  x, y, r, eyes = "closed", color = FUR,
}) => {
  const ear = (dir: 1 | -1) =>
    `M ${x + dir * r * 0.85} ${y - r * 0.35} L ${x + dir * r * 0.75} ${y - r * 1.25} L ${x + dir * r * 0.2} ${y - r * 0.8} Z`;
  const eyeY = y - r * 0.05;
  return (
    <g>
      <path d={ear(-1)} fill={color} />
      <path d={ear(1)} fill={color} />
      <path d={`M ${x - r * 0.72} ${y - r * 0.5} L ${x - r * 0.68} ${y - r * 1.0} L ${x - r * 0.35} ${y - r * 0.72} Z`} fill={PINK} opacity={0.8} />
      <path d={`M ${x + r * 0.72} ${y - r * 0.5} L ${x + r * 0.68} ${y - r * 1.0} L ${x + r * 0.35} ${y - r * 0.72} Z`} fill={PINK} opacity={0.8} />
      <circle cx={x} cy={y} r={r} fill={color} />
      {eyes === "closed" ? (
        <>
          <path d={`M ${x - r * 0.55} ${eyeY} Q ${x - r * 0.38} ${eyeY + r * 0.16} ${x - r * 0.2} ${eyeY}`} stroke="#3a2314" strokeWidth={r * 0.07} fill="none" strokeLinecap="round" />
          <path d={`M ${x + r * 0.2} ${eyeY} Q ${x + r * 0.38} ${eyeY + r * 0.16} ${x + r * 0.55} ${eyeY}`} stroke="#3a2314" strokeWidth={r * 0.07} fill="none" strokeLinecap="round" />
        </>
      ) : (
        <>
          <ellipse cx={x - r * 0.38} cy={eyeY} rx={r * 0.13} ry={r * 0.17} fill="#3a2314" />
          <ellipse cx={x + r * 0.38} cy={eyeY} rx={r * 0.13} ry={r * 0.17} fill="#3a2314" />
          <circle cx={x - r * 0.34} cy={eyeY - r * 0.06} r={r * 0.04} fill="#fff" />
          <circle cx={x + r * 0.42} cy={eyeY - r * 0.06} r={r * 0.04} fill="#fff" />
        </>
      )}
      <path d={`M ${x - r * 0.1} ${y + r * 0.22} L ${x + r * 0.1} ${y + r * 0.22} L ${x} ${y + r * 0.34} Z`} fill={PINK} />
      {[-1, 1].map((d) =>
        [0, 1].map((k) => (
          <line key={`${d}${k}`} x1={x + d * r * 0.3} y1={y + r * (0.32 + k * 0.1)} x2={x + d * r * 1.15} y2={y + r * (0.22 + k * 0.22)}
            stroke="rgba(255,255,255,0.7)" strokeWidth={r * 0.025} strokeLinecap="round" />
        )),
      )}
    </g>
  );
};

/** Expanding rings coming out of a point (purr vibration). */
const Rings: React.FC<{ x: number; y: number; t: number; start: number; color: string; r0: number; r1: number; count?: number; speed?: number }> = ({
  x, y, t, start, color, r0, r1, count = 4, speed = 0.7,
}) => {
  if (t < start) return null;
  return (
    <g>
      {Array.from({ length: count }, (_, k) => {
        const phase = ((t - start) * speed + k / count) % 1;
        const fadeIn = clamp01((t - start) * 2);
        return <circle key={k} cx={x} cy={y} r={r0 + phase * (r1 - r0)} fill="none" stroke={color}
          strokeWidth={6} opacity={(1 - phase) * 0.7 * fadeIn} />;
      })}
    </g>
  );
};

// ======================================================================
// 1. A cat curled up on a lap, purring.
// ======================================================================
const PurrCat: React.FC<DiagramProps> = ({ t, fps, accent, cue }) => {
  const purrT = cue("purr");
  const appear = pop(t, cue("cat") - 0.2, fps);
  const breath = 1 + 0.05 * Math.sin(t * Math.PI * 1.1);
  const purring = t > purrT;
  const jitter = purring ? Math.sin(t * 90) * 1.6 : 0;

  return (
    <g>
      <ellipse cx={500} cy={590} rx={420} ry={70} fill="rgba(255,255,255,0.07)" />
      <Rings x={520} y={430} t={t} start={purrT} color={accent} r0={170} r1={470} />
      <g transform={`${scaleAt(500, 520, appear)} translate(${jitter} 0)`}>
        {/* body */}
        <g transform={`translate(0 ${470 * (1 - breath)}) scale(1 ${breath})`}>
          <ellipse cx={540} cy={470} rx={270} ry={135} fill={FUR} />
          {[0, 1, 2].map((k) => (
            <path key={k} d={`M ${560 + k * 70} 345 Q ${580 + k * 70} 400 ${555 + k * 70} 440`} stroke={FUR_DARK} strokeWidth={22} fill="none" strokeLinecap="round" />
          ))}
        </g>
        {/* tail wrapped in front */}
        <path d="M 790 500 Q 860 610 640 600 Q 470 595 360 555" stroke={FUR_DARK} strokeWidth={48} fill="none" strokeLinecap="round" />
        <CatHead x={300} y={430} r={115} />
      </g>
      {/* floating "rrr" */}
      {purring &&
        [0, 1, 2].map((k) => {
          const p = ((t - purrT) * 0.45 + k / 3) % 1;
          return (
            <Label key={k} x={260 + k * 150 + Math.sin(p * 6 + k) * 20} y={250 - p * 200} size={46} color={accent} opacity={Math.sin(p * Math.PI)} bold>
              rrr
            </Label>
          );
        })}
    </g>
  );
};

// ======================================================================
// 2. Side view of the voice box: two muscle flaps snapping open and shut.
// ======================================================================
const Larynx: React.FC<DiagramProps> = ({ t, fps, accent, cue }) => {
  const show = pop(t, cue("voice") - 0.3, fps);
  const twitchOn = ramp(t, cue("muscles"), cue("muscles") + 0.4);
  // Real purrs are ~25 Hz; shown slowed down so the eye can follow.
  const gap = 8 + 34 * twitchOn * Math.abs(Math.sin(t * Math.PI * 3.2));
  const breathOut = Math.sin(t * Math.PI * 0.55) > 0; // alternates every ~1.8s
  const breathOn = ramp(t, cue("breath") - 0.3, cue("breath"));

  const tubeL = 400, tubeR = 560, mid = 480, flapY = 330;

  return (
    <g transform={scaleAt(480, 350, show)}>
      {/* neck */}
      <rect x={300} y={40} width={360} height={620} rx={160} fill="rgba(255,255,255,0.05)" stroke={FAINT} strokeWidth={4} />
      {/* windpipe */}
      <rect x={tubeL} y={60} width={tubeR - tubeL} height={580} rx={30} fill="rgba(0,0,0,0.25)" stroke={MUTED} strokeWidth={5} />
      {/* air particles */}
      {breathOn > 0 &&
        Array.from({ length: 14 }, (_, k) => {
          const dir = breathOut ? -1 : 1;
          const p = ((t * 0.6 + k / 14) % 1 + 1) % 1;
          const y = dir < 0 ? 620 - p * 540 : 80 + p * 540;
          const nearFlap = Math.abs(y - flapY) < 40;
          const x = mid + Math.sin(k * 2.3) * 40 * (nearFlap ? 0.2 : 1) + (nearFlap ? Math.sin(t * 60 + k) * 6 : 0);
          return <circle key={k} cx={x} cy={y} r={9} fill={WHITE} opacity={0.55 * breathOn} />;
        })}
      {/* the two muscle flaps */}
      <path d={`M ${tubeL} ${flapY - 45} L ${mid - gap / 2} ${flapY} L ${tubeL} ${flapY + 45} Z`} fill={accent} />
      <path d={`M ${tubeR} ${flapY - 45} L ${mid + gap / 2} ${flapY} L ${tubeR} ${flapY + 45} Z`} fill={accent} />
      {/* labels */}
      <line x1={tubeL - 10} y1={flapY} x2={250} y2={flapY} stroke={MUTED} strokeWidth={3} />
      <Label x={240} y={flapY - 12} anchor="end" size={34} bold>voice box</Label>
      <Label x={240} y={flapY + 30} anchor="end" size={26} color={MUTED}>muscles twitch</Label>
      <g opacity={breathOn}>
        <Label x={480} y={30} size={34} color={accent} bold>{breathOut ? "breath out ↑" : "breath in ↓"}</Label>
      </g>
      {/* oscilloscope */}
      <g opacity={twitchOn}>
        <rect x={620} y={240} width={360} height={180} rx={20} fill="rgba(255,255,255,0.06)" stroke={FAINT} strokeWidth={3} />
        <path d={wavePath(640, 960, 330, (x) => Math.sin(x / 9 - t * 14) * 55 * (0.6 + 0.4 * Math.sin(x / 60)))} stroke={accent} strokeWidth={5} fill="none" />
        <Label x={800} y={460} size={26} color={MUTED}>shown slowed down</Label>
      </g>
    </g>
  );
};

// ======================================================================
// 3. A blind newborn kitten sends a purr signal to its mother.
// ======================================================================
const KittenSignal: React.FC<DiagramProps> = ({ t, fps, accent, cue }) => {
  const kitten = pop(t, cue("Kittens") - 0.2, fps);
  const mom = pop(t, cue("mother") - 0.6, fps);
  const ringsFrom = cue("purr");
  const day = Math.min(3, 1 + Math.floor(Math.max(0, t - cue("days")) * 2.5));
  const heart = pop(t, cue("fine"), fps);
  const bubble = pop(t, cue("here"), fps);

  return (
    <g>
      <Rings x={250} y={430} t={t} start={ringsFrom} color={accent} r0={90} r1={560} count={3} speed={0.6} />
      {/* mother */}
      <g transform={scaleAt(730, 380, mom)} opacity={clamp01(mom)}>
        <ellipse cx={760} cy={540} rx={190} ry={110} fill={FUR_DARK} />
        <CatHead x={720} y={360} r={150} eyes="open" color={FUR_DARK} />
      </g>
      {/* kitten */}
      <g transform={scaleAt(250, 450, kitten)}>
        <ellipse cx={280} cy={520} rx={110} ry={62} fill={FUR} />
        <CatHead x={240} y={440} r={72} />
      </g>
      {/* blind / deaf tags */}
      <g opacity={ramp(t, cue("blind") - 0.2, cue("blind") + 0.2)}>
        <Label x={250} y={640} size={30} color={MUTED}>eyes still closed</Label>
      </g>
      <g opacity={ramp(t, cue("days") - 0.2, cue("days") + 0.2)} transform={scaleAt(250, 300, 1)}>
        <rect x={160} y={250} width={180} height={64} rx={32} fill={accent} />
        <Label x={250} y={295} size={34} color="#0b1020" bold>Day {day}</Label>
      </g>
      {/* "I'm here" bubble */}
      <g transform={scaleAt(380, 180, bubble)} opacity={clamp01(bubble)}>
        <rect x={250} y={120} width={300} height={100} rx={30} fill={WHITE} />
        <path d="M 300 215 L 280 260 L 340 215 Z" fill={WHITE} />
        <Label x={400} y={185} size={42} color="#0b1020" bold>I'm here!</Label>
      </g>
      {/* mother's heart */}
      <g transform={scaleAt(870, 170, heart)} opacity={clamp01(heart)}>
        <path d="M 870 215 C 800 160 820 105 870 135 C 920 105 940 160 870 215 Z" fill={accent} />
      </g>
    </g>
  );
};

// ======================================================================
// 4. Hurt, scared, giving birth: a jagged stress line calms into a purr.
// ======================================================================
const Comfort: React.FC<DiagramProps> = ({ t, fps, accent, cue }) => {
  const calm = ramp(t, cue("self") - 0.4, cue("comfort") + 0.6);
  const step = Math.floor(t * 12); // jagged line changes 12x a second
  const jag = (x: number) => {
    const n = Math.sin(x * 12.9898 + step * 78.233) * 43758.5453;
    return ((n - Math.floor(n)) - 0.5) * 2;
  };
  const line = (x: number) => jag(Math.round(x / 30)) * 90 * (1 - calm) + Math.sin(x / 45 - t * 5) * 45 * calm;
  const lineColor = calm > 0.5 ? accent : "#ff6b6b";

  const icons: [string, string, string][] = [
    ["🩹", "hurt", "hurt"],
    ["😨", "scared", "scared"],
    ["🐣", "birth", "giving birth"],
  ];

  return (
    <g>
      <rect x={60} y={60} width={880} height={300} rx={30} fill="rgba(255,255,255,0.05)" stroke={FAINT} strokeWidth={3} />
      <path d={wavePath(90, 910, 210, line, 15)} stroke={lineColor} strokeWidth={8} fill="none" strokeLinejoin="round" />
      <Label x={90} y={110} anchor="start" size={32} color={MUTED} opacity={1 - calm}>stress</Label>
      <Label x={90} y={110} anchor="start" size={32} color={accent} opacity={calm} bold>calm purr</Label>

      {icons.map(([emoji, word, label], i) => {
        const s = pop(t, cue(word) - 0.15, fps);
        const x = 200 + i * 300;
        return (
          <g key={word} transform={scaleAt(x, 510, s)} opacity={clamp01(s)}>
            <circle cx={x} cy={510} r={95} fill="rgba(255,255,255,0.08)" stroke={calm > 0.5 ? accent : FAINT} strokeWidth={5} />
            <text x={x} y={540} fontSize={90} textAnchor="middle">{emoji}</text>
            <Label x={x} y={650} size={32} color={MUTED}>{label}</Label>
          </g>
        );
      })}
      <Rings x={500} y={510} t={t} start={cue("comfort")} color={accent} r0={120} r1={520} count={3} speed={0.5} />
    </g>
  );
};

// ======================================================================
// 5. Purr frequencies (25-150 Hz) washing over a bone and healing a crack.
// ======================================================================
const Frequency: React.FC<DiagramProps> = ({ t, fps, accent, cue }) => {
  const bone = pop(t, cue("heals") - 0.3, fps);
  const waves = ramp(t, cue("heals"), cue("heals") + 0.5);
  const band = ramp(t, cue("twenty") - 0.1, cue("hertz") + 0.2);
  const heal = ramp(t, cue("repair") - 0.4, cue("repair") + 0.8);

  const axisX0 = 100, axisX1 = 900;
  const hz = (v: number) => axisX0 + (v / 200) * (axisX1 - axisX0);
  const bandEnd = 25 + 125 * band;

  return (
    <g>
      {/* wavefronts travelling right */}
      {Array.from({ length: 6 }, (_, k) => {
        const p = ((t * 0.5 + k / 6) % 1);
        const x = 80 + p * 840;
        return <path key={k} d={`M ${x} 110 Q ${x + 50} 230 ${x} 350`} stroke={accent} strokeWidth={6} fill="none" opacity={waves * Math.sin(p * Math.PI) * 0.8} />;
      })}
      {/* bone */}
      <g transform={scaleAt(500, 230, bone)} opacity={clamp01(bone)}>
        <g style={{ filter: heal > 0 ? `drop-shadow(0 0 ${30 * heal}px ${accent})` : undefined }}>
          <rect x={290} y={200} width={420} height={60} rx={20} fill="#f3ead8" />
          {[290, 710].map((x) => (
            <g key={x}>
              <circle cx={x} cy={195} r={50} fill="#f3ead8" />
              <circle cx={x} cy={265} r={50} fill="#f3ead8" />
            </g>
          ))}
        </g>
        <path d="M 495 200 L 515 220 L 488 238 L 512 260" stroke="#7a2f2f" strokeWidth={7} fill="none" strokeLinecap="round" opacity={1 - heal} />
        <g opacity={heal}>
          <Label x={500} y={110} size={36} color={accent} bold>repairing</Label>
        </g>
      </g>
      {/* frequency axis */}
      <g opacity={ramp(t, cue("frequencies") - 0.3, cue("frequencies") + 0.3)}>
        <rect x={hz(25)} y={470} width={hz(bandEnd) - hz(25)} height={80} rx={14} fill={accent} opacity={0.35 + 0.15 * Math.sin(t * 6)} />
        <line x1={axisX0} y1={550} x2={axisX1} y2={550} stroke={MUTED} strokeWidth={4} />
        {[0, 50, 100, 150, 200].map((v) => (
          <g key={v}>
            <line x1={hz(v)} y1={550} x2={hz(v)} y2={568} stroke={MUTED} strokeWidth={4} />
            <Label x={hz(v)} y={610} size={30} color={MUTED}>{v}</Label>
          </g>
        ))}
        <Label x={axisX1} y={660} anchor="end" size={30} color={MUTED}>hertz</Label>
        <Label x={(hz(25) + hz(bandEnd)) / 2} y={525} size={36} color={WHITE} bold opacity={band}>purr zone</Label>
      </g>
    </g>
  );
};

// ======================================================================
// 6. A low purr + a high cry = one sound you can't ignore.
// ======================================================================
const HiddenCry: React.FC<DiagramProps> = ({ t, fps, accent, cue }) => {
  const purr = ramp(t, cue("trick") - 0.3, cue("trick") + 0.3);
  const cry = ramp(t, cue("high") - 0.2, cue("high") + 0.3);
  const sum = ramp(t, cue("inside") - 0.2, cue("inside") + 0.4);
  const baby = pop(t, cue("baby's"), fps);
  const bowl = pop(t, cue("breakfast"), fps);

  const fPurr = (x: number) => Math.sin(x / 40 - t * 4) * 55;
  const fCry = (x: number) => Math.sin(x / 7 - t * 18) * 22;
  const x0 = 230, x1 = 940;

  return (
    <g>
      <g opacity={purr}>
        <Label x={200} y={125} anchor="end" size={34} bold>purr</Label>
        <path d={wavePath(x0, x1, 110, fPurr, 3)} stroke={MUTED} strokeWidth={6} fill="none" />
      </g>
      <g opacity={cry}>
        <Label x={200} y={290} anchor="end" size={34} bold>cry</Label>
        <path d={wavePath(x0, x1, 275, fCry, 2)} stroke="#4cc9f0" strokeWidth={5} fill="none" />
        <Label x={200} y={240} anchor="end" size={44} opacity={1}>+</Label>
      </g>
      <g transform={scaleAt(110, 275, baby)} opacity={clamp01(baby)}>
        <text x={60} y={300} fontSize={70} textAnchor="middle">👶</text>
      </g>
      <g opacity={sum}>
        <line x1={x0} y1={370} x2={x1} y2={370} stroke={FAINT} strokeWidth={3} />
        <Label x={200} y={480} anchor="end" size={34} color={accent} bold>you hear</Label>
        <path d={wavePath(x0, x1, 465, (x) => fPurr(x) + fCry(x) * sum, 2)} stroke={accent} strokeWidth={6} fill="none" />
      </g>
      <g transform={scaleAt(585, 620, bowl)} opacity={clamp01(bowl)}>
        <text x={520} y={650} fontSize={80} textAnchor="middle">🍽️</text>
        <text x={650} y={650} fontSize={80} textAnchor="middle">⏰</text>
      </g>
    </g>
  );
};

// ======================================================================
// 7. One purr, three messages.
// ======================================================================
const Messages: React.FC<DiagramProps> = ({ t, fps, accent, cue }) => {
  const head = pop(t, 0.1, fps);
  const bubbles: { text: string; word: string; x: number; y: number; color: string }[] = [
    { text: "I need you", word: "need", x: 230, y: 120, color: style.colors.accents[2] },
    { text: "I'm okay", word: "okay", x: 770, y: 120, color: style.colors.accents[3] },
    { text: "Feed me now!", word: "feed", x: 500, y: 620, color: style.colors.accents[0] },
  ];
  const cx = 500, cy = 360;

  return (
    <g>
      <Rings x={cx} y={cy} t={t} start={0.2} color={accent} r0={110} r1={380} count={3} speed={0.6} />
      {bubbles.map((b) => {
        const s = pop(t, cue(b.word) - 0.1, fps);
        const draw = ramp(t, cue(b.word) - 0.3, cue(b.word) + 0.2);
        const lx = cx + (b.x - cx) * draw, ly = cy + (b.y - cy) * draw;
        return (
          <g key={b.word}>
            <line x1={cx} y1={cy} x2={lx} y2={ly} stroke={b.color} strokeWidth={5} strokeDasharray="14 12" opacity={draw * 0.8} />
            <g transform={scaleAt(b.x, b.y, s)} opacity={clamp01(s)}>
              <rect x={b.x - 185} y={b.y - 55} width={370} height={110} rx={55} fill={b.color} />
              <Label x={b.x} y={b.y + 15} size={44} color="#0b1020" bold>{b.text}</Label>
            </g>
          </g>
        );
      })}
      <g transform={scaleAt(cx, cy, head)}>
        <CatHead x={cx} y={cy + 10} r={110} />
      </g>
    </g>
  );
};

export const DIAGRAMS: Record<string, React.FC<DiagramProps>> = {
  "purr-cat": PurrCat,
  larynx: Larynx,
  "kitten-signal": KittenSignal,
  comfort: Comfort,
  frequency: Frequency,
  "hidden-cry": HiddenCry,
  messages: Messages,
};

export const DiagramView: React.FC<DiagramProps & { name: string }> = ({ name, ...props }) => {
  const Diagram = DIAGRAMS[name];
  if (!Diagram) return null;
  return (
    <svg viewBox="0 0 1000 700" width="100%" height="100%" style={{ overflow: "visible" }}>
      <Diagram {...props} />
    </svg>
  );
};
