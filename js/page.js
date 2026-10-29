// Content pages (langai/, durys/, montavimas/): plain HTML that search engines can read, with
// the same glass navigation as the showroom. No three.js, no i18n yet (Lithuanian only).

const $ = (s) => document.querySelector(s);
const body = document.body;

const nav = $('#nav');
nav.addEventListener('pointermove', (e) => {
  const r = nav.getBoundingClientRect();
  nav.style.setProperty('--mx', `${((e.clientX - r.left) / r.width) * 100}%`);
});

// Phone menu, as in js/chrome.js
const menuBtn = $('#menu-btn');
const links = $('#nav-links');
const setMenu = (open) => {
  menuBtn.setAttribute('aria-expanded', String(open));
  links.classList.toggle('is-open', open);
  body.classList.toggle('menu-open', open);
};
menuBtn.addEventListener('click', () => setMenu(menuBtn.getAttribute('aria-expanded') !== 'true'));
document.addEventListener('click', (e) => {
  if (body.classList.contains('menu-open') && !e.target.closest('.nav')) setMenu(false);
});
addEventListener('keydown', (e) => { if (e.key === 'Escape') setMenu(false); });

// Sections fade in as they scroll into view (everything stays visible without JS or with reduced motion)
if (!matchMedia('(prefers-reduced-motion: reduce)').matches && 'IntersectionObserver' in window) {
  const io = new IntersectionObserver((entries) => entries.forEach((en) => {
    if (!en.isIntersecting) return;
    en.target.classList.add('is-in');
    io.unobserve(en.target);
  }), { rootMargin: '0px 0px -8% 0px' });
  document.querySelectorAll('.pg-anim').forEach((el) => { el.classList.add('is-waiting'); io.observe(el); });
}
