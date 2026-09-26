# Vakema asset pipeline

## Hero

Current `assets/hero-house.jpg` is a lightweight placeholder and should not be treated as the final production master.

Production target:

- master: at least 3840×2160
- desktop delivery: AVIF/WebP, 2560–3200 px wide depending on crop
- mobile delivery: portrait-specific crop, around 1600–2000 px tall
- keep 6–10% overscan around the visible composition for pointer/gyro parallax
- do not upscale a small source to satisfy the target dimensions
- preserve architectural detail in glass, frames and facade edges

## Product carousel

Current `assets/product-carousel-reference.png` is a single strip placeholder.

Final structure should become:

- `assets/products/pvc.webp`
- `assets/products/aluminium.webp`
- `assets/products/wood.webp`
- `assets/products/doors.webp`
- `assets/products/sliding.webp`

Recommended product renders:

- transparent WebP/AVIF where practical
- 1200–1600 px high source render
- identical camera angle and pedestal/light direction across all five categories
- safe padding around the product so hover scaling never clips the render

## Logo

Keep a vector master (SVG/PDF/AI) outside the optimized delivery files. The current PNG is suitable only as a temporary web fallback.

## Loading rules

- hero is preload/priority
- current and next product can preload
- remaining product/project media is lazy-loaded
- never ship the full-resolution master directly to browsers
