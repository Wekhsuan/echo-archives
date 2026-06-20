/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        cyber: {
          cyan:    '#00F0FF',
          aqua:    '#0AFFFF',
          red:     '#FF2D55',
          green:   '#00FF41',
          amber:   '#FFB800',
          bg:      '#0A0A0F',
          surface: '#111118',
          panel:   '#1A1A24DD',
          subtle:  '#FFFFFF08',
        },
        text: {
          primary:   '#E8E8F0',
          secondary: '#8888A0',
          dim:       '#4A4A60',
          whisper:   '#335577',
          danger:    '#FF4455',
        },
      },
      fontFamily: {
        mono: ['JetBrains Mono', 'Noto Sans SC', 'monospace'],
      },
      animation: {
        'scanline': 'scanline 8s linear infinite',
        'glitch-text': 'glitch 0.3s ease-in-out infinite',
        'flicker': 'flicker 0.15s infinite',
        'pulse-slow': 'pulse 4s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'breath': 'breath 3s ease-in-out infinite',
      },
      keyframes: {
        scanline: {
          '0%':   { transform: 'translateY(-100%)' },
          '100%': { transform: 'translateY(100vh)' },
        },
        glitch: {
          '0%, 100%': { transform: 'translate(0)' },
          '20%':      { transform: 'translate(-2px, 2px)' },
          '40%':      { transform: 'translate(2px, -1px)' },
          '60%':      { transform: 'translate(-1px, -2px)' },
          '80%':      { transform: 'translate(1px, 1px)' },
        },
        flicker: {
          '0%, 100%': { opacity: '1' },
          '50%':      { opacity: '0.3' },
        },
        breath: {
          '0%, 100%': { boxShadow: '0 0 5px rgba(0,240,255,0.3)' },
          '50%':      { boxShadow: '0 0 20px rgba(0,240,255,0.6)' },
        },
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
}
