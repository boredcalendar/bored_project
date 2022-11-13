/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}"],
  theme: {
    fontFamily: {
      body: ["TTNorms"],
    },
    extend: {
      colors: {
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
