# Vakema.lt — Content editing (no coding required)

## Products (the carousel)

All product cards live in one file: **`src/content/products.json`**.

Each entry looks like this:

```json
{
  "id": "langai-pvc",
  "title": "PVC langai",
  "description": "Šiluma ir tyla Jūsų namams.",
  "image": "../assets/hero-house.jpg",
  "position": "center",
  "href": "#kontaktai"
}
```

| Field | What it does | Rules |
|---|---|---|
| `id` | unique internal name | any unique text |
| `title` | card heading | required |
| `description` | card text | required |
| `image` | picture shown on the card | path to a file in `src/assets/` |
| `position` | image crop focus | `center`, `top`, `bottom` (optional, default `center`) |
| `href` | where the card links | optional, default `#kontaktai` |

**To add a product:** copy an entry, change the values, save. The site rebuilds and the new card appears in the carousel. Invalid or missing fields fail the build with a clear error — the site can never ship a broken card.

**Images:** put new photos into `src/assets/` first, then reference them as `"../assets/<filename>"`. The build automatically creates fast AVIF/WebP versions — no resizing needed by hand.

## Process steps

The three "Kaip mes dirbame" steps are in `src/pages/index.astro`, in the `steps={[ ... ]}` list — each has `n`, `title`, `body`. Edit the text in place; keep the quotes and commas.

## Page texts

Section headings and paragraphs live in their components under `src/components/` (e.g. `Manifesto.astro`, `Hero.astro`). Change only the visible Lithuanian text between the tags.

## Contact form

- The form sends leads to the `PUBLIC_LEAD_ENDPOINT` URL (set in `.env`, see `.env.example`).
- Success/error messages shown to visitors are in `src/scripts/contact-form.ts`.
