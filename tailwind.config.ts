import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        display: ["Syne", "sans-serif"],
        sans: ["DM Sans", "sans-serif"],
        mono: ["JetBrains Mono", "monospace"],
      },
      colors: {
        teal: {
          DEFAULT: "#00e5a0",
          bright: "#00ffb3",
          dim: "#00b87a",
        },
      },
      boxShadow: {
        "teal-glow": "0 0 20px rgba(0,229,160,0.15), 0 0 40px rgba(0,229,160,0.05)",
        "teal-glow-lg": "0 0 40px rgba(0,229,160,0.2), 0 0 80px rgba(0,229,160,0.08)",
        "card": "0 1px 1px rgba(0,0,0,0.3), 0 4px 24px rgba(0,0,0,0.4)",
      },
      animation: {
        "pulse-slow": "pulse 6s ease-in-out infinite",
        "float": "float 6s ease-in-out infinite",
      },
      keyframes: {
        float: {
          "0%, 100%": { transform: "translateY(0px)" },
          "50%": { transform: "translateY(-12px)" },
        },
      },
    },
  },
  plugins: [],
};

export default config;