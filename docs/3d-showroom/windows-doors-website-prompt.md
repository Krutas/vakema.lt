# Build Prompt: Cinematic 3D Website for a Window & Door Replacement Company

> Paste everything below this line into your AI coding agent or give it to your dev team.

---

## ROLE

You are a senior creative technologist and full-stack engineer. You have shipped launch sites for premium automotive brands (the kind where the car is revealed in a dark studio, light sweeps across the bodywork, and the camera glides with weight and inertia). Apply that same cinematic language to a **window and door replacement company**. Build a production-ready website, not a prototype.

## PROJECT SUMMARY

Build a website for **[BRAND_NAME]**, a company that replaces and installs windows and doors. The site has three jobs:

1. **Impress**: an opening sequence where a wireframe showroom assembles around a person, then turns into a fully lit 3D space.
2. **Sell**: a 3D exposition (virtual showroom) where visitors browse, configure and order windows and doors.
3. **Book**: an installation-only service that visitors can book on demand, even if they bought their windows somewhere else.

The business must be able to **add or remove window/door manufacturers** from an admin panel. If no manufacturers are active, the site switches to **installation-only mode** with no code changes.

## HARD RULE: NO EXISTING DATA

- Do **not** use real manufacturer names, logos, product lines, prices, certifications, reviews, statistics, addresses or phone numbers.
- Do **not** download or reference third-party 3D models, product photos or stock imagery of real products.
- All products, manufacturers, prices and copy in seed data must be **clearly fictional placeholders** (for example "Manufacturer A", "Series 01 Tilt & Turn", "€0.00"), stored in one seed file so the client can replace them.
- Build window and door geometry **procedurally** in code (frames, sashes, glass, handles, hinges), driven by parameters. This makes the configurator work for any product the client adds later.
- Keep every user-facing string in a content/i18n file. Hard-coded copy is not allowed.

---

## 1. EXPERIENCE DIRECTION

**Mood:** a dark, quiet studio. Precision engineering. Glass, light, reflections. Think of a supercar unveiling, applied to architectural glazing.

**Palette (tokens, adjustable):**
- `--bg-void`: near-black graphite `#0A0B0D`
- `--surface-glass`: white at 6–10% opacity with a 24–40px backdrop blur
- `--line-wire`: cool cyan-white `#CFE8FF` at 60% (for the wireframe phase)
- `--accent`: one signature colour, used sparingly (placeholder: warm amber `#FFB547`)
- `--text-primary`: `#F2F4F7`, `--text-muted`: `#8A93A3`

**Typography:** a wide, geometric display face for headlines (tracking +2–4%, uppercase for section labels) and a neutral grotesk for body text. Use free, self-hosted fonts only.

**Motion principles:**
- Everything moves with mass: ease-out curves, damping, no linear tweens.
- Camera moves are slow and deliberate (1.2–2.4s), with a short anticipation before each one.
- Light is the hero. Use specular sweeps across glass and frame edges to reveal products, like light running along a car's shoulder line.
- Sound is optional, off by default, with a visible toggle. If enabled: low ambient hum, soft mechanical clicks when a sash locks.

---

## 2. OPENING SEQUENCE: "THE ASSEMBLY" (0–8s)

The visitor arrives in darkness. A showroom builds itself around a single human figure standing in the centre.

**Timeline:**

| Time | Beat |
|---|---|
| 0.0–0.8s | Black screen. A single thin horizontal line of light draws across the floor at the figure's feet. Brand mark fades in faintly, then out. |
| 0.8–2.5s | **Wireframe phase.** A floor grid radiates outward from the figure. Wall edges, then window and door openings, draw themselves as glowing lines (stroke-draw animation, staggered, starting near the figure and moving outward). The figure is a minimal, faceless, low-poly silhouette (procedural, not a scanned human). |
| 2.5–4.0s | **Structure phase.** Frames extrude from the wireframe openings. Sashes swing into place and lock with a subtle bounce. Hardware snaps on. |
| 4.0–5.5s | **Glass phase.** Glass panes slide into the frames and turn from wire outlines into physically based transmissive glass with reflections and slight refraction. |
| 5.5–7.0s | **Light phase.** Studio lights turn on in sequence (overhead strips first, then accent spots). A specular highlight sweeps across the row of products. Floor turns into a dark, glossy reflective surface. |
| 7.0–8.0s | Camera pulls back and settles into the interactive orbit position. Headline and glass navigation fade in. A subtle cue appears: "Move to look around". |

**Requirements:**
- Skippable at any time (click, scroll, Esc, or a visible "Skip intro" button). Skipping jumps cleanly to the final state.
- Played in full only on the first visit. Repeat visits get a 1.5s condensed version (remember this in localStorage).
- With `prefers-reduced-motion`, skip the sequence entirely and show the lit showroom with a soft fade.
- Drive the timeline from one master GSAP timeline (or Theatre.js sequence) so it can be tuned without touching code.

---

## 3. CURSOR-GUIDED CAMERA

After the intro, the camera follows the pointer as if the visitor turns their head in the showroom.

- Map normalised pointer position (-1..1) to camera **yaw ±18°** and **pitch ±8°** around a target point. Clamp the angles so the visitor never sees outside the set.
- Smooth with critically damped springs (or lerp with frame-rate-independent damping, ~0.06–0.1). Never snap.
- Add slight secondary motion: the camera drifts 2–4% after the pointer stops, then settles.
- When the pointer hovers a product, the camera **leans toward it** a little (dolly in 5–10%), and a soft spotlight brightens on that item.
- Click a product: cinematic fly-to (1.6s, eased) into a close-up configuration view. A "Back to showroom" control reverses the move.
- **Touch devices:** use drag to look and tap to select. Optional device-orientation parallax, only after a user gesture and permission prompt.
- **Keyboard:** arrow keys pan the view; Tab moves focus through products, and the camera follows focus.
- Pause the render loop when the tab is hidden or the canvas is off-screen.

---

## 4. GLASS NAVIGATION MENU

A floating, frosted-glass navigation bar that feels like a pane of the product.

- Fixed at the top, inset 16–24px, with rounded corners (16–20px).
- Background: `backdrop-filter: blur(28px) saturate(140%)`, a 1px inner border at white 12%, and a faint top highlight gradient to fake a glass edge.
- A specular highlight follows the cursor across the bar (radial gradient tied to pointer X).
- Items: **Showroom · Windows · Doors · Installation · Manufacturers\* · About · Contact**, plus a primary CTA **"Book Installation"** and an order/cart icon with a count badge.
  - \*The Manufacturers item is hidden automatically when no manufacturers are active.
- On mobile it collapses into a glass sheet that slides up from the bottom, with large touch targets (min 44px).
- Provide a fallback for browsers without `backdrop-filter`: a solid surface at 85% opacity.
- Text contrast on glass must meet WCAG AA against the darkest and lightest scene content behind it. Add a subtle scrim if needed.

---

## 5. 3D EXPOSITION (SHOWROOM + CONFIGURATOR)

### 5.1 Showroom layout
- Two zones in one continuous 3D space: the **Window Gallery** and the **Door Hall**. Moving between them is a camera glide, not a page reload. The URL updates (`/showroom/windows`, `/showroom/doors`) so every view is deep-linkable.
- Products stand on plinths or are set in wall sections, each with a floating glass label (name, manufacturer, "from" price or "Installation only").
- Filters in a glass side panel: manufacturer, type (casement, tilt & turn, sliding, fixed, bay; entrance, patio, French, sliding door), material (uPVC, aluminium, timber, composite), glazing (double, triple), and price range. Filtering animates products in and out (scale + fade + light dim), not a hard swap.

### 5.2 Product close-up and configurator
Opening a product shows it in a close-up with a glass configuration panel:

- **Dimensions:** width and height inputs with min/max limits from the product data. The 3D model **resizes live** (procedural geometry).
- **Opening type:** the sash animates its real movement (tilt, turn, slide, swing) when this option changes, plus an "Operate" button that plays the motion.
- **Frame material and colour:** PBR material swaps with a light sweep transition.
- **Glazing:** double/triple, plus options (frosted, tinted, acoustic, safety). The glass shader changes to match.
- **Hardware:** handle style and finish.
- **Quantity**, plus an **"Add installation"** toggle (on by default).
- **Live price summary** calculated from the product's pricing rules (base + per m² + options + installation). Price logic runs on the server; the client shows an estimate only.
- **Exploded view** button: frame, sash, glazing unit and hardware separate along an axis with labels (classic automotive "exploded drivetrain" shot).
- **Compare:** pin up to 3 configurations and see them side by side.
- Export a configuration as a shareable link and a PDF summary.

### 5.3 Ordering flow
1. Configuration list (cart) with editable items.
2. Property details: address, property type, floor level, access notes, optional photos of current windows/doors.
3. Survey or measurement: "I have exact measurements" vs "Book a free measuring visit".
4. Choose an installation time window (see section 6).
5. Review and submit. The result is a **quote request / order** with status tracking, not an instant card payment. Payment integration is optional and behind a feature flag (`FEATURE_ONLINE_PAYMENT`), off by default.
6. Confirmation screen with a cinematic close (camera pulls back from the configured product, lights dim) plus a confirmation email.

---

## 6. INSTALLATION-ONLY SERVICE (ON DEMAND)

The business must be able to sell **installation only**, for customers who already own their windows or doors.

- Separate entry point: **"Book Installation"** in the navigation and a dedicated `/installation` page.
- Form steps: what to install (windows / doors / both, quantity, approximate sizes), where the products come from ("I already have them" / "Arriving on date X"), removal and disposal of old units (yes/no), address, preferred dates, and photos.
- Show a transparent price **estimate** from admin-defined rules (per unit by size band, plus extras such as disposal, high floors or structural work). Mark it clearly as an estimate pending survey.
- Availability calendar based on admin-defined installer capacity (crews per day, blocked dates). Visitors choose a slot or a half-day window.
- The 3D scene for this page: an empty wall opening in wireframe. A generic window fits itself into the opening while the visitor fills in the form (progress drives the animation).

### Business modes (set in admin, no redeploy)
| Mode | Behaviour |
|---|---|
| `FULL` | Product exposition, ordering and installation booking are all live. |
| `INSTALL_ONLY` | Product exposition and cart are hidden. The showroom shows generic, unbranded procedural windows and doors as ambience only. Every CTA leads to installation booking. |
| Automatic | If zero manufacturers are active, act as `INSTALL_ONLY` and show an admin warning. |

---

## 7. MANUFACTURER MANAGEMENT (ADMIN)

A protected admin panel (role-based: `owner`, `manager`, `staff`).

- **Manufacturers:** create, edit, activate/deactivate, delete. Fields: name, logo upload, description, warranty text, lead time, sort order, active flag.
- **Deactivating** a manufacturer immediately hides all of its products from the showroom, filters and search. Existing orders that include its products are kept and stay readable. Never cascade-delete order history.
- **Products:** linked to one manufacturer. Fields: name, category (window/door), type, procedural geometry parameters (frame profile depth, sash count, mullion layout, default dimensions, min/max size), available materials, colours, glazing options, hardware options, pricing rules, active flag.
- **Live 3D preview** in the admin product editor, so staff can see the procedural model while editing parameters.
- **Installation settings:** price rules, extras, crew capacity, blocked dates, service area (postcodes or radius).
- **Orders and bookings:** list, filters, status pipeline (`New → Survey booked → Quoted → Confirmed → Scheduled → Installed → Closed`), internal notes, customer email notifications on status change.
- **Business mode switch** (`FULL` / `INSTALL_ONLY`).
- **Content:** headlines, copy and section visibility editable without code.
- Audit log for all admin changes.

---

## 8. TECH STACK

- **Framework:** Next.js (App Router) + TypeScript (strict mode)
- **3D:** Three.js via React Three Fiber, `@react-three/drei`, `@react-three/postprocessing` (bloom on light strips, subtle SSAO, tone mapping ACES, light film grain, vignette)
- **Animation:** GSAP (ScrollTrigger where useful) or Theatre.js for the intro timeline; `maath` or spring physics for camera damping
- **State:** Zustand for scene and configurator state; URL search params for shareable configurations
- **Styling:** Tailwind CSS with design tokens as CSS variables
- **Forms:** React Hook Form + Zod (schemas shared between client and server)
- **Backend:** Next.js route handlers / server actions, PostgreSQL, Prisma ORM
- **Auth (admin):** Auth.js with credentials or magic link, role-based access, rate-limited login
- **Storage:** S3-compatible object storage for logos and customer photos (signed uploads, file type and size validation, EXIF stripping)
- **Email:** a transactional email provider behind an adapter interface
- **i18n:** next-intl, with all strings externalised
- **Testing:** Vitest (unit), Playwright (e2e, including the visual intro end state), axe for accessibility checks
- **CI:** lint, type-check, tests and a Lighthouse CI budget on every PR

---

## 9. PERFORMANCE BUDGETS

- First contentful paint < 1.5s on a mid-range phone over 4G. A lightweight HTML/CSS loading state (the single drawing line) shows **before** the 3D bundle loads.
- Load the 3D bundle as a separate, lazy chunk. Initial JS (non-3D) < 180 KB gzipped.
- Target 60 fps on mid-range desktop GPUs and 30+ fps on mid-range phones.
- **Adaptive quality:** detect GPU tier (e.g. `detect-gpu`) and scale DPR (cap at 2), shadow resolution, post-processing passes and reflection quality. Drop quality automatically if frame time stays above budget.
- Procedural geometry with instancing for repeated parts. Any baked textures as KTX2; any static meshes as Draco/Meshopt-compressed glTF.
- Environment lighting from a small, self-made HDR (or generated with `<Environment>` and lightformers). No third-party HDRIs.
- **No-WebGL fallback:** a styled, fully functional 2D version (static renders generated at build time, the same configurator as forms, the same booking flow). The business must never lose a lead because of a device.
- Lighthouse targets: Performance ≥ 85 (mobile), Accessibility ≥ 95, Best Practices ≥ 95, SEO ≥ 95.

---

## 10. ACCESSIBILITY AND SEO

- All 3D interactions have DOM equivalents: products are rendered as an accessible list behind the canvas, keyboard-focusable and in sync with the 3D selection.
- Respect `prefers-reduced-motion`: no intro, no camera drift, instant transitions.
- Visible focus states on glass UI. Contrast meets WCAG 2.2 AA.
- Semantic, server-rendered pages for every product, category and the installation page, with unique titles, meta descriptions, Open Graph images (generated renders) and structured data (`Product`, `Service`, `LocalBusiness` with placeholder values).
- Sitemap and robots.txt generated automatically. Deactivated products return 404 and drop out of the sitemap.

---

## 11. SECURITY AND PRIVACY

- Server-side validation of every input with Zod; never trust client prices.
- CSRF protection, rate limiting on forms and login, bot protection on public forms (honeypot + server-side check).
- Secrets only in environment variables, with a `.env.example` that has no real values.
- Cookie consent banner. Analytics off until consent is given (privacy-friendly analytics preferred).
- GDPR: privacy policy placeholder, customer data export and deletion in admin, data retention setting for customer photos.

---

## 12. DELIVERABLES

1. Full source code in a clean monorepo or single Next.js app with a clear folder structure (`/app`, `/components/ui`, `/components/three`, `/lib`, `/server`, `/prisma`, `/content`).
2. `prisma/seed.ts` with **fictional** placeholder data only: 3 manufacturers ("Manufacturer A/B/C"), 6 windows, 4 doors, installation price rules, and one admin user whose credentials come from env vars.
3. A procedural geometry module (`/components/three/procedural/`) that builds windows and doors from a typed parameter schema, documented with examples.
4. The intro timeline in one file with named, tunable beats.
5. README: setup, env vars, how to add a manufacturer and product, how to switch business modes, how to tune the intro and camera.
6. Tests passing in CI, Lighthouse budgets met, and an accessibility report.

## 13. ACCEPTANCE CRITERIA

- [ ] On first visit, the wireframe showroom assembles around the figure in ≤ 8s, is skippable, and ends in a lit, interactive scene.
- [ ] Moving the mouse turns the camera smoothly within clamped limits; hovering a product leans the camera toward it; clicking flies into the configurator.
- [ ] The glass navigation is legible over every part of the scene and works on mobile.
- [ ] Changing width/height in the configurator resizes the 3D model live, and the price estimate updates.
- [ ] Deactivating a manufacturer in admin removes its products from the public site within one request, without affecting past orders.
- [ ] Deactivating all manufacturers (or choosing `INSTALL_ONLY`) hides the shop and leaves installation booking fully working.
- [ ] A visitor can book installation only, choose an available slot and receive a confirmation email.
- [ ] The no-WebGL and reduced-motion versions are fully functional.
- [ ] No real brand names, logos, products, prices or third-party assets anywhere in the repository.

**Begin by proposing the folder structure, the data model (Prisma schema) and the procedural geometry parameter schema. Wait for approval, then implement in this order: design tokens and glass UI → static showroom scene → camera controller → intro timeline → configurator → ordering → installation booking → admin → fallbacks → tests and performance pass.**
