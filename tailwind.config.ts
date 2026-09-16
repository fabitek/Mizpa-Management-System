import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: ['class'],
  content: [
    './src/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      // ─── Design.md Color Tokens ────────────────────────────────────────────
      colors: {
        // Canvas & Surfaces
        background: '#09090b',       // bg-zinc-950 — lienzo global
        foreground: '#fafafa',
        surface: '#121214',          // Tarjetas Bento, widgets, paneles
        'surface-elevated': '#1a1a1e', // Modales, menús flotantes
        'surface-subtle': '#27272a', // Bordes, separadores, inputs (zinc-800)

        // Brand Accents
        primary: {
          DEFAULT: '#10b981',        // Emerald 500 — acciones, activos, CONFIRMED
          hover: '#059669',          // Emerald 600 — hover state
        },
        secondary: '#f59e0b',        // Amber 500 — WAITLIST, parqueadero
        danger: '#ef4444',           // Red 500 — LIVE, deudas, cancelaciones

        // Text Hierarchy
        'text-primary': '#fafafa',   // Zinc 50 — títulos y valores críticos
        'text-secondary': '#a1a1aa', // Zinc 400 — etiquetas y metadatos
        'text-muted': '#71717a',     // Zinc 500 — placeholders y timestamps
      },

      // ─── Design.md Border Radius Tokens ───────────────────────────────────
      borderRadius: {
        'bento-sm': '6px',
        'bento-md': '10px',
        'bento-lg': '16px',
      },

      // ─── Typography ───────────────────────────────────────────────────────
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'sans-serif'],
      },

      // ─── Letter Spacing (badge-caps) ──────────────────────────────────────
      letterSpacing: {
        'badge': '0.06em',
        'tight-display': '-0.03em',
        'tight-h1': '-0.02em',
        'tight-h2': '-0.01em',
      },
    },
  },
  plugins: [],
};

export default config;
