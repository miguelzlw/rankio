module.exports = {
  content: [
    "./index.html",
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: "hsl(220, 90%, 55%)",
        secondary: "hsl(340, 70%, 60%)",
        accent: "hsl(45, 95%, 55%)",
        background: "hsl(210, 15%, 12%)",
        surface: "hsl(210, 15%, 18%)",
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
