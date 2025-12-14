# Meow Meow - Complete Device & Platform Support Guide

## 1. Mobile Devices

### Smartphones
| Device Category | Examples | Screen Width | Support |
|-----------------|----------|--------------|---------|
| **Small Phones** | iPhone SE, Galaxy A series | 320px - 374px | ✅ Full |
| **Standard Phones** | iPhone 14/15, Pixel 8, Galaxy S24 | 375px - 427px | ✅ Full |
| **Large Phones/Phablets** | iPhone 15 Pro Max, Galaxy Note, OnePlus | 428px - 767px | ✅ Full |

### Mobile Features
- ✅ Portrait & landscape orientation
- ✅ Retina/high-density displays (2x, 3x)
- ✅ Touch input optimization (44px min targets)
- ✅ Safe area support (notch, home indicator)
- ✅ Pull-to-refresh disabled
- ✅ Smooth scrolling
- ✅ PWA installation

---

## 2. Tablets

| Device Category | Examples | Screen Width | Support |
|-----------------|----------|--------------|---------|
| **Small Tablets** | iPad Mini, Kindle Fire | 768px - 833px | ✅ Full |
| **Standard Tablets** | iPad Air, Galaxy Tab S9 | 834px - 1023px | ✅ Full |
| **Large Tablets** | iPad Pro 12.9", Galaxy Tab S9 Ultra | 1024px - 1365px | ✅ Full |
| **Foldables (Closed)** | Galaxy Z Fold | ~280px | ✅ Full |
| **Foldables (Open)** | Galaxy Z Fold | 717px - 884px | ✅ Full |

### Tablet Features
- ✅ Larger touch targets
- ✅ Split-screen multitasking support
- ✅ Portrait & landscape layouts
- ✅ Keyboard attachment support
- ✅ Stylus input detection

---

## 3. Laptops & Desktops

| Device Category | Examples | Screen Width | Support |
|-----------------|----------|--------------|---------|
| **Small Laptops** | MacBook Air 13", Chromebook | 1024px - 1279px | ✅ Full |
| **Standard Laptops** | MacBook Pro 14", Windows laptops | 1280px - 1535px | ✅ Full |
| **Desktop Monitors** | iMac 24", Windows desktops | 1536px - 1919px | ✅ Full |
| **Large Desktops** | iMac 27", 4K monitors | 1920px - 2559px | ✅ Full |
| **Ultra-wide/5K** | Ultra-wide monitors, 5K displays | 2560px+ | ✅ Full |

### Desktop Features
- ✅ Mouse & keyboard input
- ✅ Hover interactions
- ✅ Wide screen layouts
- ✅ High-DPI/Retina displays
- ✅ Custom scrollbars
- ✅ Keyboard navigation
- ✅ Focus visible states

---

## 4. Chromebooks

| Device | Screen Size | Support |
|--------|-------------|---------|
| Google Pixelbook | 1024px+ | ✅ Full |
| Acer Chromebook | 1024px+ | ✅ Full |
| Samsung Chromebook | 1024px+ | ✅ Full |
| HP Chromebook | 1024px+ | ✅ Full |

### Chromebook Features
- ✅ Touchscreen + keyboard hybrid
- ✅ Chrome browser PWA support
- ✅ Tablet mode detection
- ✅ Android app compatibility (PWA)

---

## 5. Wearables (Limited Support)

| Device | Support Level | Notes |
|--------|---------------|-------|
| Apple Watch | 📱 Notifications only | Via iPhone companion |
| Samsung Galaxy Watch | 📱 Notifications only | Via Android companion |
| Fitbit | ❌ Not supported | No web browser |

### Wearable Features
- 📱 Push notifications (via companion device)
- ❌ Full web view not supported

---

## 6. TV & Large Screens

| Device | Screen Size | Support |
|--------|-------------|---------|
| Smart TVs (Samsung, LG, Sony) | 1920px+ | ✅ Basic |
| Apple TV | 1920px+ | ⚠️ Limited |
| Android TV | 1920px+ | ⚠️ Limited |
| Roku | - | ❌ No browser |

### TV Features
- ✅ 1080p layout support
- ✅ 4K layout support
- ⚠️ D-pad/remote navigation (limited)
- ⚠️ No touch input

---

## Browser Support

| Browser | Windows | macOS | Linux | Android | iOS | ChromeOS |
|---------|---------|-------|-------|---------|-----|----------|
| **Chrome** | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Safari** | - | ✅ | - | - | ✅ | - |
| **Firefox** | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Edge** | ✅ | ✅ | ✅ | ✅ | ✅ | - |
| **Opera** | ✅ | ✅ | ✅ | ✅ | - | - |
| **Brave** | ✅ | ✅ | ✅ | ✅ | - | - |
| **Samsung Internet** | - | - | - | ✅ | - | - |
| **Vivaldi** | ✅ | ✅ | ✅ | ✅ | - | - |

---

## Tailwind CSS Breakpoints

```css
/* Mobile Devices */
xs: 320px      /* Small phones */
sm: 375px      /* Standard phones */
phablet: 428px /* Large phones / Phablets */

/* Tablets */
md: 768px       /* Small tablets */
tablet: 834px   /* Standard tablets */
tablet-lg: 1024px /* Large tablets */

/* Laptops & Desktops */
lg: 1024px     /* Small laptops / Chromebooks */
laptop: 1280px /* Standard laptops */
xl: 1280px     /* Desktop monitors */
2xl: 1536px    /* Large desktops */
3xl: 1920px    /* Ultra-wide / 4K */
4xl: 2560px    /* 5K / Large displays */
```

---

## Special Device Modifiers

```css
/* Device-specific */
mobile:        /* Phones only (max-width: 767px) */
tablet-only:   /* Tablets only (768px - 1023px) */
laptop-only:   /* Laptops only (1024px - 1279px) */
desktop:       /* Desktop and above (1280px+) */

/* Foldable devices */
fold-closed:   /* Galaxy Fold closed (280px) */
fold-open:     /* Galaxy Fold open (717px - 884px) */

/* Input methods */
touch:         /* Touch devices */
stylus:        /* Stylus input */
mouse:         /* Mouse/trackpad */
keyboard:      /* Keyboard navigation */

/* Display quality */
retina:        /* 2x displays */
retina-3x:     /* 3x displays (Super Retina) */

/* Orientation */
portrait:      /* Portrait mode */
landscape:     /* Landscape mode */

/* Screen dimensions */
short:         /* Short screens (< 500px height) */
tall:          /* Tall screens (> 900px height) */
wide:          /* Ultra-wide (21:9 aspect ratio) */

/* TV & Large screens */
tv:            /* TV screens (1920x1080+) */
tv-4k:         /* 4K TV screens */

/* User preferences */
motion-safe:   /* Animations enabled */
motion-reduce: /* Reduced motion preference */
dark-mode:     /* Dark mode preference */
light-mode:    /* Light mode preference */
high-contrast: /* High contrast mode */
```

---

## Usage Examples

```tsx
// Responsive layout
<div className="
  px-4 py-2           // Mobile default
  sm:px-6 sm:py-4     // Standard phones
  md:px-8 md:py-6     // Tablets
  lg:px-12 lg:py-8    // Laptops
  xl:px-16 xl:py-10   // Desktops
">

// Touch vs Mouse interactions
<button className="
  touch:min-h-[48px]  // Larger on touch devices
  mouse:hover:scale-105 // Hover effect on mouse
">

// Orientation-specific
<div className="
  portrait:flex-col    // Stack vertically in portrait
  landscape:flex-row   // Side by side in landscape
">

// Foldable support
<div className="
  fold-closed:text-sm  // Smaller text when fold is closed
  fold-open:text-base  // Normal text when open
">

// Reduced motion
<div className="
  motion-safe:animate-fade-in  // Animate normally
  motion-reduce:opacity-100    // No animation
">
```

---

## Installation Methods by Device

| Device Type | Method | Instructions |
|-------------|--------|--------------|
| **iPhone/iPad** | PWA | Safari → Share → Add to Home Screen |
| **Android** | PWA | Chrome → Menu → Install App |
| **Windows** | PWA / Electron | Browser → Install / Download .exe |
| **macOS** | PWA / Electron | Browser → Install / Download .dmg |
| **Linux** | PWA / Electron | Browser → Install / Download .AppImage |
| **Chromebook** | PWA | Chrome → Install |
| **Smart TV** | Web Browser | Navigate to app URL |
