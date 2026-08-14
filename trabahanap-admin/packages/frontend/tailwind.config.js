/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          navy: "#0B153C",
          gold: "#F59E0B",
          darkGold: "#D97706",
          slate: "#0F172A",
          bg: "#F8FAFC",
        },
      },
    },
  },
  plugins: [],
};
