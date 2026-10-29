// Page chrome shared by the 3D showroom and the lite version: navigation, sheets
// (contacts, quote), toasts and the product card text. No three.js here.
import { PRODUCTS } from './products.js';
import { getLang, onLangChange, t } from './i18n.js';
import { initQuote } from './quote.js';
import { initWorks } from './works.js';

const $ = (s) => document.querySelector(s);
const body = document.body;

/* ------------------------------------------------------------------ */
/* Page chrome: navigation, sheets, language                           */
/* ------------------------------------------------------------------ */
export function initChrome() {
  initCacheNotice();

  const nav = $('#nav');
  nav.addEventListener('pointermove', (e) => {
    const r = nav.getBoundingClientRect();
    nav.style.setProperty('--mx', `${((e.clientX - r.left) / r.width) * 100}%`);
  });

  const menuBtn = $('#menu-btn');
  const links = $('#nav-links');
  const setMenu = (open) => {
    menuBtn.setAttribute('aria-expanded', String(open));
    links.classList.toggle('is-open', open);
    body.classList.toggle('menu-open', open);
  };
  menuBtn.addEventListener('click', () => setMenu(menuBtn.getAttribute('aria-expanded') !== 'true'));
  // Phone menu: a tap on the dimmed page around it (body::after in CSS) closes it
  document.addEventListener('click', (e) => {
    if (body.classList.contains('menu-open') && !e.target.closest('.nav')) setMenu(false);
  });

  // "Under development" notice: dismissible for the session
  const banner = $('#dev-banner');
  try { if (sessionStorage.getItem('vakema:dev-banner') === 'hidden') banner.classList.add('is-hidden'); } catch { /* storage blocked */ }
  banner.querySelector('.dev-close').addEventListener('click', () => {
    banner.classList.add('is-hidden');
    try { sessionStorage.setItem('vakema:dev-banner', 'hidden'); } catch { /* storage blocked */ }
  });

  // Sheets: glass pages that grow out of the link or button that opened them
  const homeLink = links.querySelector('a[href="./"]');
  let activeSheet = null;
  function createSheet(section, { hash, navLink = null, onOpen = null }) {
    let opener = null;
    const isOpen = () => section.classList.contains('is-open');
    const sheet = { section, isOpen, open, close };
    function open(from) {
      if (isOpen()) return;
      onOpen?.();
      activeSheet?.close(false);
      opener = from;
      const r = from.getBoundingClientRect();
      section.style.setProperty('--ox', `${r.left + r.width / 2}px`);
      section.style.setProperty('--oy', `${r.top + r.height / 2}px`);
      section.hidden = false;
      section.getBoundingClientRect(); // commit the closed state so the opening animates
      section.classList.add('is-open');
      body.classList.add('sheet-open');
      setMenu(false);
      if (navLink) { homeLink.removeAttribute('aria-current'); navLink.setAttribute('aria-current', 'page'); }
      history.replaceState(null, '', hash);
      activeSheet = sheet;
      setTimeout(() => section.querySelector('.sheet-close').focus({ preventScroll: true }), 450);
    }
    function close(restoreFocus = true) {
      if (!isOpen()) return;
      section.classList.remove('is-open');
      body.classList.remove('sheet-open');
      if (navLink) { navLink.removeAttribute('aria-current'); homeLink.setAttribute('aria-current', 'page'); }
      history.replaceState(null, '', location.pathname + location.search);
      if (activeSheet === sheet) activeSheet = null;
      setTimeout(() => { if (!isOpen()) section.hidden = true; }, 900);
      if (restoreFocus) opener?.focus({ preventScroll: true });
    }
    section.querySelectorAll('[data-close]').forEach((el) => el.addEventListener('click', () => close()));
    return sheet;
  }

  // Kontaktai
  const contactsLink = links.querySelector('[data-contacts]');
  const contacts = createSheet($('#kontaktai'), { hash: '#kontaktai', navLink: contactsLink, onOpen: loadMap });
  document.querySelectorAll('[data-contacts]').forEach((a) => a.addEventListener('click', (e) => {
    e.preventDefault();
    contacts.open(a);
  }));
  $('#kontaktai form').addEventListener('submit', (e) => {
    e.preventDefault();
    toast(t('toast.sent'));
  });

  // Mūsų darbai: gallery carousel, built on first open
  const worksLink = links.querySelector('[data-works]');
  const gallery = initWorks($('#darbai'), { t, getLang, onLangChange, products: PRODUCTS });
  const works = createSheet($('#darbai'), { hash: '#darbai', navLink: worksLink, onOpen: () => gallery.open() });
  document.querySelectorAll('[data-works]').forEach((a) => a.addEventListener('click', (e) => {
    e.preventDefault();
    works.open(a);
  }));

  // Gauti pasiūlymą: any [data-quote] button opens it; a product card pre-fills that product
  const quoteSheet = createSheet($('#pasiulymas'), { hash: '#pasiulymas' });
  const quote = initQuote($('#pasiulymas'), { products: PRODUCTS, t, onLangChange });
  document.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-quote]');
    if (!btn) return;
    e.preventDefault();
    const product = btn.dataset.quote;
    quote.setEntry(product ? `product:${product}` : btn.closest('.nav') ? 'nav' : 'hero');
    if (product) quote.addProduct(product);
    quoteSheet.open(btn);
  });

  // Capture phase, so Escape closes the sheet before the showroom handles it
  addEventListener('keydown', (e) => {
    if (!activeSheet) return;
    if (e.key === 'Escape') {
      e.stopPropagation();
      activeSheet.close();
    } else if (e.key === 'Tab') {
      const f = [...activeSheet.section.querySelectorAll('button, a[href], input, select, textarea')]
        .filter((el) => !el.disabled && !el.closest('[hidden], .hp'));
      const i = f.indexOf(document.activeElement);
      if (e.shiftKey && i <= 0) { e.preventDefault(); f[f.length - 1].focus(); }
      else if (!e.shiftKey && i === f.length - 1) { e.preventDefault(); f[0].focus(); }
    }
  }, true);
  if (location.hash === '#kontaktai') contacts.open(contactsLink);
  if (location.hash === '#darbai') works.open(worksLink);
  if (location.hash === '#pasiulymas') quoteSheet.open($('.nav-cta'));

  // 3D ⇄ lite switch: the lite choice lasts for this tab only, 3D stays the default
  const isLite = document.documentElement.dataset.tier === 'lite';
  const switches = document.querySelectorAll('[data-tier-switch]');
  const labelSwitches = () => switches.forEach((b) => { b.textContent = t(isLite ? 'tier.to3d' : 'tier.toLite'); });
  labelSwitches();
  onLangChange(labelSwitches);
  switches.forEach((b) => b.addEventListener('click', () => {
    if (!isLite) { window.__vakemaLite(); return; }
    try { sessionStorage.removeItem('vakema:fallback'); } catch { /* storage blocked */ }
    location.href = location.pathname + '?3d=1';
  }));

  document.addEventListener('click', (e) => {
    const soon = e.target.closest('[data-soon]');
    if (!soon) return;
    e.preventDefault();
    toast(t('toast.soon'));
  });
}

let toastTimer;
export function toast(text) {
  const el = $('#toast');
  el.textContent = text;
  el.classList.add('is-visible');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('is-visible'), 2600);
}

/** Inner HTML of the floating product card: a short teaser on hover, actions when focused. */
export function labelHTML(spec, isFocus) {
  return `
      <span class="tag">${t(`tag.${spec.tag}`)}</span>
      <h2>${t(`product.${spec.id}`, spec.name)}</h2>
      ${isFocus
        ? `<p>${t('label.text')}</p>
           <div class="label-actions">
             <a class="btn btn-gold" href="#pasiulymas" data-quote="${spec.id}">${t('label.quote')}</a>
             <a class="btn btn-glass" href="#" data-soon>${t('label.configure')} <em class="soon">${t('soon')}</em></a>
           </div>`
        : `<p>${t('label.hover')}</p>`}`;
}

/* ------------------------------------------------------------------ */
/* Temporary files: sw.js keeps the site in the browser after the first visit.
   The visitor is told once and can opt out, which empties the cache for good. */
/* ------------------------------------------------------------------ */
const CACHE_OFF = 'vakema:cache';
const CACHE_SEEN = 'vakema:cache-notice';
const storage = {
  get(k) { try { return localStorage.getItem(k); } catch { return null; } },
  set(k, v) { try { localStorage.setItem(k, v); } catch { /* storage blocked */ } },
};

async function dropCache() {
  const regs = await navigator.serviceWorker.getRegistrations();
  await Promise.all(regs.map((r) => r.unregister()));
  const keys = await caches.keys();
  await Promise.all(keys.filter((k) => k.startsWith('vakema-')).map((k) => caches.delete(k)));
}

function initCacheNotice() {
  if (!('serviceWorker' in navigator) || new URLSearchParams(location.search).has('capture')) return;
  if (storage.get(CACHE_OFF) === 'off') { dropCache().catch(() => {}); return; }
  // On the first visit the worker starts after the page has loaded: hand it the files already
  // fetched, so this visit is kept in full rather than only what is fetched from now on.
  const register = async () => {
    try {
      await navigator.serviceWorker.register('sw.js');
      const reg = await navigator.serviceWorker.ready;
      const keep = () => reg.active?.postMessage({ keep: [location.href, ...performance.getEntriesByType('resource').map((r) => r.name)] });
      keep();
      setTimeout(keep, 10000); // and what arrived while it was taking over
    } catch (err) { console.warn('No offline cache.', err); }
  };
  if (document.readyState === 'complete') register();
  else addEventListener('load', register, { once: true });

  let seenThisVisit = false;
  try { seenThisVisit = !!sessionStorage.getItem(CACHE_SEEN); } catch { /* storage blocked */ }
  if (storage.get(CACHE_SEEN) || seenThisVisit) return;
  const notice = $('#cache-notice');
  notice.hidden = false;
  // "Supratau" hides it for this visit; with "Daugiau nerodyti" ticked, for good
  const forget = notice.querySelector('[data-cache-forget]');
  const close = (forever) => {
    if (forever || forget.checked) storage.set(CACHE_SEEN, '1');
    else try { sessionStorage.setItem(CACHE_SEEN, '1'); } catch { /* storage blocked */ }
    notice.classList.add('is-leaving');
    setTimeout(() => { notice.hidden = true; }, 400);
  };
  notice.querySelector('[data-cache-ok]').addEventListener('click', () => close(false));
  notice.querySelector('[data-cache-off]').addEventListener('click', async () => {
    storage.set(CACHE_OFF, 'off');
    close(true);
    try { await dropCache(); } catch { /* nothing cached yet */ }
    toast(t('cache.cleared'));
  });
}

/* Google map in Kontaktai: built from the showroom address, so changing the address in
   index.html ([data-address]) moves the pin too. Keyless embed, set only on first open. */
function loadMap() {
  const frame = $('#kontaktai .map-frame');
  if (frame.src) return;
  const q = encodeURIComponent($('#kontaktai [data-address]').textContent.trim());
  frame.src = `https://www.google.com/maps?q=${q}&z=15&hl=lt&output=embed`;
  $('#kontaktai [data-map-link]').href = `https://www.google.com/maps/search/?api=1&query=${q}`;
}
