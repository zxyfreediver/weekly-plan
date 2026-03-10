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
      },
      borderRadius: {
        "md-plus": "10px",
      },
    },
  },
  plugins: [],
};


