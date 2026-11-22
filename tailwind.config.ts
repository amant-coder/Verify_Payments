import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#eff6ff",
          100: "#dbeafe",
          500: "#3b82f6",
          600: "#2563eb",
          700: "#1d4ed8",
        },
      },
      keyframes: {
        "shake-soft": {
          "0%, 100%": { transform: "translateX(0)" },
          "20%, 60%": { transform: "translateX(-4px)" },
          "40%, 80%": { transform: "translateX(4px)" },
        },
        "spring-pop": {
          "0%": { transform: "scale(0.8)", opacity: "0" },
          "70%": { transform: "scale(1.05)", opacity: "1" },
          "100%": { transform: "scale(1)", opacity: "1" },
        },
      },
      animation: {
        "shake-soft": "shake-soft 0.5s cubic-bezier(0.36, 0.07, 0.19, 0.97) both",
        "spring-pop": "spring-pop 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275) both",
      },
    },
  },
  plugins: [],
};
export default config;
