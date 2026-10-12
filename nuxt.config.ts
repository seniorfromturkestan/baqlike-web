import { fileURLToPath } from 'node:url';

// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  ssr: false,
  srcDir: 'src/',

  devServer: {
    host: '0.0.0.0',
    port: 3000,
  },

  modules: [
    '@nuxtjs/tailwindcss',
    '@pinia/nuxt',
    'pinia-plugin-persistedstate/nuxt',
    '@nuxtjs/i18n',
    '@vant/nuxt',
    '@vueuse/nuxt',
    '@vite-pwa/nuxt'
  ],

  components: {
    dirs: [
      { path: '~/shared/ui', pathPrefix: false, extensions: ['.vue'] },
      { path: '~/entities', pathPrefix: false, extensions: ['.vue'] },
      { path: '~/features', pathPrefix: false, extensions: ['.vue'] },
      { path: '~/widgets', pathPrefix: false, extensions: ['.vue'] },
    ],
  },

  alias: {
    '@shared': fileURLToPath(new URL('./src/shared', import.meta.url)),
    '@entities': fileURLToPath(new URL('./src/entities', import.meta.url)),
    '@features': fileURLToPath(new URL('./src/features', import.meta.url)),
    '@widgets': fileURLToPath(new URL('./src/widgets', import.meta.url)),
    '@pages': fileURLToPath(new URL('./src/pages', import.meta.url))
  },

  tailwindcss: {
    cssPath: '~/assets/css/main.css',
    configPath: 'tailwind.config.js'
  },

  css: [
    'vant/lib/index.css',
    '~/assets/css/main.css'
  ],

  app: {
    pageTransition: { name: 'fade', mode: 'out-in' },
    head: {
      title: 'BaqLike Staff',
      meta: [
        { charset: 'utf-8' },
        {
          name: 'viewport',
          content: 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover'
        },
        { name: 'theme-color', content: '#FFFFFF' },
        { name: 'apple-mobile-web-app-capable', content: 'yes' },
        { name: 'apple-mobile-web-app-status-bar-style', content: 'default' }
      ],
      link: [
        { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
        { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossorigin: '' },
        { rel: 'stylesheet', href: 'https://fonts.googleapis.com/css2?family=Montserrat:ital,wght@0,300..900;1,300..900&display=swap' }
      ],
      script: [
        { src: 'https://telegram.org/js/telegram-web-app.js' },
        {
          innerHTML: `(function() {
  try {
    var theme = localStorage.getItem('baqlike-color-scheme') || localStorage.getItem('vueuse-color-mode');
    var isDark = theme === 'dark' || (!theme && window.matchMedia('(prefers-color-scheme: dark)').matches);
    if (isDark) {
      document.documentElement.classList.add('dark');
      document.documentElement.style.backgroundColor = '#020617';
    } else {
      document.documentElement.classList.remove('dark');
      document.documentElement.style.backgroundColor = '#f8fafc';
    }
  } catch (e) {}
})();`,
          type: 'text/javascript',
        },
      ],
    }
  },

  experimental: {
    viewTransition: true,
  },

  i18n: {
    strategy: 'no_prefix',
    defaultLocale: 'ru',
    restructureDir: 'src',
    langDir: 'shared/config/i18n/locales',
    locales: [
      { code: 'ru', name: 'Русский', file: 'ru.json' },
      { code: 'kk', name: 'Қазақша', file: 'kk.json' },
    ],
  },

  pwa: {
    registerType: 'autoUpdate',
    manifest: {
      name: 'BaqLike Barista',
      short_name: 'BaqLike',
      description: 'Рабочее место бариста сети BaqLike',
      theme_color: '#6C3CE1',
      background_color: '#020617',
      display: 'standalone',
      orientation: 'portrait',
      start_url: '/shift',
      icons: [
        {
          src: '/pwa-192x192.png',
          sizes: '192x192',
          type: 'image/png',
          purpose: 'any'
        },
        {
          src: '/pwa-512x512.png',
          sizes: '512x512',
          type: 'image/png',
          purpose: 'any maskable'
        }
      ]
    },
    workbox: {
      navigateFallback: null,
      globPatterns: ['**/*.{js,css,html,png,svg,ico,woff,woff2}']
    },
    client: {
      installPrompt: true
    },
    devOptions: {
      enabled: false
    }
  },

  runtimeConfig: {
    public: {
      firebase: {
        apiKey: '',
        authDomain: '',
        projectId: '',
        storageBucket: '',
        messagingSenderId: '',
        appId: '',
      },
    },
  },

  devtools: { enabled: false }
})
