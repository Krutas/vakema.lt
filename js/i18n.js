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
  'contacts.map': 'Vakema head office',
  'contacts.note': 'Sample contact details for the presentation – they will be replaced with real ones.',
  'quote.eyebrow': 'Get a quote',
  'quote.title': 'Your project – our offer',
  'quote.lead': 'A few steps – and within one working day we’ll prepare a preliminary offer and arrange a free measurement.',
  'quote.step1': 'Project',
  'quote.step2': 'Products',
  'quote.step3': 'Property',
  'quote.step4': 'Contact',
  'quote.s1.title': 'What do you need?',
  'quote.scope': 'Products',
  'quote.scope.windows': 'Windows',
  'quote.scope.doors': 'Doors',
  'quote.scope.both': 'Windows and doors',
  'quote.work': 'Type of work',
  'quote.work.replace': 'Replacing old ones',
  'quote.work.new': 'New build',
  'quote.install': 'Installation',
  'quote.install.yes': 'With installation',
  'quote.install.no': 'Products only',
  'quote.removal': 'Removal and disposal of the old windows and doors',
  'quote.s2.title': 'Which products and how many?',
  'quote.addItem': '+ Add a product',
  'quote.unknownSize': 'I don’t know the exact sizes – measurement needed',
  'quote.profile': 'Frame',
  'quote.profile.alu': 'Aluminium',
  'quote.profile.wood': 'Wood',
  'quote.advise': 'Advise me',
  'quote.glazing': 'Glazing',
  'quote.glazing.double': 'Double',
  'quote.glazing.triple': 'Triple',
  'quote.color': 'Colour',
  'quote.color.white': 'White',
  'quote.color.anthracite': 'Anthracite',
  'quote.color.wood': 'Wood effect',
  'quote.manufacturer': 'Manufacturer',
  'quote.s3.title': 'Where will the work be done?',
  'quote.property': 'Property',
  'quote.property.house': 'House',
  'quote.property.apartment': 'Apartment',
  'quote.property.commercial': 'Commercial premises',
  'quote.city': 'City or district *',
  'quote.address': 'Address (optional)',
  'quote.timing': 'When are you planning?',
  'quote.timing.asap': 'As soon as possible',
  'quote.timing.1m': 'Within a month',
  'quote.timing.3m': 'In 1–3 months',
  'quote.timing.planning': 'Still planning',
  'quote.photos': 'Photos of the current windows or openings (optional, up to 5)',
  'quote.comment': 'Comment',
  'quote.s4.title': 'How can we reach you?',
  'quote.name': 'Name *',
  'quote.phone': 'Phone *',
  'quote.email': 'Email *',
  'quote.channel': 'What suits you?',
  'quote.channel.phone': 'Give me a call',
  'quote.channel.email': 'Write me an email',
  'quote.consent': 'I agree that my data is processed to prepare the offer, as described in the privacy policy. *',
  'quote.marketing': 'I’d like to receive offers and news (optional)',
  'quote.prev': '← Back',
  'quote.next': 'Next →',
  'quote.submit': 'Send request →',
  'quote.summary': 'Your request',
  'quote.trust1': 'Free measurement',
  'quote.trust2': 'Reply within 1 working day',
  'quote.trust3': 'No obligation',
  'quote.done.title': 'Thank you! Request received.',
  'quote.done.1': 'Within one working day we’ll contact you to clarify the details.',
  'quote.done.2': 'We’ll arrange a free on-site measurement.',
  'quote.done.3': 'You’ll receive an exact offer with price and timing.',
  'quote.done.back': 'Back to the showroom',
  'quote.done.again': 'New request',
  'quote.demo': 'Demo version: the request is not sent or stored anywhere.',
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
  'a.close': 'Close',
  'a.quoteCommentPh': 'E.g. second floor, window sills needed too',
};

// Strings assembled in JavaScript
const STRINGS = {
  lt: {
    'title': 'Vakema – langai ir durys moderniems namams',
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
    'quote.anyMaker': 'Neturiu pirmenybės',
    'quote.item.other': 'Kita',
    'quote.item.type': 'Gaminys',
    'quote.item.choose': 'Pasirinkite…',
    'quote.item.qty': 'Kiekis',
    'quote.item.width': 'Plotis, cm',
    'quote.item.height': 'Aukštis, cm',
    'quote.item.remove': 'Pašalinti gaminį',
    'quote.err.scope': 'Pasirinkite, ko reikia.',
    'quote.err.type': 'Pasirinkite gaminį.',
    'quote.err.qty': 'Kiekis nuo 1 iki 99.',
    'quote.err.size': 'Matmuo nuo 30 iki 1000 cm.',
    'quote.err.city': 'Nurodykite miestą ar rajoną.',
    'quote.err.photoCount': 'Daugiausia 5 nuotraukos.',
    'quote.err.photoSize': 'Viena nuotrauka – iki 10 MB.',
    'quote.err.name': 'Įrašykite vardą.',
    'quote.err.phone': 'Įrašykite telefono numerį.',
    'quote.err.email': 'Įrašykite el. pašto adresą.',
    'quote.err.consent': 'Be sutikimo negalėsime paruošti pasiūlymo.',
    'quote.err.send': 'Nepavyko išsiųsti. Bandykite dar kartą arba paskambinkite mums.',
    'quote.sum.scope': 'Gaminiai',
    'quote.sum.work': 'Darbai',
    'quote.sum.removal': 'su išmontavimu',
    'quote.sum.install': 'Montavimas',
    'quote.sum.items': 'Sąrašas',
    'quote.sum.prefs': 'Pageidavimai',
    'quote.sum.property': 'Objektas',
    'quote.sum.timing': 'Terminas',
    'quote.sum.photos': 'Nuotraukos',
    'quote.sum.contact': 'Kontaktas',
    'quote.sum.empty': 'Jūsų pasirinkimai atsiras čia.',
    'quote.sum.advised': 'Patars specialistas',
    'quote.done.ref': 'Užklausos Nr.',
    'quote.done.demo': 'demonstracinė',
  },
  en: {
    'title': 'Vakema – windows and doors for modern homes',
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
    'quote.anyMaker': 'No preference',
    'quote.item.other': 'Other',
    'quote.item.type': 'Product',
    'quote.item.choose': 'Choose…',
    'quote.item.qty': 'Qty',
    'quote.item.width': 'Width, cm',
    'quote.item.height': 'Height, cm',
    'quote.item.remove': 'Remove product',
    'quote.err.scope': 'Choose what you need.',
    'quote.err.type': 'Choose a product.',
    'quote.err.qty': 'Quantity from 1 to 99.',
    'quote.err.size': 'Size from 30 to 1000 cm.',
    'quote.err.city': 'Enter a city or district.',
    'quote.err.photoCount': 'Up to 5 photos.',
    'quote.err.photoSize': 'Each photo up to 10 MB.',
    'quote.err.name': 'Enter your name.',
    'quote.err.phone': 'Enter a phone number.',
    'quote.err.email': 'Enter an email address.',
    'quote.err.consent': 'We need your consent to prepare the offer.',
    'quote.err.send': 'Sending failed. Please try again or give us a call.',
    'quote.sum.scope': 'Products',
    'quote.sum.work': 'Work',
    'quote.sum.removal': 'with removal',
    'quote.sum.install': 'Installation',
    'quote.sum.items': 'List',
    'quote.sum.prefs': 'Preferences',
    'quote.sum.property': 'Property',
    'quote.sum.timing': 'Timing',
    'quote.sum.photos': 'Photos',
    'quote.sum.contact': 'Contact',
    'quote.sum.empty': 'Your choices will appear here.',
    'quote.sum.advised': 'Our specialist will advise',
    'quote.done.ref': 'Request No.',
    'quote.done.demo': 'demo',
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
