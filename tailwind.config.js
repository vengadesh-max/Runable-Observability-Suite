/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        sand: {
          DEFAULT: "#FBF9F5",
          subtle: "#F4F0EA",
          border: "#E5DEC9",
          darkBorder: "#D8CFC4",
        },
        burgundy: {
          DEFAULT: "#581C25",
          hover: "#42151C",
          light: "#7A2836",
        },
        burntOrange: {
          DEFAULT: "#C85A32",
          hover: "#B04D27",
        },
        editorial: {
          text: "#2A2421",
          muted: "#6E645E",
          dim: "#A0958C",
        },
      },
      fontFamily: {
        serif: ["var(--font-serif)", "Playfair Display", "Georgia", "serif"],
        sans: ["var(--font-sans)", "IBM Plex Sans", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "IBM Plex Mono", "monospace"],
      },
      boxShadow: {
        editorial: "0 1px 4px 0 rgba(42, 36, 33, 0.04)",
      }
    },
  },
  plugins: [],
};
