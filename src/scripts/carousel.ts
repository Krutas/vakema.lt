import { visibleCards, clampIndex } from './carousel-math';

export function initCarousel(): void {
  const productCarousel = document.querySelector('[data-product-carousel]');
  const productTrack = productCarousel?.querySelector<HTMLElement>('[data-product-track]');
  const productCount = productCarousel?.querySelector('.product-carousel-count');
  if (!productCarousel || !productTrack || !productCount) return;
  const total = productTrack.children.length;
  let productIndex = 0;

  function updateProductCarousel() {
    const card = productTrack!.querySelector<HTMLElement>('.product-card');
    if (!card) return;
    const gap = parseFloat(getComputedStyle(productTrack!).gap) || 0;
    const visible = visibleCards(window.innerWidth);
    productIndex = clampIndex(productIndex, total, visible);
    productTrack!.style.transform = `translateX(-${productIndex * (card.getBoundingClientRect().width + gap)}px)`;
    productCount!.textContent = `${String(productIndex + 1).padStart(2, '0')} / ${String(total).padStart(2, '0')}`;
  }

  productCarousel.querySelector('[data-carousel-prev]')?.addEventListener('click', () => {
    productIndex = Math.max(0, productIndex - 1);
    updateProductCarousel();
  });
  productCarousel.querySelector('[data-carousel-next]')?.addEventListener('click', () => {
    productIndex = clampIndex(productIndex + 1, total, visibleCards(window.innerWidth));
    updateProductCarousel();
  });
  window.addEventListener('resize', updateProductCarousel);

  let carouselTouchStart = 0;
  productCarousel.addEventListener('touchstart', (event) => {
    carouselTouchStart = (event as TouchEvent).touches[0].clientX;
  }, { passive: true });
  productCarousel.addEventListener('touchend', (event) => {
    const distance = (event as TouchEvent).changedTouches[0].clientX - carouselTouchStart;
    if (Math.abs(distance) < 40) return;
    const direction = distance < 0 ? 1 : -1;
    productIndex = clampIndex(productIndex + direction, total, visibleCards(window.innerWidth));
    updateProductCarousel();
  }, { passive: true });

  updateProductCarousel();
}
