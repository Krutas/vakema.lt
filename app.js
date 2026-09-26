const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const coarsePointer = window.matchMedia('(pointer: coarse)').matches;

const PRODUCTS = [
  {
    id: 'pvc', title: 'PVC langai', short: 'Šiluma ir patikimumas', description: 'Šiluma, sandarumas ir efektyvumas kasdien.', asset: 'assets/product-pvc.svg', energy: 'A++', u: '0.83',
    variants: ['Standard', 'Premium', 'Passive'], colors: [{name:'Antracitas',value:'#36383a'},{name:'Balta',value:'#efede6'},{name:'Juoda',value:'#0b0b0b'},{name:'Ąžuolas',value:'#8c5e36'}], glazing: ['Dvigubas', 'Trigubas', 'Akustinis']
  },
  {
    id: 'aluminium', title: 'Aliuminio langai', short: 'Modernus dizainas', description: 'Plonos linijos, dideli formatai ir architektūrinis tikslumas.', asset: 'assets/product-aluminium.svg', energy: 'A+', u: '0.92',
    variants: ['Slim', 'Thermo', 'Panorama'], colors: [{name:'Juoda',value:'#111'},{name:'Antracitas',value:'#343638'},{name:'Bronza',value:'#6f5842'}], glazing: ['Trigubas', 'Saulės kontrolė', 'Akustinis']
  },
  {
    id: 'wood', title: 'Mediniai langai', short: 'Natūrali elegancija', description: 'Natūrali mediena su šiuolaikiniu šilumos ir garso komfortu.', asset: 'assets/product-wood.svg', energy: 'A++', u: '0.86',
    variants: ['Classic', 'Nordic', 'Premium'], colors: [{name:'Natūralus',value:'#9b6a3c'},{name:'Tamsus ąžuolas',value:'#5f3f28'},{name:'Balta',value:'#ebe8df'}], glazing: ['Dvigubas', 'Trigubas']
  },
  {
    id: 'doors', title: 'Įėjimo durys', short: 'Saugumas ir stilius', description: 'Tvirtos, šiltos ir architektūriškai švarios įėjimo durys.', asset: 'assets/product-doors.svg', energy: 'A+', u: '0.95',
    variants: ['Line', 'Vision', 'Secure'], colors: [{name:'Juoda',value:'#111'},{name:'Antracitas',value:'#3b3c3d'},{name:'Medžio',value:'#7b5132'}], glazing: []
  },
  {
    id: 'sliding', title: 'Stumdomos sistemos', short: 'Didesnės erdvės', description: 'Daugiau šviesos, platesnės angos ir vientisas ryšys su terasa.', asset: 'assets/product-sliding.svg', energy: 'A+', u: '0.98',
    variants: ['Slide', 'Lift & Slide', 'Panorama'], colors: [{name:'Juoda',value:'#111'},{name:'Antracitas',value:'#383a3b'},{name:'Bronza',value:'#75624b'}], glazing: ['Trigubas', 'Saulės kontrolė']
  }
];

const state = {
  productId: 'pvc', variant: 'Premium', color: 'Antracitas', glazing: 'Trigubas'
};

const heroProducts = $('[data-hero-products]');
const tabs = $('[data-category-tabs]');
const productPreview = $('[data-product-preview]');
const stageIndex = $('[data-stage-index]');
const stageName = $('[data-stage-name]');
const configTitle = $('[data-config-title]');
const configDescription = $('[data-config-description]');
const variantsRoot = $('[data-option-variants]');
const colorsRoot = $('[data-option-colors]');
const glazingRoot = $('[data-option-glazing]');
const glazingGroup = $('[data-glazing-group]');
const energy = $('[data-energy]');
const uvalue = $('[data-uvalue]');

function productById(id){ return PRODUCTS.find(product => product.id === id) || PRODUCTS[0]; }

function renderHeroProducts(){
  heroProducts.innerHTML = PRODUCTS.map(product => `
    <button class="hero-product ${product.id === state.productId ? 'is-active' : ''}" type="button" data-product="${product.id}" aria-label="${product.title}">
      <span class="hero-product-visual" style="--product-image:url('${product.asset}')"></span>
      <span class="hero-product-copy"><span><strong>${product.title}</strong><small>${product.short}</small></span><b>→</b></span>
    </button>`).join('');
}

function renderTabs(){
  tabs.innerHTML = PRODUCTS.map(product => `<button class="category-tab ${product.id === state.productId ? 'is-active' : ''}" type="button" role="tab" aria-selected="${product.id === state.productId}" data-product="${product.id}">${product.title}</button>`).join('');
}

function normalizeState(product){
  if(!product.variants.includes(state.variant)) state.variant = product.variants[0];
  if(!product.colors.some(color => color.name === state.color)) state.color = product.colors[0].name;
  if(!product.glazing.includes(state.glazing)) state.glazing = product.glazing[0] || '';
}

function renderConfigurator(animate = false){
  const product = productById(state.productId);
  normalizeState(product);

  if(animate && !reduceMotion){
    productPreview.classList.add('is-changing');
    window.setTimeout(() => productPreview.classList.remove('is-changing'), 210);
  }

  productPreview.style.backgroundImage = `url('${product.asset}')`;
  productPreview.style.backgroundPosition = 'center';
  stageIndex.textContent = String(PRODUCTS.indexOf(product) + 1).padStart(2, '0');
  stageName.textContent = product.title;
  configTitle.textContent = product.title;
  configDescription.textContent = product.description;
  energy.textContent = product.energy;
  uvalue.textContent = product.u;

  variantsRoot.innerHTML = product.variants.map(value => `<button type="button" class="option ${state.variant === value ? 'is-active' : ''}" data-variant="${value}">${value}</button>`).join('');
  colorsRoot.innerHTML = product.colors.map(color => `<button type="button" class="swatch ${state.color === color.name ? 'is-active' : ''}" style="--swatch:${color.value}" data-color="${color.name}" aria-label="${color.name}" title="${color.name}"></button>`).join('');
  glazingRoot.innerHTML = product.glazing.map(value => `<button type="button" class="option ${state.glazing === value ? 'is-active' : ''}" data-glazing="${value}">${value}</button>`).join('');
  glazingGroup.hidden = product.glazing.length === 0;

  $$('.hero-product').forEach(button => button.classList.toggle('is-active', button.dataset.product === state.productId));
  $$('.category-tab').forEach(button => { const active = button.dataset.product === state.productId; button.classList.toggle('is-active', active); button.setAttribute('aria-selected', String(active)); });
  $$('[data-hotspot]').forEach(button => button.classList.toggle('is-active', button.dataset.hotspot === state.productId));
  updateQuoteSelection();
}

function selectProduct(id, scroll = false){
  state.productId = id;
  const product = productById(id);
  state.variant = product.variants[0];
  state.color = product.colors[0].name;
  state.glazing = product.glazing[0] || '';
  renderConfigurator(true);
  if(scroll) $('#showroom').scrollIntoView({behavior: reduceMotion ? 'auto' : 'smooth', block:'start'});
}

renderHeroProducts();
renderTabs();
renderConfigurator(false);

document.addEventListener('click', event => {
  const productButton = event.target.closest('[data-product]');
  if(productButton){ selectProduct(productButton.dataset.product, productButton.classList.contains('hero-product')); return; }

  const hotspot = event.target.closest('[data-hotspot]');
  if(hotspot){ selectProduct(hotspot.dataset.hotspot, true); return; }

  const categoryLink = event.target.closest('[data-category-link]');
  if(categoryLink){ selectProduct(categoryLink.dataset.categoryLink, false); }

  const variant = event.target.closest('[data-variant]');
  if(variant){ state.variant = variant.dataset.variant; renderConfigurator(true); return; }

  const color = event.target.closest('[data-color]');
  if(color){ state.color = color.dataset.color; renderConfigurator(true); return; }

  const glazing = event.target.closest('[data-glazing]');
  if(glazing){ state.glazing = glazing.dataset.glazing; renderConfigurator(true); return; }

  const scrollButton = event.target.closest('[data-scroll-target]');
  if(scrollButton){ $(scrollButton.dataset.scrollTarget)?.scrollIntoView({behavior: reduceMotion ? 'auto' : 'smooth'}); }
});

const hero = $('[data-hero]');
const heroCamera = $('[data-hero-camera]');
let targetX = 0, targetY = 0, currentX = 0, currentY = 0, raf = null;
function parallaxFrame(){
  currentX += (targetX - currentX) * 0.065;
  currentY += (targetY - currentY) * 0.065;
  heroCamera.style.transform = `translate3d(${currentX}px, ${currentY}px, 0) scale(1.02)`;
  if(Math.abs(targetX-currentX) > .08 || Math.abs(targetY-currentY) > .08) raf = requestAnimationFrame(parallaxFrame); else raf = null;
}
if(!reduceMotion && !coarsePointer && hero && heroCamera){
  hero.addEventListener('pointermove', event => {
    const rect = hero.getBoundingClientRect();
    const nx = (event.clientX - rect.left) / rect.width - .5;
    const ny = (event.clientY - rect.top) / rect.height - .5;
    targetX = nx * -46; targetY = ny * -28;
    if(!raf) raf = requestAnimationFrame(parallaxFrame);
  }, {passive:true});
  hero.addEventListener('pointerleave', () => { targetX = 0; targetY = 0; if(!raf) raf = requestAnimationFrame(parallaxFrame); });
}

const header = $('[data-header]');
const menuToggle = $('[data-menu-toggle]');
const mobileMenu = $('[data-mobile-menu]');
function setMenu(open){
  mobileMenu.classList.toggle('is-open', open);
  menuToggle.setAttribute('aria-expanded', String(open));
  menuToggle.setAttribute('aria-label', open ? 'Uždaryti meniu' : 'Atidaryti meniu');
}
menuToggle?.addEventListener('click', () => setMenu(menuToggle.getAttribute('aria-expanded') !== 'true'));
$$('.mobile-menu a').forEach(link => link.addEventListener('click', () => setMenu(false)));
window.addEventListener('scroll', () => header.classList.toggle('is-scrolled', window.scrollY > 36), {passive:true});

const observedSections = $$('main > section[id]');
const navLinks = $$('.nav a[href^="#"]');
const navObserver = new IntersectionObserver(entries => {
  entries.forEach(entry => {
    if(!entry.isIntersecting) return;
    navLinks.forEach(link => link.classList.toggle('is-active', link.getAttribute('href') === `#${entry.target.id}` || (entry.target.id === 'showroom' && ['Langai','Durys'].includes(link.textContent.trim()))));
  });
}, {rootMargin:'-35% 0px -55%'});
observedSections.forEach(section => navObserver.observe(section));

const drawer = $('[data-quote-drawer]');
const backdrop = $('[data-drawer-backdrop]');
const quoteSelection = $('[data-quote-selection]');
const quoteForm = $('[data-quote-form]');
const formStatus = $('[data-form-status]');
let lastFocused = null;
function updateQuoteSelection(){
  if(!quoteSelection) return;
  const product = productById(state.productId);
  quoteSelection.innerHTML = `<h3>${product.title} · ${state.variant}</h3><p>${state.color}${state.glazing ? ` · ${state.glazing}` : ''}<br>${product.energy} · Uw ${product.u}</p>`;
}
function openQuote(){
  lastFocused = document.activeElement;
  updateQuoteSelection();
  backdrop.hidden = false;
  requestAnimationFrame(() => { backdrop.classList.add('is-visible'); drawer.classList.add('is-open'); });
  drawer.setAttribute('aria-hidden','false');
  document.body.classList.add('drawer-open');
  window.setTimeout(() => $('[name="name"]', drawer)?.focus(), reduceMotion ? 0 : 300);
}
function closeQuote(){
  backdrop.classList.remove('is-visible'); drawer.classList.remove('is-open'); drawer.setAttribute('aria-hidden','true'); document.body.classList.remove('drawer-open');
  window.setTimeout(() => { backdrop.hidden = true; lastFocused?.focus?.(); }, reduceMotion ? 0 : 320);
}
$$('[data-open-quote]').forEach(button => button.addEventListener('click', openQuote));
$('[data-close-quote]')?.addEventListener('click', closeQuote);
backdrop?.addEventListener('click', closeQuote);
document.addEventListener('keydown', event => { if(event.key === 'Escape'){ if(drawer.classList.contains('is-open')) closeQuote(); else setMenu(false); } });

quoteForm?.addEventListener('submit', event => {
  event.preventDefault();
  if(!quoteForm.reportValidity()) return;
  const data = Object.fromEntries(new FormData(quoteForm).entries());
  const product = productById(state.productId);
  const payload = {
    ...data,
    configuration: {productId: product.id, product: product.title, variant: state.variant, color: state.color, glazing: state.glazing, energyClass: product.energy, uValue: product.u},
    createdAt: new Date().toISOString(), source: 'vakema-showroom-v1'
  };
  const pending = JSON.parse(localStorage.getItem('vakema.pendingLeads') || '[]');
  pending.push(payload);
  localStorage.setItem('vakema.pendingLeads', JSON.stringify(pending.slice(-10)));
  formStatus.textContent = 'Užklausa paruošta. Backend integracija bus prijungta kitame etape.';
  quoteForm.reset();
});
