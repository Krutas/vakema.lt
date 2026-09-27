# Design QA — VAKEMA immersive landing page

## Verification target

- Public preview: https://krutas.github.io/vakema.lt/
- Verified: 2026-09-27
- State: desktop landing page and quote drawer
- Source branch: `main`

## Confirmed

- GitHub Pages deployment completes successfully.
- The public page loads with the expected title, navigation, hero, interactive hotspots, product rail, showroom, services, projects, process, contact section and footer.
- The quote drawer opens from the showroom CTA.
- The selected configuration is transferred into the quote drawer:
  - product: PVC langai
  - variant: Premium
  - color: Antracitas
  - glazing: Trigubas
  - energy class: A++
  - Uw: 0.83
- Required form controls and consent checkbox are exposed to assistive technology.
- No application JavaScript errors were observed in the browser console. The only recorded errors originated from the browser automation extension, not from Vakema assets or scripts.

## Visual findings

- Desktop hero composition, navigation and CTA hierarchy render correctly.
- The quote drawer is readable, correctly aligned and keeps the selected configuration visible.
- The current hero background is visibly soft at desktop size and remains a placeholder; production replacement requirements are tracked in `ASSETS.md`.
- Current project cards are placeholders and still require real Vakema project photography/content.

## Remaining verification

- [ ] Mobile viewport visual pass on a real phone or device-emulated browser.
- [ ] Keyboard-only focus-order and focus-trap verification through the complete quote drawer flow.
- [ ] End-to-end form submission after the dedicated Vakema backend is provisioned.
- [ ] Production asset fidelity pass after final hero, logo master and real project images are supplied.

## Result

final result: desktop preview passed; mobile, production assets and backend submission remain pending
