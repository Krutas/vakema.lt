export function initMenu(): void {
  const menu = document.querySelector('.desktop-nav');
  const menuToggle = document.querySelector('.menu-toggle');

  menuToggle?.addEventListener('click', () => {
    const isOpen = menu?.classList.toggle('mobile-open') ?? false;
    menuToggle.setAttribute('aria-expanded', String(isOpen));
    menuToggle.setAttribute('aria-label', isOpen ? 'Uždaryti meniu' : 'Atidaryti meniu');
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && menu?.classList.contains('mobile-open')) {
      menu.classList.remove('mobile-open');
      menuToggle?.setAttribute('aria-expanded', 'false');
      (menuToggle as HTMLElement | null)?.focus();
    }
  });

  const sections = [...document.querySelectorAll('main > section[id]')];
  const navItems = [...document.querySelectorAll('.desktop-nav a')];
  const sectionObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      navItems.forEach((item) => item.classList.toggle('active', item.getAttribute('href') === `#${entry.target.id}`));
    });
  }, { rootMargin: '-35% 0px -55%' });
  sections.forEach((section) => sectionObserver.observe(section));
}
