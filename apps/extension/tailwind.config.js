/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./entrypoints/**/*.{html,ts,tsx}",
    "./src/**/*.{html,ts,tsx}"
  ],
  theme: {
    extend: {
      colors: {
        background: "#09090b",
        surface: "#121215",
        "surface-raised": "#18181b",
        "surface-overlay": "#27272a",
        border: "rgba(255, 255, 255, 0.08)",
        "border-subtle": "rgba(255, 255, 255, 0.04)",
        "border-focus": "rgba(99, 102, 241, 0.5)",
      },
      boxShadow: {
        "glow-sm": "0 0 15px -3px rgba(99, 102, 241, 0.25)",
        "glow-indigo": "0 0 25px -5px rgba(99, 102, 241, 0.4)",
        "glow-emerald": "0 0 25px -5px rgba(16, 185, 129, 0.35)",
        "glass": "0 8px 32px 0 rgba(0, 0, 0, 0.37)",
        "subtle": "0 1px 2px 0 rgba(0, 0, 0, 0.4)",
      },
      animation: {
        "fade-in": "fadeIn 0.2s cubic-bezier(0.16, 1, 0.3, 1) forwards",
        "scale-in": "scaleIn 0.2s cubic-bezier(0.16, 1, 0.3, 1) forwards",
        "slide-down": "slideDown 0.25s cubic-bezier(0.16, 1, 0.3, 1) forwards",
        "pulse-subtle": "pulseSubtle 2.5s ease-in-out infinite",
        "shimmer": "shimmer 2.5s linear infinite",
      },
      keyframes: {
        fadeIn: {
          "0%": { opacity: "0", transform: "translateY(4px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        scaleIn: {
          "0%": { opacity: "0", transform: "scale(0.96)" },
          "100%": { opacity: "1", transform: "scale(1)" },
        },
        slideDown: {
          "0%": { opacity: "0", transform: "translateY(-6px)", maxHeight: "0" },
          "100%": { opacity: "1", transform: "translateY(0)", maxHeight: "2000px" },
        },
        pulseSubtle: {
          "0%, 100%": { opacity: "1", transform: "scale(1)" },
          "50%": { opacity: "0.75", transform: "scale(1.02)" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
      },
    },
  },
  plugins: [],
}
