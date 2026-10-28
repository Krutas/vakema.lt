// "Gauti pasiūlymą": a four-step quote request with a live summary.
// The answers are assembled into the payload described in getoffer.md. While QUOTE_ENDPOINT is
// empty (demo build) nothing is sent or stored – the visitor sees a demo confirmation.

const QUOTE_ENDPOINT = ''; // e.g. https://api.vakema.lt/quote – see getoffer.md
const MANUFACTURERS = []; // [{ id, name }] from the admin later; the field stays hidden while empty
const MAX_PHOTOS = 5;
const MAX_PHOTO_MB = 10;

export function initQuote(root, { products, t, onLangChange }) {
  const form = root.querySelector('form');
  const steps = [...root.querySelectorAll('.quote-step')];
  const markers = [...root.querySelectorAll('.quote-steps li')];
  const prevBtn = root.querySelector('[data-prev]');
  const nextBtn = root.querySelector('[data-next]');
  const submitBtn = root.querySelector('[data-submit]');
  const itemsEl = root.querySelector('#quote-items');
  const summary = root.querySelector('#quote-summary');
  const thumbs = root.querySelector('#quote-thumbs');
  const layout = root.querySelector('.quote-layout');
  const stepsBar = root.querySelector('.quote-steps');
  const done = root.querySelector('.quote-done');
  let step = 0;
  let entry = 'nav';

  /* ---------- Manufacturers (config-driven) ---------- */
  if (MANUFACTURERS.length) {
    const box = root.querySelector('#quote-manufacturers');
    box.innerHTML = [{ id: 'any', name: t('quote.anyMaker') }, ...MANUFACTURERS]
      .map((m, i) => `<label><input type="radio" name="manufacturer" value="${m.id}"${i ? '' : ' checked'} /><span>${m.name}</span></label>`)
      .join('');
    box.closest('.choice-group').hidden = false;
  }

  /* ---------- Product rows ---------- */
  const productName = (id) => (id === 'other' ? t('quote.item.other') : t(`product.${id}`, products.find((p) => p.id === id)?.name));
  function rowHtml() {
    return `
      <label class="qi-type"><span>${t('quote.item.type')}</span>
        <select name="type"><option value="">${t('quote.item.choose')}</option>
          ${products.map((p) => `<option value="${p.id}">${productName(p.id)}</option>`).join('')}
          <option value="other">${productName('other')}</option>
        </select></label>
      <label class="qi-qty"><span>${t('quote.item.qty')}</span><input type="number" name="qty" min="1" max="99" value="1" inputmode="numeric" /></label>
      <label class="qi-w"><span>${t('quote.item.width')}</span><input type="number" name="width" min="30" max="1000" inputmode="numeric" placeholder="120" /></label>
      <label class="qi-h"><span>${t('quote.item.height')}</span><input type="number" name="height" min="30" max="1000" inputmode="numeric" placeholder="150" /></label>
      <button class="qi-remove" type="button" aria-label="${t('quote.item.remove')}">×</button>`;
  }
  function addRow(type = '') {
    const row = document.createElement('div');
    row.className = 'quote-item';
    row.innerHTML = rowHtml();
    row.querySelector('select').value = type;
    row.querySelector('.qi-remove').addEventListener('click', () => {
      row.remove();
      if (!itemsEl.children.length) addRow();
      syncRemove();
      render();
    });
    itemsEl.append(row);
    syncRemove();
    return row;
  }
  // the only row can't be removed
  const syncRemove = () => itemsEl.querySelectorAll('.qi-remove').forEach((b) => (b.hidden = itemsEl.children.length < 2));
  root.querySelector('[data-add-item]').addEventListener('click', () => { addRow().querySelector('select').focus(); render(); });
  addRow();

  /** Pre-fill a product (e.g. opened from that product's card) and suggest the scope. */
  function addProduct(id) {
    const p = products.find((x) => x.id === id);
    if (!p) return;
    const rows = [...itemsEl.children];
    if (!rows.some((r) => r.querySelector('select').value === id)) {
      const empty = rows.find((r) => !r.querySelector('select').value);
      (empty || addRow()).querySelector('select').value = id;
    }
    const kind = p.tag === 'Langai' ? 'windows' : 'doors';
    const scope = form.elements.scope.value;
    form.elements.scope.value = !scope || scope === kind ? kind : 'both';
    render();
  }

  /* ---------- Photos (previewed locally only) ---------- */
  const photoInput = form.elements.photos;
  photoInput.addEventListener('change', () => {
    thumbs.querySelectorAll('img').forEach((img) => URL.revokeObjectURL(img.src));
    thumbs.innerHTML = '';
    [...photoInput.files].slice(0, MAX_PHOTOS).forEach((f) => {
      const img = document.createElement('img');
      img.src = URL.createObjectURL(f);
      img.alt = f.name;
      thumbs.append(img);
    });
    clearError(photoInput);
    render();
  });

  /* ---------- Conditional fields ---------- */
  function syncConditional() {
    root.querySelectorAll('[data-show-if]').forEach((el) => {
      const [name, value] = el.dataset.showIf.split('=');
      el.hidden = form.elements[name].value !== value;
    });
  }

  /* ---------- Validation ---------- */
  function fail(el, msg) {
    const holder = el.closest('label, .choice-group');
    let err = holder.querySelector(':scope > .err');
    if (!err) {
      err = document.createElement('small');
      err.className = 'err';
      holder.append(err);
    }
    err.textContent = msg;
    el.setAttribute('aria-invalid', 'true');
    return el;
  }
  function clearError(el) {
    el.removeAttribute('aria-invalid');
    el.closest('label, .choice-group')?.querySelector(':scope > .err')?.remove();
  }
  form.addEventListener('input', (e) => clearError(e.target));
  form.addEventListener('change', (e) => {
    const group = e.target.closest('.choice-group');
    if (group) clearError(group.querySelector('input'));
    syncConditional();
    render();
  });
  form.addEventListener('input', render);

  const validators = [
    () => [!form.elements.scope.value && fail(root.querySelector('[data-name="scope"] input'), t('quote.err.scope'))],
    () => [...itemsEl.children].flatMap((row) => {
      const type = row.querySelector('select'), qty = row.querySelector('[name=qty]');
      const w = row.querySelector('[name=width]'), h = row.querySelector('[name=height]');
      const size = (el) => el.value && (+el.value < 30 || +el.value > 1000) && fail(el, t('quote.err.size'));
      return [
        !type.value && fail(type, t('quote.err.type')),
        !(+qty.value >= 1 && +qty.value <= 99) && fail(qty, t('quote.err.qty')),
        size(w), size(h),
      ];
    }),
    () => {
      const files = [...photoInput.files];
      return [
        !form.elements.city.value.trim() && fail(form.elements.city, t('quote.err.city')),
        files.length > MAX_PHOTOS && fail(photoInput, t('quote.err.photoCount')),
        files.some((f) => f.size > MAX_PHOTO_MB * 1024 * 1024) && fail(photoInput, t('quote.err.photoSize')),
      ];
    },
    () => {
      const { name, phone, email, consent } = form.elements;
      return [
        !name.value.trim() && fail(name, t('quote.err.name')),
        !/^\+?[\d\s()-]{7,}$/.test(phone.value.trim()) && fail(phone, t('quote.err.phone')),
        !(email.value.trim() && email.checkValidity()) && fail(email, t('quote.err.email')),
        !consent.checked && fail(consent, t('quote.err.consent')),
      ];
    },
  ];
  function validate(i) {
    const bad = validators[i]().filter(Boolean);
    bad[0]?.focus({ preventScroll: false });
    return bad.length === 0;
  }

  /* ---------- Steps ---------- */
  function go(i) {
    step = i;
    steps.forEach((s, k) => (s.hidden = k !== i));
    markers.forEach((m, k) => {
      m.classList.toggle('is-done', k < i);
      if (k === i) m.setAttribute('aria-current', 'step');
      else m.removeAttribute('aria-current');
    });
    prevBtn.hidden = i === 0;
    nextBtn.hidden = i === steps.length - 1;
    submitBtn.hidden = i !== steps.length - 1;
    root.querySelector('.sheet-panel').scrollTo({ top: 0, behavior: 'smooth' });
  }
  nextBtn.addEventListener('click', () => { if (validate(step)) go(step + 1); });
  prevBtn.addEventListener('click', () => go(step - 1));
  // finished steps are clickable in the progress bar
  markers.forEach((m, k) => m.addEventListener('click', () => { if (k < step) go(k); }));

  /* ---------- Summary ---------- */
  const choiceText = (name) => form.querySelector(`input[name="${name}"]:checked`)?.nextElementSibling?.textContent;
  function render() {
    const f = form.elements;
    const items = readItems().filter((it) => it.product_type);
    const rows = [
      [t('quote.sum.scope'), choiceText('scope')],
      [t('quote.sum.work'), [choiceText('work'), f.work.value === 'replace' && f.removal.checked ? t('quote.sum.removal') : ''].filter(Boolean).join(' · ')],
      [t('quote.sum.install'), choiceText('install')],
      [t('quote.sum.items'), items.map((it) => `${it.quantity} × ${productName(it.product_type)}${it.width_cm && it.height_cm ? ` · ${it.width_cm}×${it.height_cm} cm` : ''}`).join('<br />')],
      [t('quote.sum.prefs'), ['profile', 'glazing', 'color'].filter((n) => f[n].value !== 'advise').map(choiceText).join(' · ') || t('quote.sum.advised')],
      [t('quote.sum.property'), [choiceText('property'), f.city.value.trim()].filter(Boolean).join(' · ')],
      [t('quote.sum.timing'), choiceText('timing')],
      [t('quote.sum.photos'), photoInput.files.length ? `${Math.min(photoInput.files.length, MAX_PHOTOS)}` : ''],
      [t('quote.sum.contact'), [f.name.value.trim(), f.phone.value.trim()].filter(Boolean).join(' · ')],
    ].filter(([, v]) => v);
    const esc = (s) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
    summary.innerHTML = rows.map(([k, v]) => `<dt>${k}</dt><dd>${k === t('quote.sum.items') ? v : esc(v)}</dd>`).join('')
      || `<dd class="empty">${t('quote.sum.empty')}</dd>`;
  }

  /* ---------- Payload + delivery ---------- */
  function readItems() {
    return [...itemsEl.children].map((row) => {
      const num = (n) => (row.querySelector(`[name=${n}]`).value ? +row.querySelector(`[name=${n}]`).value : null);
      return { product_type: row.querySelector('select').value, quantity: num('qty') || 1, width_cm: num('width'), height_cm: num('height') };
    });
  }
  function buildPayload() {
    const f = form.elements;
    return {
      schema: 'vakema.quote_request/v1',
      submitted_at: new Date().toISOString(),
      locale: document.documentElement.lang,
      source: { page: location.pathname, entry },
      project: { scope: f.scope.value, work_type: f.work.value, installation: f.install.value === 'yes', removal: f.work.value === 'replace' && f.removal.checked },
      items: readItems().filter((it) => it.product_type),
      measurements_known: !f.unknownSize.checked,
      preferences: { profile: f.profile.value, glazing: f.glazing.value, color: f.color.value, manufacturer: f.manufacturer?.value || null },
      property: { type: f.property.value, city: f.city.value.trim(), address: f.address.value.trim() || null, timing: f.timing.value },
      attachments: [...photoInput.files].slice(0, MAX_PHOTOS).map((p) => ({ name: p.name, type: p.type, size: p.size })),
      comment: f.comment.value.trim() || null,
      contact: { name: f.name.value.trim(), phone: f.phone.value.trim(), email: f.email.value.trim(), preferred_channel: f.channel.value },
      consent: { privacy: f.consent.checked, marketing: f.marketing.checked, policy_version: '2026-10' },
      honeypot: f.company.value,
    };
  }
  async function deliver(payload) {
    if (!QUOTE_ENDPOINT) return { demo: true, reference: `VK-${payload.submitted_at.slice(0, 10).replace(/-/g, '')}-${String(Math.floor(Math.random() * 9000) + 1000)}` };
    const res = await fetch(QUOTE_ENDPOINT, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json(); // { reference, upload_urls? } – see getoffer.md
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!validate(step)) return;
    submitBtn.disabled = true;
    try {
      const result = await deliver(buildPayload());
      root.querySelector('#quote-ref').textContent = `${t('quote.done.ref')} ${result.reference}${result.demo ? ` (${t('quote.done.demo')})` : ''}`;
      layout.hidden = true;
      stepsBar.hidden = true;
      done.hidden = false;
    } catch {
      fail(form.elements.consent, t('quote.err.send'));
    } finally {
      submitBtn.disabled = false;
    }
  });

  function reset() {
    form.reset();
    itemsEl.innerHTML = '';
    addRow();
    thumbs.innerHTML = '';
    form.querySelectorAll('.err').forEach((el) => el.remove());
    form.querySelectorAll('[aria-invalid]').forEach((el) => el.removeAttribute('aria-invalid'));
    layout.hidden = false;
    stepsBar.hidden = false;
    done.hidden = true;
    syncConditional();
    go(0);
    render();
  }
  root.querySelector('[data-restart]').addEventListener('click', reset);

  // Language switch: rebuild the JS-made row labels (keeping values) and the summary
  onLangChange(() => {
    [...itemsEl.children].forEach((row) => {
      const values = [...row.querySelectorAll('select, input')].map((el) => el.value);
      row.querySelectorAll('label > span').forEach((s, i) => (s.textContent = t(['quote.item.type', 'quote.item.qty', 'quote.item.width', 'quote.item.height'][i])));
      const sel = row.querySelector('select');
      sel.options[0].textContent = t('quote.item.choose');
      [...sel.options].slice(1).forEach((o) => (o.textContent = productName(o.value)));
      row.querySelector('.qi-remove').setAttribute('aria-label', t('quote.item.remove'));
      row.querySelectorAll('select, input').forEach((el, i) => (el.value = values[i]));
    });
    form.querySelectorAll('.err').forEach((el) => el.remove());
    render();
  });

  syncConditional();
  render();

  return {
    addProduct,
    setEntry: (from) => { entry = from; },
  };
}
