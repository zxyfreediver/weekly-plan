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
          DEFAULT: "#2da896",
          soft: "#ecfbf7",
        },
        background: {
          DEFAULT: "#f7fbfa",
        },
      },
      boxShadow: {
        card: "0 18px 45px rgba(148,163,184,0.14)",
        "card-hover": "0 24px 60px rgba(148,163,184,0.2)",
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

