import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        clinic: {
          blue:      '#0066cc',
          'blue-hover': '#0055aa',
          ink:       '#1d1d1f',
          muted:     '#6e6e73',
          faint:     '#aeaeb2',
          canvas:    '#ffffff',
          parchment: '#f5f5f7',
          hairline:  '#e0e0e0',
          nav:       '#1d1d1f',
          red:       '#d93025',
          orange:    '#ea580c',
          green:     '#30d158',
        },
      },
      borderRadius: {
        'r-sm': '8px',
        'r-md': '11px',
        'r-lg': '18px',
        'r-pill': '9999px',
      },
      fontFamily: {
        sans: ['"Inter"', '"SF Pro Text"', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
      },
    },
  },
  plugins: [],
};

export default config;
