/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        brand: {
          black: "#050505",
          dark: "#080909",
          surface: "#0d0d0d",
          card: "#121212",
          cardHover: "#171717",
          border: "#1f1f1f",
          borderSubtle: "#262626",
          text: "#f5f5f5",
          muted: "#8a8a8a",
          dim: "#4a4a4a",
          green: "#32d583",
          greenSubtle: "rgba(50, 213, 131, 0.12)"
        }
      },
      fontFamily: {
        sans: ["Geist", "Inter", "system-ui", "-apple-system", "sans-serif"],
        mono: ["Geist Mono", "JetBrains Mono", "monospace"]
      }
    },
  },
  plugins: [],
}
