/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#eef6ff', 100: '#d9ecff', 200: '#bcdeff', 300: '#8ec8ff', 400: '#59a8ff',
          500: '#3385ff', 600: '#1f66f5', 700: '#1850e1', 800: '#1a42b6', 900: '#1b3c8f',
        },
        accent: {
          50: '#fff1f7', 100: '#ffe0ec', 200: '#ffc2d9', 300: '#ff97bd', 400: '#ff6798',
          500: '#ff4281', 600: '#f01f66', 700: '#cc1352', 800: '#a71447', 900: '#8a1540',
        },
        mint: {
          50: '#e9fff6', 100: '#c9ffe9', 200: '#92ffd3', 300: '#54f7b6', 400: '#1fe89a',
          500: '#06cf7e', 600: '#00a866', 700: '#008552', 800: '#066843', 900: '#065438',
        },
        gold: {
          50: '#fffbeb', 100: '#fff3c7', 200: '#ffe589', 300: '#ffd24d', 400: '#ffbb20',
          500: '#f59e0b', 600: '#d97706', 700: '#b45309', 800: '#92400e', 900: '#78350f',
        },
        ink: {
          50: '#f7f8fb', 100: '#eef0f6', 200: '#dde1ee', 300: '#c2c8de', 400: '#9aa3c4',
          500: '#727da6', 600: '#565f88', 700: '#424a6e', 800: '#2d3350', 900: '#1a1e36',
          950: '#0c0f24',
        },
      },
      fontFamily: {
        sans: ['Sora', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        display: ['Space Grotesk', 'Sora', 'sans-serif'],
        mono: ['JetBrains Mono', 'ui-monospace', 'monospace'],
      },
      borderRadius: {
        '4xl': '2rem',
        '5xl': '2.5rem',
      },
      boxShadow: {
        glass: '0 8px 32px 0 rgba(31, 102, 245, 0.12)',
        glow: '0 0 0 1px rgba(255,255,255,0.08), 0 8px 40px rgba(51,133,255,0.25)',
        'glow-accent': '0 0 30px rgba(255,66,129,0.35)',
        'glow-mint': '0 0 30px rgba(6,207,126,0.35)',
      },
      backdropBlur: { xs: '2px' },
      animation: {
        'aurora': 'aurora 18s ease-in-out infinite',
        'aurora-slow': 'aurora 28s ease-in-out infinite',
        'float': 'float 6s ease-in-out infinite',
        'pop': 'pop 0.35s cubic-bezier(0.34,1.56,0.64,1)',
        'shimmer': 'shimmer 2s linear infinite',
        'slide-up': 'slideUp 0.4s cubic-bezier(0.16,1,0.3,1)',
        'slide-down': 'slideDown 0.35s cubic-bezier(0.16,1,0.3,1)',
        'fade-in': 'fadeIn 0.3s ease-out',
        'scale-in': 'scaleIn 0.25s cubic-bezier(0.34,1.56,0.64,1)',
        'ring-spin': 'ringSpin 3s linear infinite',
        'heart-burst': 'heartBurst 0.6s cubic-bezier(0.34,1.56,0.64,1)',
        'like-burst': 'likeBurst 0.8s cubic-bezier(0.22,1,0.36,1) forwards',
        'like-particle': 'likeParticle 0.7s ease-out forwards',
      },
      keyframes: {
        aurora: {
          '0%,100%': { transform: 'translate(0,0) scale(1)', opacity: '0.7' },
          '33%': { transform: 'translate(5%, -8%) scale(1.1)', opacity: '0.9' },
          '66%': { transform: 'translate(-6%, 6%) scale(0.95)', opacity: '0.6' },
        },
        float: {
          '0%,100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-10px)' },
        },
        pop: {
          '0%': { transform: 'scale(0.8)', opacity: '0' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-1000px 0' },
          '100%': { backgroundPosition: '1000px 0' },
        },
        slideUp: {
          '0%': { transform: 'translateY(24px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        slideDown: {
          '0%': { transform: 'translateY(-24px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        scaleIn: {
          '0%': { transform: 'scale(0.92)', opacity: '0' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
        ringSpin: {
          '0%': { transform: 'rotate(0deg)' },
          '100%': { transform: 'rotate(360deg)' },
        },
        heartBurst: {
          '0%': { transform: 'scale(0) rotate(-15deg)', opacity: '0' },
          '40%': { transform: 'scale(1.2) rotate(8deg)', opacity: '1' },
          '100%': { transform: 'scale(1) rotate(0deg)', opacity: '1' },
        },
        likeBurst: {
          '0%': { transform: 'scale(0) rotate(-20deg)', opacity: '0' },
          '15%': { transform: 'scale(1.3) rotate(10deg)', opacity: '1' },
          '30%': { transform: 'scale(0.95) rotate(-5deg)' },
          '45%': { transform: 'scale(1.1) rotate(3deg)' },
          '60%': { transform: 'scale(1) rotate(0deg)' },
          '80%': { transform: 'scale(1.05)', opacity: '1' },
          '100%': { transform: 'scale(1.4)', opacity: '0' },
        },
        likeParticle: {
          '0%': { transform: 'translate(-50%,-50%) scale(1)', opacity: '1' },
          '100%': { transform: 'translate(calc(-50% + var(--dx)), calc(-50% + var(--dy))) scale(0)', opacity: '0' },
        },
      },
    },
  },
  plugins: [],
};
