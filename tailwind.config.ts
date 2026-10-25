import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        ink: "#182126",
        paper: "#f4f5ef",
        signal: "#ed5b3f",
        moss: "#2d765e",
        sun: "#e8b84b",
      },
      fontFamily: {
        display: ["var(--font-space-grotesk)"],
        body: ["var(--font-dm-sans)"],
      },
    },
  },
  plugins: [],
};

export default config;
