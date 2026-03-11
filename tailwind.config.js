/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: "#2563eb",
          soft: "#eff6ff",
        },
        background: {
          DEFAULT: "#f8fafc",
        },
      },
      boxShadow: {
        card: "0 1px 3px rgba(15,23,42,0.08)",
        "card-hover": "0 4px 12px rgba(15,23,42,0.12)",
      },
      borderRadius: {
        "md-plus": "10px",
      },
      keyframes: {
        "fade-in": {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        "scale-in": {
          "0%": { opacity: "0", transform: "scale(0.95)" },
          "100%": { opacity: "1", transform: "scale(1)" },
        },
        "slide-down": {
          "0%": { opacity: "0", transform: "translateY(-8px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
      },
      animation: {
        "fade-in": "fade-in 0.2s ease-out",
        "scale-in": "scale-in 0.25s ease-out",
        "slide-down": "slide-down 0.3s ease-out",
      },
      transitionDuration: {
        250: "250ms",
      },
    },
  },
  plugins: [],
};


