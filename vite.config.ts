import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import { VitePWA } from "vite-plugin-pwa";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
  },
  build: {
    // Optimize chunk splitting for faster loading
    rollupOptions: {
      output: {
        manualChunks: {
          // Core React bundle - loaded first
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          // UI components bundle
          'ui-vendor': ['@radix-ui/react-dialog', '@radix-ui/react-tooltip', '@radix-ui/react-popover'],
          // Query and data
          'query-vendor': ['@tanstack/react-query'],
        },
      },
    },
    // Minimize chunk sizes
    chunkSizeWarningLimit: 500,
    // Enable minification
    minify: 'esbuild',
    // Target modern browsers for smaller output
    target: 'es2020',
  },
  // Enable dependency pre-bundling
  optimizeDeps: {
    include: ['react', 'react-dom', 'react-router-dom', '@tanstack/react-query'],
  },
  plugins: [
    react(),
    mode === "development" && componentTagger(),
    VitePWA({
      registerType: "prompt",
      includeAssets: ["favicon.ico", "icons/*.png", "screenshots/*.png", "splash/*.png"],
      manifest: {
        name: "Meow Meow - Dating & Chat",
        short_name: "Meow Meow",
        description: "Connect, chat, and find meaningful relationships with Meow Meow dating app. Available on all devices.",
        start_url: "/?source=pwa",
        id: "/",
        display: "standalone",
        display_override: ["standalone", "minimal-ui", "window-controls-overlay"],
        background_color: "#141a26",
        theme_color: "#1aa39b",
        orientation: "any",
        scope: "/",
        lang: "en",
        dir: "ltr",
        categories: ["social", "lifestyle", "dating", "entertainment"],
        icons: [
          {
            src: "/icons/icon-180x180.png",
            sizes: "180x180",
            type: "image/png",
            purpose: "any"
          },
          {
            src: "/icons/icon-192x192.png",
            sizes: "192x192",
            type: "image/png",
            purpose: "any"
          },
          {
            src: "/icons/icon-512x512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "any"
          },
          {
            src: "/icons/icon-512x512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "maskable"
          }
        ],
        shortcuts: [
          {
            name: "Chat",
            short_name: "Chat",
            description: "Open your chats",
            url: "/chat?source=shortcut",
            icons: [{ src: "/icons/icon-192x192.png", sizes: "192x192", type: "image/png" }]
          },
          {
            name: "Wallet",
            short_name: "Wallet",
            description: "View your wallet",
            url: "/wallet?source=shortcut",
            icons: [{ src: "/icons/icon-192x192.png", sizes: "192x192", type: "image/png" }]
          },
          {
            name: "Matches",
            short_name: "Matches",
            description: "View your matches",
            url: "/match-discovery?source=shortcut",
            icons: [{ src: "/icons/icon-192x192.png", sizes: "192x192", type: "image/png" }]
          }
        ],
        share_target: {
          action: "/share-target",
          method: "POST",
          enctype: "multipart/form-data",
          params: {
            title: "title",
            text: "text",
            url: "url",
            files: [
              {
                name: "media",
                accept: ["image/*"]
              }
            ]
          }
        },
        protocol_handlers: [
          {
            protocol: "web+meowmeow",
            url: "/handle-protocol?url=%s"
          }
        ],
        handle_links: "preferred",
        launch_handler: {
          client_mode: ["navigate-existing", "auto"]
        },
        prefer_related_applications: false
      },
      workbox: {
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
        globPatterns: ["**/*.{js,css,html,ico,png,svg,woff,woff2,webp,jpg,jpeg}"],
        skipWaiting: true,
        clientsClaim: true,
        cleanupOutdatedCaches: true,
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/.*\.supabase\.co\/.*/i,
            handler: "StaleWhileRevalidate",
            options: {
              cacheName: "supabase-cache",
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 60 * 60,
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },
          {
            urlPattern: /\.(?:png|jpg|jpeg|svg|gif|webp)$/,
            handler: "CacheFirst",
            options: {
              cacheName: "image-cache",
              expiration: {
                maxEntries: 200,
                maxAgeSeconds: 60 * 60 * 24 * 30,
              },
            },
          },
          {
            urlPattern: /\.(?:woff|woff2|ttf|eot)$/,
            handler: "CacheFirst",
            options: {
              cacheName: "font-cache",
              expiration: {
                maxEntries: 30,
                maxAgeSeconds: 60 * 60 * 24 * 365,
              },
            },
          },
          {
            urlPattern: /\.(?:js|css)$/,
            handler: "StaleWhileRevalidate",
            options: {
              cacheName: "static-cache",
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 60 * 60 * 24 * 7,
              },
            },
          },
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: "CacheFirst",
            options: {
              cacheName: "google-fonts-cache",
              expiration: {
                maxEntries: 30,
                maxAgeSeconds: 60 * 60 * 24 * 365,
              },
            },
          },
          {
            urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
            handler: "CacheFirst",
            options: {
              cacheName: "gstatic-fonts-cache",
              expiration: {
                maxEntries: 30,
                maxAgeSeconds: 60 * 60 * 24 * 365,
              },
            },
          },
        ],
      },
      devOptions: {
        enabled: mode === "development",
        type: "module",
      },
    }),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
