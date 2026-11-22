export default {
  content: [
    "./index.html",
    "./src/**/*.{js,jsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        pixel: ['"Silkscreen"', '"IBM Plex Mono"', 'monospace'],
        menu: ['"Google Sans"', '"Noto Sans Thai"', 'system-ui', 'sans-serif'],
        mono: ['"IBM Plex Mono"', '"Noto Sans Thai"', 'ui-monospace', 'monospace'],
      },
      colors: {
        paper: '#eeeeec',
        ink: '#111111',
      },
    },
  },
}
