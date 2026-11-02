// Loads the fonts named in style.json (fonts.heading / fonts.body) from Google Fonts.
//
// To add a font: find it in node_modules/@remotion/google-fonts/dist/cjs/
// (file name = font name without spaces), import it below and add it to FONTS.
import * as Anton from "@remotion/google-fonts/Anton";
import * as BebasNeue from "@remotion/google-fonts/BebasNeue";
import * as Inter from "@remotion/google-fonts/Inter";
import * as Montserrat from "@remotion/google-fonts/Montserrat";
import * as Poppins from "@remotion/google-fonts/Poppins";
import * as Roboto from "@remotion/google-fonts/Roboto";
import { style } from "./style";

type FontModule = {
  getInfo: () => { fonts: Record<string, Record<string, unknown>> };
  loadFont: (style?: "normal", options?: { weights?: string[]; subsets?: string[] }) => { fontFamily: string };
};

const FONTS: Record<string, FontModule> = {
  Anton,
  "Bebas Neue": BebasNeue,
  Inter,
  Montserrat,
  Poppins,
  Roboto,
} as unknown as Record<string, FontModule>;

function load(name: string, weight: string): string {
  const mod = FONTS[name];
  if (!mod) {
    console.warn(`Font "${name}" is not in src/fonts.ts; falling back to sans-serif.`);
    return "sans-serif";
  }
  // Only request the weight we use (if the font has it) to keep loading fast.
  const available = Object.keys(mod.getInfo().fonts.normal ?? {});
  const weights = available.includes(weight) ? [weight] : undefined;
  const { fontFamily } = mod.loadFont("normal", { weights, subsets: ["latin"] });
  return `${fontFamily}, sans-serif`;
}

export const headingFont = load(style.fonts.heading, style.fonts.headingWeight);
export const bodyFont = load(style.fonts.body, style.fonts.bodyWeight);
