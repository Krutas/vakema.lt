const body = document.body;
const wipe = document.querySelector('.page-wipe');
const links = document.querySelectorAll('a[href^="#"]');
const heroImage = document.querySelector('.hero-image');
const form = document.querySelector('.contact-form');
const note = document.querySelector('.form-note');
const menu = document.querySelector('.desktop-nav');
const menuToggle = document.querySelector('.menu-toggle');
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// Replace, reorder, or add products here. The carousel layout does not change.
// Example replacement:
// {title:'Pintinė su pomidorais', description:'Švieži sezoniniai pomidorai', image:'assets/pomidorai.jpg', href:'#contact'}
const PRODUCT_ITEMS = [
  {title: 'PVC langai', description: 'Šiluma ir efektyvumas', image: 'assets/product-carousel-reference.png', position: '8% center', href: '#contact'},
  {title: 'Aliuminio langai', description: 'Modernus dizainas', image: 'assets/product-carousel-reference.png', position: '31% center', href: '#contact'},
  {title: 'Mediniai langai', description: 'Natūrali elegancija', image: 'assets/product-carousel-reference.png', position: '53% center', href: '#contact'},
  {title: 'Pintinė su pomidorais', description: 'Šviežias pasirinkimas', image: 'assets/tomatoes-basket.svg', position: 'center', href: '#contact'},
  {title: 'Stumdomos sistemos', description: 'Daugiau erdvės', image: 'assets/product-carousel-reference.png', position: '94% center', href: '#contact'}
];

const productCarousel = document.querySelector('[data-product-carousel]');
const productTrack = productCarousel?.querySelector('[data-product-track]');
const productCount = productCarousel?.querySelector('.product-carousel-count');
let productIndex = 0;

function renderProducts() {
  if (!productTrack) return;
  productTrack.innerHTML = PRODUCT_ITEMS.map((item, index) => `
    <article class="product-card">
      <div class="product-card-image" style="background-image:url('${item.image}');background-position:${item.position || 'center'}"></div>
      <div class="product-card-content">
        <span class="product-card-index">${String(index + 1).padStart(2, '0')} / ${String(PRODUCT_ITEMS.length).padStart(2, '0')}</span>
        <h3>${item.title}</h3>
        <p>${item.description}</p>
        <a class="product-card-link" href="${item.href || '#contact'}">Atrasti sprendimą <span aria-hidden="true">↗</span></a>
      </div>
    </article>`).join('');
  updateProductCarousel();
}

function updateProductCarousel() {
  if (!productTrack || !productCount) return;
  const card = productTrack.querySelector('.product-card');
  if (!card) return;
  const gap = parseFloat(getComputedStyle(productTrack).gap) || 0;
  const visible = window.innerWidth <= 720 ? 1 : window.innerWidth <= 1000 ? 2 : 3;
  const maxIndex = Math.max(0, PRODUCT_ITEMS.length - visible);
  productIndex = Math.min(productIndex, maxIndex);
  productTrack.style.transform = `translateX(-${productIndex * (card.getBoundingClientRect().width + gap)}px)`;
  productCount.textContent = `${String(productIndex + 1).padStart(2, '0')} / ${String(PRODUCT_ITEMS.length).padStart(2, '0')}`;
}

productCarousel?.querySelector('[data-carousel-prev]')?.addEventListener('click', () => {
  productIndex = Math.max(0, productIndex - 1);
  updateProductCarousel();
});
productCarousel?.querySelector('[data-carousel-next]')?.addEventListener('click', () => {
  const visible = window.innerWidth <= 720 ? 1 : window.innerWidth <= 1000 ? 2 : 3;
  productIndex = Math.min(Math.max(0, PRODUCT_ITEMS.length - visible), productIndex + 1);
  updateProductCarousel();
});
window.addEventListener('resize', updateProductCarousel);
let carouselTouchStart = 0;
productCarousel?.addEventListener('touchstart', (event) => { carouselTouchStart = event.touches[0].clientX; }, {passive: true});
productCarousel?.addEventListener('touchend', (event) => {
  const distance = event.changedTouches[0].clientX - carouselTouchStart;
  if (Math.abs(distance) < 40) return;
  const direction = distance < 0 ? 1 : -1;
  const visible = window.innerWidth <= 720 ? 1 : window.innerWidth <= 1000 ? 2 : 3;
  productIndex = Math.max(0, Math.min(Math.max(0, PRODUCT_ITEMS.length - visible), productIndex + direction));
  updateProductCarousel();
}, {passive: true});
renderProducts();

links.forEach((link) => {
  link.addEventListener('click', (event) => {
    const target = document.querySelector(link.getAttribute('href'));
    if (!target) return;
    event.preventDefault();
    if (!reduceMotion) wipe.classList.add('is-active');
    window.setTimeout(() => target.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth' }), reduceMotion ? 0 : 260);
    window.setTimeout(() => wipe.classList.remove('is-active'), reduceMotion ? 0 : 820);
    menu?.classList.remove('mobile-open');
    menuToggle?.setAttribute('aria-expanded', 'false');
    menuToggle?.setAttribute('aria-label', 'Atidaryti meniu');
  });
});

window.addEventListener('pointermove', (event) => {
  if (window.matchMedia('(pointer: coarse)').matches || !heroImage) return;
  const x = (event.clientX / window.innerWidth - 0.5) * 26;
  const y = (event.clientY / window.innerHeight - 0.5) * 18;
  heroImage.style.transform = `scale(1.14) translate(${x}px, ${y}px)`;
});

const revealObserver = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    if (entry.isIntersecting) {
      entry.target.animate([{opacity: 0, transform: 'translateY(24px)'}, {opacity: 1, transform: 'translateY(0)'}], {duration: 850, easing: 'cubic-bezier(.76,0,.24,1)', fill: 'forwards'});
      revealObserver.unobserve(entry.target);
    }
  });
}, {threshold: 0.16});
document.querySelectorAll('.solution-card,.process-grid > div,.manifesto-copy').forEach((el) => revealObserver.observe(el));

form.addEventListener('submit', (event) => {
  event.preventDefault();
  note.textContent = 'Ačiū — susisieksime su Jumis artimiausiu metu.';
  form.reset();
});

menuToggle?.addEventListener('click', () => {
  const isOpen = menu.classList.toggle('mobile-open');
  menuToggle.setAttribute('aria-expanded', String(isOpen));
  menuToggle.setAttribute('aria-label', isOpen ? 'Uždaryti meniu' : 'Atidaryti meniu');
});

document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape' && menu?.classList.contains('mobile-open')) {
    menu.classList.remove('mobile-open');
    menuToggle?.setAttribute('aria-expanded', 'false');
    menuToggle?.focus();
  }
});

const sections = [...document.querySelectorAll('main > section[id]')];
const navItems = [...document.querySelectorAll('.desktop-nav a')];
const sectionObserver = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    if (!entry.isIntersecting) return;
    navItems.forEach((item) => item.classList.toggle('active', item.getAttribute('href') === `#${entry.target.id}`));
  });
}, {rootMargin: '-35% 0px -55%'});
sections.forEach((section) => sectionObserver.observe(section));
