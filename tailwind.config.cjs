/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}"],
  theme: {
    fontFamily: {
      body: ["TTNorms"],
    },
    extend: {
      colors: {
        bluish: {
          100: "#eff6fa",
          200: "#e0ecf5",
          300: "#d0e3f0",
          400: "#c1d9eb",
          500: "#b1d0e6",
          600: "#8ea6b8",
          700: "#6a7d8a",
          800: "#47535c",
          900: "#232a2e",
        },
        grayish: {
          100: "#fcfdfe",
          200: "#f9fbfd",
          300: "#f5fafc",
          400: "#f2f8fb",
          500: "#eff6fa",
          600: "#bfc5c8",
          700: "#8f9496",
          800: "#606264",
          900: "#303132",
        },
      },
    },
  },
  plugins: [],
};
