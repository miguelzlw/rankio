/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: "hsl(350, 70%, 40%)", // Bordô
        secondary: "hsl(350, 50%, 30%)",
        accent: "hsl(45, 95%, 55%)", // Yellow
        background: "hsl(350, 40%, 10%)", // Dark bordô background
        surface: "hsl(350, 40%, 16%)", // Modal surface
        text: "hsl(0, 0%, 90%)",
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
      },
      backdropBlur: {
        xs: "2px",
      },
    },
  },
  plugins: [],
};
