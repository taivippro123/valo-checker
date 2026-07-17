/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        valorant: {
          dark: '#11141a',
          darker: '#0b0d10',
          red: '#ff4655',
          'red-hover': '#e93e4c',
          gray: '#7e838e',
          light: '#f9f9f9',
          gold: '#ece8e1',
        }
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
