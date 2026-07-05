import type { Config } from "tailwindcss";
import typography from "@tailwindcss/typography";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./lib/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // Light monochromatic surfaces; orange is a sparse accent (logo,
        // active sidebar item, CTA hover/focus, confidence bars).
        surface: {
          DEFAULT: "#f6f6f7",
          raised: "#ffffff",
          overlay: "#efeff1",
        },
        edge: "#e4e4e7",
        ink: "#262626",
        beacon: {
          DEFAULT: "#ff7f11",
          dim: "#c25f00",
        },
      },
      fontFamily: {
        sans: [
          "var(--font-sans)",
          "ui-sans-serif",
          "system-ui",
          "-apple-system",
          "sans-serif",
        ],
        mono: [
          "ui-monospace",
          "SFMono-Regular",
          "Menlo",
          "Monaco",
          "Consolas",
          "monospace",
        ],
      },
    },
  },
  plugins: [typography],
};

export default config;
