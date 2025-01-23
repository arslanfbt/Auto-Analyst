/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx}",  // Path to pages
    "./components/**/*.{js,ts,jsx,tsx}", // Path to components
    "./app/**/*.{js,ts,jsx,tsx}", // Path to app
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}
