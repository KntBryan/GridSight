import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        ink: "#182126",
        paper: "#f4f5ef",
        signal: "#ed5b3f",
        moss: "#2d765e",
        sun: "#e8b84b",
        navy: {
          DEFAULT: "#061120",
          soft: "#0b1a2e",
          card: "#0d1f38",
          line: "#162842",
        },
        primary: {
          DEFAULT: "#0d6edc",
          hover: "#0b5ec0",
          glow: "#0f76e080",
        },
        status: {
          active: "#e65c45",
          checking: "#d9a637",
          restored: "#438c6a",
        },
      },
      fontFamily: {
        display: ["var(--font-space-grotesk)"],
        body: ["var(--font-dm-sans)"],
        heading: ["var(--font-heading)"],
        sans: ["var(--font-body)", "ui-sans-serif", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};

export default config;
