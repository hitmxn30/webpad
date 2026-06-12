import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background:    "var(--background)",
        foreground:    "var(--foreground)",
        canvas:        "var(--color-bg-base)",
        surface:       "var(--color-bg-surface)",
        elevated:      "var(--color-bg-elevated)",
        line:          "var(--color-border)",
        subline:       "var(--color-border-subtle)",
        primary:       "var(--color-text-primary)",
        secondary:     "var(--color-text-secondary)",
        muted:         "var(--color-text-muted)",
        accent:        "var(--color-accent)",
        "accent-hover":"var(--color-accent-hover)",
        success:       "var(--color-success)",
        warning:       "var(--color-warning)",
        error:         "var(--color-error)",
      },
      fontFamily: {
        sans: ["var(--font-geist-sans)", "ui-sans-serif", "system-ui", "sans-serif"],
        mono: ["var(--font-geist-mono)", "ui-monospace", "monospace"],
      },
      fontSize: {
        "2xs": ["11px", { lineHeight: "16px" }],
        xs:    ["12px", { lineHeight: "18px" }],
        sm:    ["13px", { lineHeight: "20px" }],
        base:  ["14px", { lineHeight: "22px" }],
        lg:    ["16px", { lineHeight: "24px" }],
      },
      borderRadius: {
        sm: "var(--radius-sm)",
        md: "var(--radius-md)",
        lg: "var(--radius-lg)",
      },
      boxShadow: {
        panel:    "var(--shadow-panel)",
        dropdown: "var(--shadow-dropdown)",
      },
      keyframes: {
        fadeIn: {
          from: { opacity: "0" },
          to:   { opacity: "1" },
        },
        slideInLeft: {
          from: { opacity: "0", transform: "translateX(-8px)" },
          to:   { opacity: "1", transform: "translateX(0)" },
        },
        slideInUp: {
          from: { opacity: "0", transform: "translateY(6px)" },
          to:   { opacity: "1", transform: "translateY(0)" },
        },
        scaleIn: {
          from: { opacity: "0", transform: "scale(0.95)" },
          to:   { opacity: "1", transform: "scale(1)" },
        },
        shimmer: {
          from: { backgroundPosition: "-200% center" },
          to:   { backgroundPosition:  "200% center" },
        },
        pulseSubtle: {
          "0%, 100%": { transform: "scale(1)" },
          "50%":      { transform: "scale(1.02)" },
        },
      },
      animation: {
        "fade-in":       "fadeIn 200ms ease both",
        "slide-in-left": "slideInLeft 200ms ease both",
        "slide-in-up":   "slideInUp 150ms ease both",
        "scale-in":      "scaleIn 100ms ease both",
        "shimmer":       "shimmer 1.5s linear infinite",
        "pulse-subtle":  "pulseSubtle 200ms ease",
      },
    },
  },
  plugins: [],
};
export default config;
