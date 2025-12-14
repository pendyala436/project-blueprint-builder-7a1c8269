import type { Config } from "tailwindcss";

export default {
  darkMode: ["class"],
  content: ["./pages/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./app/**/*.{ts,tsx}", "./src/**/*.{ts,tsx}"],
  prefix: "",
  theme: {
    container: {
      center: true,
      padding: {
        DEFAULT: "1rem",
        sm: "1.5rem",
        md: "2rem",
        lg: "2.5rem",
        xl: "3rem",
        "2xl": "4rem",
      },
      screens: {
        sm: "640px",
        md: "768px",
        lg: "1024px",
        xl: "1280px",
        "2xl": "1400px",
      },
    },
    screens: {
      // Mobile first breakpoints
      "xs": "320px",      // Small phones
      "sm": "480px",      // Large phones
      "md": "768px",      // Tablets / iPads
      "lg": "1024px",     // Laptops / Small desktops
      "xl": "1280px",     // Desktops
      "2xl": "1536px",    // Large desktops
      "3xl": "1920px",    // Ultra-wide / 4K
      
      // Device-specific breakpoints
      "mobile": { "max": "767px" },           // All mobile devices
      "tablet": { "min": "768px", "max": "1023px" },  // Tablets only
      "laptop": { "min": "1024px", "max": "1279px" }, // Laptops only
      "desktop": { "min": "1280px" },         // Desktop and above
      
      // Orientation
      "portrait": { "raw": "(orientation: portrait)" },
      "landscape": { "raw": "(orientation: landscape)" },
      
      // Touch devices
      "touch": { "raw": "(hover: none) and (pointer: coarse)" },
      "stylus": { "raw": "(hover: none) and (pointer: fine)" },
      "mouse": { "raw": "(hover: hover) and (pointer: fine)" },
      
      // High DPI screens
      "retina": { "raw": "(-webkit-min-device-pixel-ratio: 2), (min-resolution: 192dpi)" },
      
      // Reduced motion preference
      "motion-safe": { "raw": "(prefers-reduced-motion: no-preference)" },
      "motion-reduce": { "raw": "(prefers-reduced-motion: reduce)" },
      
      // Dark mode preference
      "dark-mode": { "raw": "(prefers-color-scheme: dark)" },
      "light-mode": { "raw": "(prefers-color-scheme: light)" },
      
      // Print
      "print": { "raw": "print" },
      
      // Specific device heights (for safe areas)
      "short": { "raw": "(max-height: 700px)" },
      "tall": { "raw": "(min-height: 800px)" },
    },
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
        display: ['Quicksand', 'system-ui', 'sans-serif'],
      },
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
          glow: "hsl(var(--primary-glow))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        sidebar: {
          DEFAULT: "hsl(var(--sidebar-background))",
          foreground: "hsl(var(--sidebar-foreground))",
          primary: "hsl(var(--sidebar-primary))",
          "primary-foreground": "hsl(var(--sidebar-primary-foreground))",
          accent: "hsl(var(--sidebar-accent))",
          "accent-foreground": "hsl(var(--sidebar-accent-foreground))",
          border: "hsl(var(--sidebar-border))",
          ring: "hsl(var(--sidebar-ring))",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
        xl: "calc(var(--radius) + 4px)",
        "2xl": "calc(var(--radius) + 8px)",
      },
      spacing: {
        // Safe area spacing
        "safe-top": "env(safe-area-inset-top)",
        "safe-right": "env(safe-area-inset-right)",
        "safe-bottom": "env(safe-area-inset-bottom)",
        "safe-left": "env(safe-area-inset-left)",
        // Touch-friendly sizes
        "touch": "44px",
        "touch-sm": "36px",
        "touch-lg": "48px",
      },
      minHeight: {
        "screen-safe": "calc(100vh - env(safe-area-inset-top) - env(safe-area-inset-bottom))",
        "touch": "44px",
      },
      maxWidth: {
        "mobile": "480px",
        "tablet": "768px",
        "laptop": "1024px",
        "desktop": "1280px",
        "wide": "1536px",
      },
      fontSize: {
        // Responsive font sizes
        "responsive-xs": ["clamp(0.75rem, 2vw, 0.875rem)", { lineHeight: "1.4" }],
        "responsive-sm": ["clamp(0.875rem, 2.5vw, 1rem)", { lineHeight: "1.5" }],
        "responsive-base": ["clamp(1rem, 3vw, 1.125rem)", { lineHeight: "1.6" }],
        "responsive-lg": ["clamp(1.125rem, 3.5vw, 1.25rem)", { lineHeight: "1.5" }],
        "responsive-xl": ["clamp(1.25rem, 4vw, 1.5rem)", { lineHeight: "1.4" }],
        "responsive-2xl": ["clamp(1.5rem, 5vw, 2rem)", { lineHeight: "1.3" }],
        "responsive-3xl": ["clamp(2rem, 6vw, 3rem)", { lineHeight: "1.2" }],
        "responsive-4xl": ["clamp(2.5rem, 8vw, 4rem)", { lineHeight: "1.1" }],
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
        shimmer: {
          "100%": { transform: "translateX(100%)" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        shimmer: "shimmer 2s infinite",
      },
      boxShadow: {
        soft: "var(--shadow-soft)",
        card: "var(--shadow-card)",
        glow: "var(--shadow-glow)",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
} satisfies Config;
