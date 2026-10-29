# Vakema.lt: Implementation Plan

Cinematic 3D website for Vakema (windows and doors, installation across Lithuania).
Based on [windows-doors-website-prompt.md](windows-doors-website-prompt.md). Where the two differ, **this plan overrides the prompt** (brand colours, language and content structure).

---

## Status (2026-10-29)

### What is built: the static prototype (this repo)
A **static, no-build** version of the showroom, published as the review build at https://krutas.github.io/vakema.lt/ (`python -m http.server 5173` locally). It is a prototype for review gates 2 and 3, **not** the stack from section 3.

| Part | State | Where |
|---|---|---|
| 3D showroom (windows wall, doors wall, focus on a product, sash opening) | Done | `js/scene.js`, `procedural.js`, `furniture.js`, `outdoor.js`, `textures.js` |
| Camera (mouse look, lean-in, fly-to, wheel/swipe stepping, keyboard) | Done | `js/main.js` |
| Intro "The Assembly" | Done (V mark → nav not yet) | `js/intro.js` |
| Device tiers full / reduced / lite, adaptive pixel ratio | Done | `index.html`, `main.js` |
| Lite version (pre-rendered stills + clips, hotspots) | Done, rendered by `tools/capture/render.mjs` | `js/lite.js`, `assets/lite/` |
| LT / EN | Done (one URL, no `/lt` `/en` routes) | `js/i18n.js` |
| Quote form (4 steps, live summary, photos) | Front end done, **sends nothing** (`QUOTE_ENDPOINT` empty, shows "Demonstracinė versija") | `js/quote.js`, `docs/getoffer.md` |
| Contacts panel with form and map | Front end done, **form fakes success** | `js/chrome.js` |
| Mūsų darbai gallery | Works; shows AI-generated install-step placeholders | `js/works.js`, `gallery/`, `tools/gallery.mjs` |
| Offline cache + visitor notice | Done | `sw.js` |
| Langai / Durys / Montavimas pages, configurator | "Netrukus" links only | – |
| Brand set (vector logo, favicons), Phase 1 | Not started; only the raster logo and a simple SVG mark | `docs/3d-showroom/brand/`, `assets/` |
| Backend, admin, database (Phases 2, 8–10) | Not started | – |
| Git repo, deploy | Done: GitHub Pages deploys `main` (`.github/workflows/pages.yml`, resizes the gallery). No lint or tests yet | `.github/workflows/` |

### Decision needed: what happens to the prototype
- **A. Port it.** Keep the prototype as the visual reference and rebuild it in the section 3 stack (Next.js + R3F). Best for SEO, admin and the order flow; costs re-implementing the 3D work (≈ phases 3–6 shrink from 15 d to ~6 d because the design is settled).
- **B. Keep it as the front end.** Keep the static three.js site and add real HTML pages, a small API (forms, later orders) and a headless admin beside it. Faster to launch; the full configurator/admin needs a framework later anyway.

**Recommendation: B for launch, A only if the configurator and admin (phases 7–10) are confirmed.** Most of the business value right now is lead capture, which B covers in days.

### Fix before showing the build to anyone outside the team
1. **Contact form must not claim "sent"** (`js/chrome.js:90`): wire it to the same endpoint as the quote form, or label it as a demo like the quote form.
2. **Work only in this repo.** An unversioned local copy with the site in a `hero/` folder already drifted from it once; retire such copies.
3. **Replace placeholders:** phone `+370 600 00 000`, absolute `og:image` URL (`krutas.github.io`), company details.
4. **Self-host the fonts** (Michroma, Manrope) instead of Google Fonts (GDPR), and confirm Michroma has ą č ę ė į š ų ū ž; otherwise choose another display font.

### Fix before launch
5. **Form backend:** one serverless endpoint for quote + contacts (email to the office, plus a stored copy), per `getoffer.md`. Rate limiting and a honeypot instead of a CAPTCHA.
6. **Indexable content.** Done on 2026-10-29: keyword title and description, canonical, full Open Graph tags, JSON-LD (`HomeAndConstructionBusiness` + `WebSite`, no phone or address until confirmed), a static product list for crawlers, `<noscript>`, `robots.txt`, `sitemap.xml`. All absolute URLs point at the review host until launch. Also done: `langai/`, `durys/`, `montavimas/` (Lithuanian only, `js/page.js`, FAQ + breadcrumb + service structured data, product links open the quote pre-filled via `#pasiulymas=<id>`). Still to do: `/en/` versions, Apie mus, a standalone Kontaktai page, 301s from the old URLs. The 3D showroom stays the home page hero.
7. **Gallery:** "Įgyvendinti projektai" needs real Vakema photos. Move the 10 install-step images to a "Kaip montuojame" section (redrawn or photographed for real, without the AI stamp), or drop them.
8. **UX review of the hero:** the mouse wheel currently flies the camera to the next product instead of scrolling. Reconsider once there is page content below the hero. Also review the intro replay on every visit and the 1.5 s minimum loader time.
9. **Maintenance traps:** the module list with sizes in `index.html` (loader) is kept in sync with the imports by hand, and `sw.js` `VERSION` must be bumped by hand. Generate both in the deploy workflow.
10. **Remove `noindex`** from `index.html` at launch.

---

## 0. Starting point (before the prototype)

### What exists today on vakema.lt
- One-page site in Lithuanian. Nav: *Pagrindinis · Langai · Durys · Paslaugos · Mūsų darbai · Apie mus · Kontaktai*, a language switch (LT) and the CTA **"Gauti pasiūlymą →"**.
- Hero: "KOKYBĖ. PATIKIMUMAS. JŪSŲ RAMYBĖ." / "Moderniems namams – patikimi sprendimai".
- A basic "Skaitmeninis showroomas" with a PVC window configurator (variant, colour, glass). It sends the chosen configuration into the quote request.
- "Vakema standartas" (one process from measuring to installation), a "Mūsų darbai" gallery with placeholder projects, a 4-step process (Konsultacija → Matavimas → Gamyba → Montavimas) and a quote modal (name, phone, email, city, quantity, project info, consent).

**We keep:** the information architecture, the Lithuanian copy tone, the 4-step process, and the idea that the configuration travels into the quote request. **We rebuild:** everything visual and technical.

### Logo (taken from vakema.lt)
Saved as [brand/vakema-logo-original.jpg](brand/vakema-logo-original.jpg).

| Fact | Consequence |
|---|---|
| The file is served as `vakema-logo.png` but is really a **JPEG** (1536×768), with no transparency. | It can't sit on the glass nav or a light background. It also looks blurry at small sizes. |
| It's a detailed, rendered illustration: a gold/chrome **V**, horizontal **speed lines**, a window frame showing a sunset, the **VAKEMA** wordmark (VAKE in gold, MA in chrome), **LANGAI** and the slogan. | Too detailed for a favicon or a 32px nav logo, so it needs simplified versions. |
| The speed lines and metallic finish already speak the "premium sports car" language. | The intro and motion design should be built from it (see 2.3). |

**Note on "no existing data":** the current site shows claims like *10+ metų patirties, 1000+ projektų, 5 metų garantija, A+ / A++ Uw 0.83*. Per the prompt, these **won't be carried over** until the owner confirms each one. Until then they stay as placeholders in the content file.

---

## 1. Brand system (Phase 1, ~3 days)

### 1.1 Logo set to produce
Redraw the logo as **vector SVG**. Don't auto-trace the JPEG, which gives messy edges.

| Asset | Use | Format |
|---|---|---|
| `logo-full` | Intro end card, footer, OG image | SVG + 2× PNG with transparency |
| `logo-horizontal` | V mark + "VAKEMA" on one line, for the glass nav | SVG (gold/chrome gradients) |
| `logo-mono-light` / `logo-mono-dark` | Emails, PDF quotes, invoices | SVG, single colour |
| `mark-v` | Favicon, app icon, loader | SVG + `favicon.ico`, 180px apple-touch, 192/512 PWA |
| `mark-v-3d` | 3D V for the intro (extruded metallic mesh) | Built in code from the SVG path (`ExtrudeGeometry`) |

The metallic look in SVG uses linear gradients (gold: highlight → mid → shadow) and a thin highlight stroke. In 3D it uses real PBR metal (see 1.2).

### 1.2 Colour tokens (replace the amber in the prompt)
Picked by eye from the logo. **Check them with a colour picker against the vector redraw before finalising.**

```css
--bg-void:        #07080A;  /* logo background is pure black */
--gold-100:       #FFE7A3;  /* specular highlight */
--gold-300:       #F2C14E;  /* main gold, the accent */
--gold-500:       #D49A24;  /* mid gold */
--gold-700:       #8A5A12;  /* gold shadow */
--chrome-100:     #F4F6F8;
--chrome-300:     #C9CED4;
--chrome-500:     #8C939B;
--chrome-700:     #3E4349;
--glass-surface:  rgba(255,255,255,0.07);
--glass-border:   rgba(255,255,255,0.12);
--wire:           rgba(242,193,78,0.65);   /* wireframe lines in gold, not cyan */
--text-primary:   #F2F4F7;
--text-muted:     #8A93A3;
```

Rules: gold marks **action and brand** (CTA, active state, light sweeps, wireframe lines). Chrome marks **structure** (frames, borders, secondary text). Small text in gold on black must pass a WCAG AA contrast check; use `--gold-300` or lighter.

**3D materials:** gold metal `color #D49A24, metalness 1, roughness 0.22`; chrome `color #C9CED4, metalness 1, roughness 0.12`. Light both with the studio environment.

### 1.3 Typography
The wordmark is a wide, geometric sans with sharp cuts. Use a free, self-hosted font with the same feel and **full Lithuanian character support** (ą č ę ė į š ų ū ž). Check that before choosing. Candidates: *Michroma / Orbitron* for display text (logo-like), *Inter* or *Manrope* for body text. Section labels in spaced uppercase, like "L A N G A I" in the logo.

---

## 2. Experience, adapted to the Vakema logo

### 2.1 Opening sequence: changes to the prompt
The structure from the prompt stays the same (wireframe → structure → glass → light). These Vakema-specific changes apply:

1. **0–0.8s:** instead of a single line, **the logo's speed lines** streak in from the left in gold and chrome and run along the floor to the figure's feet.
2. **0.8–2.5s:** the wireframe grid and wall openings draw themselves in **gold** lines.
3. **4.0–5.5s:** the first glass pane that fills shows a warm **sunset reflection**, a nod to the window in the logo. Use a self-made environment, no stock HDRI.
4. **7.0–8.0s:** as the camera settles, the **3D V mark** forms from the speed lines above the scene. It shrinks into the nav as `logo-horizontal`. The slogan "Kokybė. Patikimumas. Jūsų ramybė." fades in as the hero line.

### 2.2 Glass navigation
Keep the existing menu items and order, and add the new ones:

`[V VAKEMA]  Showroomas · Langai · Durys · Montavimas · Gamintojai* · Mūsų darbai · Apie mus · Kontaktai   LT/EN   [Gauti pasiūlymą →]  [🛒]`

\*Hidden automatically when no manufacturers are active. "Montavimas" opens the installation-only booking flow.

Use a **gold** cursor-following highlight on the glass, and an active item underline that looks like the logo's gold rule lines.

### 2.3 Motion motifs taken from the logo
- **Speed lines** for page and section transitions: horizontal streaks wipe across the screen, 400–600ms.
- **Gold-to-chrome split:** CTAs and hover states shift their gradient from gold to chrome, like the VAKE|MA split in the wordmark.
- **Light sweeps** run along frame edges when products are revealed.

---

## 3. Architecture

Same stack as the prompt, section 8: Next.js App Router + TS, React Three Fiber/drei/postprocessing, GSAP, Zustand, Tailwind, Prisma + PostgreSQL, Auth.js, S3-compatible storage, next-intl.

**Lithuanian specifics:**
- Default locale `lt`, plus `en`. Routes `/lt/...` and `/en/...`, with `/` redirecting to `/lt`.
- Lithuanian URLs: `/lt/showroomas/langai`, `/lt/showroomas/durys`, `/lt/montavimas`, `/lt/musu-darbai`, `/lt/kontaktai`.
- Prices in EUR with Lithuanian formatting (`1 234,50 €`). Prices shown **with VAT (PVM)**, and the VAT rate is a setting.
- Phone validation for `+370`. Service area by city or municipality (savivaldybė) instead of postcode radius.
- GDPR texts in Lithuanian: privacy policy and cookies are placeholders for the owner's lawyer.

**Hosting (recommendation):** Vercel or a Lithuanian/EU VPS, plus managed Postgres in an EU region (GDPR).

```
/app/[locale]/(site)/...      public pages
/app/[locale]/admin/...       admin panel
/components/ui                glass UI, buttons, forms
/components/three/scene       showroom, lights, environment
/components/three/procedural  window/door generators
/components/three/intro       intro timeline + V mark
/content/{lt,en}.json         all copy
/brand                        logo source files and exports
/prisma                       schema + fictional seed
/server                       pricing, booking, email, storage
```

---

## 4. Phases and milestones

| # | Phase | Main outputs | Est. |
|---|---|---|---|
| 1 | **Brand system** | Vector logo set, favicons, colour/type tokens, glass UI kit (nav, buttons, panels, inputs, modal) in a Storybook-style preview page | 3 d |
| 2 | **Foundation** | Repo, CI (lint/type/test), Next.js + i18n, Prisma schema, fictional seed, env setup, deploy to a preview environment | 2 d |
| 3 | **Static showroom scene** | Dark studio, reflective floor, studio lights, Window Gallery + Door Hall layout, adaptive quality by GPU tier | 4 d |
| 4 | **Procedural products** | Window/door generators (frame, sash, mullions, glass, handles, hinges) from a typed parameter schema; open/tilt/slide/swing animations | 5 d |
| 5 | **Camera controller** | Cursor look with limits and damping, hover lean-in, click fly-to, touch/keyboard, pause when hidden | 2 d |
| 6 | **Intro "The Assembly"** | Gold wireframe → frames → glass → lights → V mark → nav; skip, short replay, reduced-motion | 4 d |
| 7 | **Configurator** | Live sizing, material/colour/glass/hardware, exploded view, compare, share link, PDF summary with mono logo | 5 d |
| 8 | **Ordering / quote flow** | Cart → property details → measuring choice → time slot → quote request; carries over the current site's quote fields (vardas, telefonas, el. paštas, miestas, kiekis, informacija, sutikimas) | 3 d |
| 9 | **Installation-only booking** | `/montavimas` flow, estimate rules, crew-capacity calendar, photo upload, wall-opening 3D scene driven by form progress | 4 d |
| 10 | **Admin** | Manufacturers (on/off, logo upload), products with live 3D preview, pricing, installation settings, orders pipeline, business mode switch (FULL / INSTALL_ONLY), content editing, audit log | 6 d |
| 11 | **Mūsų darbai + content pages** | Project gallery with before/after slider (empty until real projects are added), Apie mus, Kontaktai, legal pages | 2 d |
| 12 | **Fallbacks, a11y, SEO** | No-WebGL 2D version, DOM product list mirrored to the 3D scene, structured data, sitemap, OG images with the Vakema logo | 3 d |
| 13 | **Hardening and launch** | Performance pass (Lighthouse budgets), security review, e2e tests, analytics after consent, 301 redirects from the old site, DNS cutover | 3 d |

**Total: about 46 working days (9–10 weeks) for one senior full-stack/3D developer.** Phases 10–11 can run in parallel with 6–7 if a second developer joins, which brings it to about 6–7 weeks.

### Review gates (owner approval needed)
1. After **Phase 1**: logo redraw and palette.
2. After **Phase 3 + 5**: feel of the showroom and camera, on a preview link.
3. After **Phase 6**: the intro, reviewed on desktop and phone.
4. After **Phase 10**: admin walkthrough, adding and removing a test manufacturer, switching to INSTALL_ONLY.
5. **Pre-launch:** content sign-off (real claims, prices, contacts).

---

## 5. Data model (summary)

`Manufacturer` (id, name, logoUrl, description, warrantyText, leadTimeDays, sortOrder, active)
→ `Product` (id, manufacturerId, category WINDOW|DOOR, type, geometryParams JSON, minW/maxW/minH/maxH, active)
→ `ProductOption` (productId, group MATERIAL|COLOUR|GLAZING|HARDWARE, value, priceRule)
`PricingRule` (base, perM2, optionDeltas, installPerUnit by size band)
`InstallationRule`, `InstallationExtra`, `CrewCapacity` (date, crews), `BlockedDate`, `ServiceArea` (municipality)
`Order` (customer, address, municipality, items JSON snapshot, measuring choice, slot, status, notes)
`InstallBooking` (customer, units, source, disposal, photos, slot, estimate, status)
`Setting` (businessMode, vatRate, featureOnlinePayment), `AuditLog`, `User` (role)

Orders store a **snapshot** of the product and its prices at the time of the order, so deactivating or deleting a manufacturer never breaks order history.

---

## 6. Content needed from Vakema before launch

- [ ] Approval of the redrawn logo (or the original vector file, if the designer has one, which would save a day)
- [ ] Which manufacturers to list at launch (or launch in INSTALL_ONLY mode)
- [ ] Real price rules for products and installation, plus the VAT rate
- [ ] Installer capacity (crews per day) and service area (municipalities)
- [ ] Confirmed company claims (years of experience, project count, warranty), or remove them
- [ ] Contacts, company details (įmonės kodas, PVM kodas), address
- [ ] Real project photos for "Mūsų darbai"
- [ ] Privacy policy and terms (from a lawyer)
- [ ] Domain/DNS access and the email sender address

---

## 7. Risks

| Risk | Mitigation |
|---|---|
| Heavy 3D slows down phones and hurts SEO | Server-rendered HTML first, lazy 3D chunk, GPU-tier quality, a full 2D fallback |
| The detailed raster logo looks bad small or on glass | Vector redraw plus simplified V mark (Phase 1, gate 1) |
| The font lacks Lithuanian characters | Check ą č ę ė į š ų ū ž before choosing the font |
| Unconfirmed marketing claims | Placeholders until owner confirms (section 6) |
| Losing current search rankings | Map old URLs to new ones with 301s; keep page titles and the Lithuanian keywords |

---

## 8. First steps (week 1)
1. `git init` the project in this folder, create the Next.js app, set up CI.
2. Redraw the logo as SVG and export the set into `/brand`.
3. Build the token file and the glass UI kit, and show them on a preview page.
4. Write the Prisma schema and fictional seed, then share the schema for review (as the prompt's final instruction asks).
