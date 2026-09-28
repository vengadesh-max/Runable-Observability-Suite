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
        grafana: {
          bg: "#F4F5F7",           // Warm off-white background
          card: "#FFFFFF",         // Crisp white panel background
          subtle: "#F8FAFC",       // Panel header & row highlight
          hover: "#F1F5F9",        // Hover state
          border: "#E2E8F0",       // Panel border line
          borderDark: "#CBD5E1",   // Accent border
          orange: "#FF7800",       // Grafana signature orange
          blue: "#2563EB",         // Metric blue
          green: "#16A34A",        // Healthy green
          amber: "#D97706",        // Degraded amber
          red: "#DC2626",          // Critical red
          text: "#0F172A",         // Primary dark text
          muted: "#64748B",        // Secondary slate text
          dim: "#94A3B8",          // Subdued metadata text
        }
      },
      fontFamily: {
        sans: ["var(--font-ibm-plex-sans)", "Inter", "system-ui", "sans-serif"],
        mono: ["var(--font-ibm-plex-mono)", "JetBrains Mono", "monospace"],
      },
      boxShadow: {
        grafana: "0 1px 3px 0 rgba(0, 0, 0, 0.05), 0 1px 2px -1px rgba(0, 0, 0, 0.05)",
        panelHeader: "inset 0 -1px 0 0 #E2E8F0",
      }
    },
  },
  plugins: [],
};
