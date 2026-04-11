/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx,html}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Warm paper palette — ivory surfaces, ink text, terracotta primary, muted gold secondary, clay tertiary
        background: '#faf6ec',
        surface: '#faf6ec',
        'surface-bright': '#fdfaf2',
        'surface-dim': '#ede6d2',
        'surface-container-lowest': '#fffdf6',
        'surface-container-low': '#f5efdf',
        'surface-container': '#ede6d2',
        'surface-container-high': '#e5ddc4',
        'surface-container-highest': '#ddd4b6',
        'surface-variant': '#ebe3cb',
        'surface-tint': '#b55327',
        'inverse-surface': '#34301e',
        'inverse-on-surface': '#f5efdf',
        'inverse-primary': '#f0bda0',

        'on-background': '#2a241a',
        'on-surface': '#2a241a',
        'on-surface-variant': '#6b5f48',
        outline: '#9a8d70',
        'outline-variant': '#d4ccb5',

        primary: '#b55327',
        'on-primary': '#fff8ee',
        'primary-container': '#d27048',
        'on-primary-container': '#fff0e0',
        'primary-fixed': '#ffe0cd',
        'primary-fixed-dim': '#f7c7a3',
        'on-primary-fixed': '#3a1400',
        'on-primary-fixed-variant': '#7a3010',

        secondary: '#8a7546',
        'on-secondary': '#fff8ee',
        'secondary-container': '#e8d9a8',
        'on-secondary-container': '#3d3210',
        'secondary-fixed': '#f5e9c2',
        'secondary-fixed-dim': '#e0cf92',
        'on-secondary-fixed': '#261c00',
        'on-secondary-fixed-variant': '#574626',

        tertiary: '#8a4a1a',
        'on-tertiary': '#fff8ee',
        'tertiary-container': '#c46a2e',
        'on-tertiary-container': '#fff0e0',
        'tertiary-fixed': '#ead6a8',
        'tertiary-fixed-dim': '#d6bf7e',
        'on-tertiary-fixed': '#2a1a00',
        'on-tertiary-fixed-variant': '#5a3810',

        error: '#b3261e',
        'on-error': '#fff8ee',
        'error-container': '#fcd8d0',
        'on-error-container': '#7a0b08',
      },
      borderRadius: {
        DEFAULT: '0.25rem',
        lg: '0.5rem',
        xl: '0.75rem',
        full: '9999px',
      },
      fontFamily: {
        headline: ['Manrope', 'sans-serif'],
        body: ['Inter', 'sans-serif'],
        label: ['Inter', 'sans-serif'],
      },
    },
  },
  plugins: [
    require('@tailwindcss/forms'),
    require('@tailwindcss/container-queries'),
  ],
};
