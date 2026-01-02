/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        // Define Outfit como la fuente 'sans' por defecto
        sans: ['Outfit', 'sans-serif'],
      },
    },
  },
  plugins: [],
}