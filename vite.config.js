import { defineConfig } from 'vite';
import basicSsl from '@vitejs/plugin-basic-ssl';
import { VitePWA } from 'vite-plugin-pwa';

const isDev = process.env.NODE_ENV !== 'production';

export default defineConfig({
  plugins: [
    ...(isDev ? [basicSsl()] : []),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'AR Tracing Projector',
        short_name: 'AR Trace',
        start_url: '/',
        display: 'standalone',
        background_color: '#000000',
        theme_color: '#1a1a2e',
        icons: [
          { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icon-512.png', sizes: '512x512', type: 'image/png' }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,png}']
      }
    })
  ],
  server: {
    https: true,
    host: '0.0.0.0'
  }
});
