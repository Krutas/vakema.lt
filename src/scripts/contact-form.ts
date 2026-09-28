import { validateLead } from './validate-lead';

export function initContactForm(): void {
  const form = document.querySelector<HTMLFormElement>('.contact-form');
  const note = document.querySelector('.form-note');
  if (!form || !note) return;

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const data = Object.fromEntries(new FormData(form).entries());
    const result = validateLead(data);
    if (!result.ok) {
      note.textContent = 'Patikrinkite formos laukus.';
      return;
    }
    const action = form.dataset.action;
    if (!action) {
      // No backend configured yet — acknowledge locally without a network call.
      note.textContent = 'Ačiū! Susisieksime per 1 darbo dieną.';
      form.reset();
      return;
    }
    try {
      const res = await fetch(action, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(result.lead),
      });
      if (!res.ok) throw new Error(String(res.status));
      note.textContent = 'Ačiū! Susisieksime per 1 darbo dieną.';
      form.reset();
    } catch {
      note.textContent = 'Patikrinkite formos laukus.';
    }
  });
}
