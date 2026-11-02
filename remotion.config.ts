// Remotion CLI settings (used by `npx remotion studio` and `npx remotion render`).
// See https://www.remotion.dev/docs/config
import { Config } from "@remotion/cli/config";

Config.setVideoImageFormat("jpeg");
Config.setCodec("h264");
Config.setPixelFormat("yuv420p"); // plays everywhere (phones, Instagram, TikTok)
Config.setCrf(18); // lower = higher quality, bigger file

// Use an existing Chrome binary if you set one in .env (otherwise Remotion
// downloads its own headless browser the first time).
if (process.env.REMOTION_BROWSER_EXECUTABLE) {
  Config.setBrowserExecutable(process.env.REMOTION_BROWSER_EXECUTABLE);
}
