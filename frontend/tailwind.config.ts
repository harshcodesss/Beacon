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
          tint: "#fff3e8",
        },
        ok: { DEFAULT: "#22a06b", ink: "#1d7a55", tint: "#e6f6ef" },
        danger: { DEFAULT: "#e5484d", ink: "#c0392b", tint: "#fdeaea" },
        warn: { DEFAULT: "#f5a623", ink: "#9a6b00", tint: "#fdf3e0" },
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
