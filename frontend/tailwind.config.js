/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        paper: "#E7EEF3",
        panel: "#FFFFFF",
        ink: "#16324F",
        inkline: "#4A7A9D",
        stampred: "#A33B33",
        stampgreen: "#2E6B4F",
        stampamber: "#B8842E",
        darkpaper: "#0E2438",
      },
      fontFamily: {
        display: ["'Space Grotesk'", "sans-serif"],
        body: ["'IBM Plex Sans'", "sans-serif"],
        mono: ["'IBM Plex Mono'", "monospace"],
      },
    },
  },
  plugins: [],
};
