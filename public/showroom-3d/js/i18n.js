// Two-language UI: Lithuanian (default, written in the HTML) and English (below).
// The language changes only when the visitor presses LT / EN – no browser-language
// detection and nothing remembered between visits.
//
// Markup: data-i18n="key" swaps an element's innerHTML; data-i18n-attr="attr:key;attr:key"
// swaps attributes. Strings built in JavaScript use t('key').

const EN_HTML = {
  'skip': 'Skip to content',
  'nav.home': 'Home',
  'nav.windows': 'Windows',
  'nav.doors': 'Doors',
  'nav.install': 'Installation',
  'nav.work': 'Our work',
  'nav.about': 'About us',
  'nav.contact': 'Contact',
  'cta.quote': 'Get a quote <span aria-hidden="true">→</span>',
  'hero.eyebrow': 'Quality · Reliability · Peace of mind',
  'hero.title': 'For modern homes&nbsp;–<br /><span class="gold">reliable solutions</span>',
  'hero.lead': 'Window and door replacement and installation. Choose your solution – we’ll take care of the rest.',
  'chip.windows': '<i>01</i>Windows',
  'chip.doors': '<i>02</i>Doors',
  'chip.install': '<i>03</i>Installation<em class="soon">Soon</em>',
  'dev.title': 'Preview version',
  'dev.text': 'The site is still in development – some pages and the quote form are on the way.',
  'dev.short': 'Site in development',
  'hint': '<span class="mouse" aria-hidden="true"></span>Move your mouse to look around. Click a product.',
  'skipIntro': 'Skip intro',
  'contacts.eyebrow': 'Contact',
  'contacts.title': 'Get in touch',
  'contacts.lead': 'Visit our showroom or leave a message – we’ll reply within one working day.',
  'contacts.phone': 'Phone',
  'contacts.email': 'Email',
  'contacts.showroom': 'Showroom',
  'contacts.hours': 'Opening hours',
  'contacts.hoursValue': 'Mon–Fri 8:00–18:00',
  'contacts.formTitle': 'Write to us',
  'contacts.name': 'Name',
  'contacts.contact': 'Phone or email',
  'contacts.message': 'Message',
  'contacts.send': 'Send enquiry <span aria-hidden="true">→</span>',
  'contacts.map': 'Vakema showroom',
  'contacts.note': 'Sample contact details for the presentation – they will be replaced with real ones.',
};

const EN_ATTR = {
  'a.home': 'Vakema – home',
  'a.mainNav': 'Main navigation',
  'a.lang': 'Language',
  'a.menu': 'Menu',
  'a.categories': 'Categories',
  'a.products': 'Showroom products',
  'a.hideNotice': 'Hide notice',
  'a.closeContacts': 'Close contact',
  'a.messagePh': 'E.g. I need 4 windows and a patio door replaced',
};

// Strings assembled in JavaScript
const STRINGS = {
  lt: {
    'title': 'Vakema – langai ir durys moderniems namams',
    'toast.quote': 'Pasiūlymo forma bus prijungta kitame etape.',
    'toast.soon': 'Šis puslapis dar kuriamas.',
    'toast.sent': 'Ačiū! Užklausų forma bus prijungta kitame etape.',
    'back.home': '← Grįžti į pagrindinį',
    'back.Langai': '← Atgal į langus',
    'back.Durys': '← Atgal į duris',
    'label.hover': 'Spustelėkite, kad apžiūrėtumėte iš arti',
    'label.text': 'Pritaikysime matmenis, spalvą ir stiklo paketą pagal Jūsų projektą.',
    'label.quote': 'Gauti pasiūlymą →',
    'label.configure': 'Konfigūruoti',
    'soon': 'Netrukus',
    'tag.Langai': 'Langai',
    'tag.Durys': 'Durys',
  },
  en: {
    'title': 'Vakema – windows and doors for modern homes',
    'toast.quote': 'The quote form will be connected in the next phase.',
    'toast.soon': 'This page is still in development.',
    'toast.sent': 'Thank you! The enquiry form will be connected in the next phase.',
    'back.home': '← Back to home',
    'back.Langai': '← Back to windows',
    'back.Durys': '← Back to doors',
    'label.hover': 'Click for a closer look',
    'label.text': 'We’ll tailor the size, colour and glazing to your project.',
    'label.quote': 'Get a quote →',
    'label.configure': 'Configure',
    'soon': 'Soon',
    'tag.Langai': 'Windows',
    'tag.Durys': 'Doors',
    'product.tilt': 'Tilt-and-turn window',
    'product.slide': 'Sliding window system',
    'product.fixed': 'Window with opening top light',
    'product.french': 'French double doors',
    'product.patio': 'Sliding patio doors',
    'product.entry': 'Entrance door',
  },
};

let lang = 'lt';
const listeners = [];
let ltHtml = null;
let ltAttr = null;

/** Translate a JS string; product names fall back to the Lithuanian name passed in. */
export function t(key, fallback) {
  return STRINGS[lang][key] ?? fallback ?? STRINGS.lt[key] ?? key;
}

export const getLang = () => lang;
export const onLangChange = (fn) => listeners.push(fn);

function attrPairs(el) {
  return el.dataset.i18nAttr.split(';').map((p) => p.split(':'));
}

function apply() {
  document.documentElement.lang = lang;
  document.title = t('title');
  document.querySelectorAll('[data-i18n]').forEach((el) => {
    const k = el.dataset.i18n;
    el.innerHTML = lang === 'en' ? EN_HTML[k] : ltHtml.get(el);
  });
  document.querySelectorAll('[data-i18n-attr]').forEach((el) => {
    for (const [attr, k] of attrPairs(el)) el.setAttribute(attr, lang === 'en' ? EN_ATTR[k] : ltAttr.get(el)[attr]);
  });
  document.querySelectorAll('[data-lang]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.lang === lang)));
  listeners.forEach((fn) => fn(lang));
}

export function setLang(next) {
  if (next === lang || !STRINGS[next]) return;
  lang = next;
  apply();
}

export function initI18n() {
  // The HTML is the Lithuanian source: remember it so switching back restores it exactly.
  ltHtml = new Map([...document.querySelectorAll('[data-i18n]')].map((el) => [el, el.innerHTML]));
  ltAttr = new Map([...document.querySelectorAll('[data-i18n-attr]')].map((el) =>
    [el, Object.fromEntries(attrPairs(el).map(([attr]) => [attr, el.getAttribute(attr)]))]));
  document.querySelectorAll('[data-lang]').forEach((b) => b.addEventListener('click', () => setLang(b.dataset.lang)));
}
