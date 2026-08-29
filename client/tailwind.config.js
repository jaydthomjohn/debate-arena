/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        void: "#08090c", // page background
        surface: "#111319", // panel background
        p1: "#33f7d1", // Player 1 neon — cyan
        p2: "#ff3fa4", // Player 2 neon — magenta
        gold: "#ffcf4d", // winner accent
        mute: "#3a3f4c", // dimmed / inactive
      },
      fontFamily: {
        display: ["'Chakra Petch'", "sans-serif"], // angular display face
        mono: ["'JetBrains Mono'", "monospace"], // captions, timers, transcript
      },
      boxShadow: {
        "neon-p1": "0 0 12px #33f7d1, 0 0 32px rgba(51,247,209,0.35)",
        "neon-p2": "0 0 12px #ff3fa4, 0 0 32px rgba(255,63,164,0.35)",
        "neon-gold": "0 0 20px #ffcf4d, 0 0 48px rgba(255,207,77,0.4)",
      },
    },
  },
  plugins: [],
};
