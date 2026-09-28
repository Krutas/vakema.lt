export function initPageWipe(): void {
  const wipe = document.querySelector('.page-wipe');
  const links = document.querySelectorAll('a[href^="#"]');
  const heroImage = document.querySelector<HTMLElement>('.hero-image');
  const menu = document.querySelector('.desktop-nav');
  const menuToggle = document.querySelector('.menu-toggle');
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  links.forEach((link) => {
    link.addEventListener('click', (event) => {
      const href = link.getAttribute('href');
      const target = href ? document.querySelector(href) : null;
      if (!target) return;
      event.preventDefault();
      if (!reduceMotion) wipe?.classList.add('is-active');
      window.setTimeout(() => target.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth' }), reduceMotion ? 0 : 260);
      window.setTimeout(() => wipe?.classList.remove('is-active'), reduceMotion ? 0 : 820);
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
        (entry.target as HTMLElement).animate(
          [{ opacity: 0, transform: 'translateY(24px)' }, { opacity: 1, transform: 'translateY(0)' }],
          { duration: 850, easing: 'cubic-bezier(.76,0,.24,1)', fill: 'forwards' },
        );
        revealObserver.unobserve(entry.target);
      }
    });
  }, { threshold: 0.16 });
  document.querySelectorAll('.solution-card,.process-grid > div,.manifesto-copy').forEach((el) => revealObserver.observe(el));
}
