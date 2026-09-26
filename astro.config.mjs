import { defineConfig } from 'astro/config';

export default defineConfig({
  site: 'https://vakema.lt',
  output: 'static',
  build: { inlineStylesheets: 'auto' },
  image: { domains: [] },           // all images local
  compressHTML: true,
  vite: {
    build: { assetsInlineLimit: 0 } // never inline assets as base64 — the original sin we're fixing
  }
});
