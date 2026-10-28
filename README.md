# Vakema – 3D showroom (review build)

Cinematic landing page for Vakema windows and doors: a gold wireframe assembles a V-shaped,
furnished home showroom (windows wall left, doors wall right) set in a daylight garden.

- Cursor-guided camera, glass navigation, clickable windows and doors
- Langai / Durys wall views; the mouse wheel steps through the products
- Animated Kontaktai panel (sample contact details – replace before launch)
- LT / EN language switch (manual only)
- Falls back to a 2D page if the 3D module can't load

Plan and brief: [docs/3d-showroom](docs/3d-showroom/). The previous site lives on the
`legacy-main` branch.

## Run locally

Static files only (Three.js 0.165 and GSAP 3.12 from jsDelivr, fonts from Google Fonts) – no build.

```bash
python -m http.server 5173
```

Then open http://localhost:5173. Returning visitors get a condensed intro; use a private
window to see the full version.

## Deploy

Every push to `main` publishes the site to GitHub Pages
(`.github/workflows/pages.yml`): https://krutas.github.io/vakema.lt/

## Before going live

- Remove the `noindex` meta in `index.html`
- Update the absolute `og:image` URL if the domain changes
- Replace the sample contact details and connect the quote / contact forms
- Remove the "Peržiūros versija" notice
