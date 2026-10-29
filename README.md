# Vakema – 3D showroom (review build)

Cinematic landing page for Vakema windows and doors: a gold wireframe assembles a V-shaped,
furnished home showroom (windows wall left, doors wall right) set in a daylight garden.

- Cursor-guided camera, glass navigation, clickable windows and doors
- Langai / Durys wall views; the mouse wheel (or a vertical swipe on phones) steps through the products
- "Mūsų darbai" gallery carousel fed by the `gallery/` folder: drop photos in (subfolder = tag, see
  [gallery/README.md](gallery/README.md)); the Pages workflow resizes them and lists them in `gallery.json`
- Kontaktai window over the showroom, closes on a click outside (the phone number is still a sample); Google map of the showroom address
- Four-step "Gauti pasiūlymą" quote request (demo: nothing is sent yet – plan in [docs/getoffer.md](docs/getoffer.md))
- LT / EN language switch (manual only)
- Content pages for search engines: [langai/](langai/), [durys/](durys/), [montavimas/](montavimas/) (Lithuanian only,
  no three.js, `js/page.js`); their product links open the quote form pre-filled (`#pasiulymas=<id>`).
  Structured data, `robots.txt` and `sitemap.xml` point at the review host until launch
- 3D is always the default: weak devices, software rendering or Save-Data get a reduced 3D (no ambient
  occlusion, lower resolution). A lite version without WebGL – pre-rendered stills and clips of the same
  scene with clickable products – opens only when the visitor asks for it (loader button, corner switch,
  `?lite=1`; this tab only) or when the 3D can't run at all
- The site's files stay in the browser after the first visit (`sw.js`); the loader says so, and a notice
  after loading lets visitors opt out or hide it for good

Plan and brief: [docs/3d-showroom](docs/3d-showroom/). The previous site lives on the
`legacy-main` branch.

## Run locally

Static files only (Three.js 0.165 and GSAP 3.12 from jsDelivr, fonts from Google Fonts) – no build.

```bash
python -m http.server 5173
```

Then open http://localhost:5173. Returning visitors get a condensed intro; use a private
window to see the full version.

## Lite version assets

The stills, clips and hotspot positions in `assets/lite/` are rendered from the real 3D scene
(`?capture=1`, virtual time, one frame per step). After changing the scene, render them again
(Node 22+, Chrome, ffmpeg on PATH; `--stills` skips the clips):

```bash
node tools/capture/render.mjs
```

## Deploy

Every push to `main` publishes the site to GitHub Pages
(`.github/workflows/pages.yml`): https://krutas.github.io/vakema.lt/

## Before going live

- Remove the `noindex` meta in `index.html`
- Update the absolute `og:image` URL if the domain changes
- Replace the sample contact details and connect the quote / contact forms (see docs/getoffer.md)
- Remove the "Peržiūros versija" notice
