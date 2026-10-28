# Vakema 3D showroom – hero (review build)

Standalone cinematic hero: a gold wireframe assembles a V-shaped, furnished home showroom (windows
wall left, doors wall right) set in a daylight garden. Cursor-guided camera, glass navigation,
clickable windows/doors, Langai/Durys wall views, mouse-wheel stepping through the products,
an animated Kontaktai panel (sample contact details) and an LT/EN switch. Plan and brief: [docs/3d-showroom](../../docs/3d-showroom/).

- Static files only (Three.js 0.165 + GSAP 3.12 from jsDelivr, fonts from Google Fonts).
- Vite copies `public/` as-is, so a build serves this at `/showroom-3d/` (keep the trailing slash).
- Run locally without a build: `python -m http.server 5173 --directory public/showroom-3d`
- Review-only settings in `index.html`: `noindex` meta and the absolute `og:image` domain – update both before going live.
- If the 3D module can't load, the page falls back to a 2D version (safety net in `index.html`).
- Returning visitors get a condensed intro; open in a private window to see the full version.
