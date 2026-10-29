// "Mūsų darbai" gallery: a centred carousel (native scroll-snap, so touch swipes and
// trackpads just work) with neighbours peeking in, arrows, counter, progress bar and
// thumbnails. Mouse drag and ← → keys too. Built on first open.
//
// Photos come from the gallery/ folder (see gallery/README.md):
//   published – gallery/gallery.json, written by tools/gallery.mjs in the Pages workflow
//   locally   – the dev server's folder listing, so a new photo shows up on reload
// With no photos yet, renders of the showroom stand in (SAMPLES).
const SAMPLES = [
  { img: 'focus-slide', tag: 'Langai', id: 'slide',
    lt: 'Aliuminis · Trigubas stiklo paketas · Svetainė', en: 'Aluminium · Triple glazing · Living room' },
  { img: 'focus-patio', tag: 'Durys', id: 'patio',
    lt: 'Išėjimas į terasą · Antracitas', en: 'Opening onto the terrace · Anthracite' },
  { img: 'focus-tilt', tag: 'Langai', id: 'tilt',
    lt: 'PVC · Antracitas · Senų langų keitimas', en: 'PVC · Anthracite · Replacing old windows' },
  { img: 'focus-french', tag: 'Durys', id: 'french',
    lt: 'Mediena · Dvigubas stiklo paketas', en: 'Timber · Double glazing' },
  { img: 'wall-langai', tag: 'Langai', title: { lt: 'Langų siena svetainėje', en: 'A wall of windows in the living room' },
    lt: '3 langai · Montavimas per vieną dieną', en: '3 windows · Installed in one day' },
  { img: 'focus-entry', tag: 'Durys', id: 'entry',
    lt: 'Šiltinta konstrukcija · Antracitas', en: 'Insulated construction · Anthracite' },
  { img: 'focus-fixed', tag: 'Langai', id: 'fixed',
    lt: 'PVC · Vėdinimas per viršlangį', en: 'PVC · Ventilation through the top light' },
  { img: 'wall-durys', tag: 'Durys', title: { lt: 'Durys į kiemą ir terasą', en: 'Doors to the yard and terrace' },
    lt: '3 durų sistemos · Naujas namas', en: '3 door systems · New house' },
];
const SRC = (name) => `assets/lite/${name}-l.webp`;
const pad = (n) => String(n).padStart(2, '0');
const IMAGE = /\.(jpe?g|png|webp)$/i;
const collator = new Intl.Collator('lt', { numeric: true });

// "03-terasos-durys.jpg" → "Terasos durys" (same rule as tools/gallery.mjs)
function niceName(file) {
  const s = file.replace(/\.[^.]+$/, '').replace(/^\d+[-_ .]*/, '').replace(/[-_]+/g, ' ').trim();
  return s.charAt(0).toUpperCase() + s.slice(1);
}

async function loadGallery() {
  try {
    const r = await fetch('gallery/gallery.json', { cache: 'no-cache' });
    if (r.ok) {
      const { items = [] } = await r.json();
      if (items.length) return items.map((i) => ({ ...i, src: `gallery/${i.src}`, thumb: `gallery/${i.thumb}` }));
    }
  } catch { /* not published yet */ }
  try {
    return await fromListing();
  } catch {
    return [];
  }
}

// Local dev: read the folder the way tools/gallery.mjs does, from the server's directory listing
async function fromListing() {
  const links = async (path) => {
    const r = await fetch(path, { cache: 'no-cache' });
    if (!r.ok || !(r.headers.get('content-type') || '').includes('html')) return [];
    const doc = new DOMParser().parseFromString(await r.text(), 'text/html');
    return [...doc.querySelectorAll('a[href]')].map((a) => decodeURIComponent(a.getAttribute('href')))
      .filter((h) => !/^([?/#.]|[a-z]+:)/i.test(h));
  };
  const info = await fetch('gallery/info.json', { cache: 'no-cache' }).then((r) => (r.ok ? r.json() : {})).catch(() => ({}));
  const item = (rel, tag) => {
    const meta = info[rel] || {};
    const title = meta.title || niceName(rel.split('/').pop());
    return {
      src: `gallery/${rel}`, thumb: `gallery/${rel}`, tag,
      title: { lt: title, en: meta.en?.title || title },
      text: { lt: meta.text || '', en: meta.en?.text || meta.text || '' },
    };
  };
  const root = (await links('gallery/')).sort(collator.compare);
  const items = root.filter((f) => IMAGE.test(f)).map((f) => item(f, null));
  const order = info._folders || [];
  const folders = root.filter((f) => f.endsWith('/') && f !== 'thumbs/').map((f) => f.slice(0, -1))
    .sort((a, b) => (order.indexOf(a) + 1 || 99) - (order.indexOf(b) + 1 || 99) || collator.compare(a, b));
  for (const dir of folders) {
    const tag = dir.charAt(0).toUpperCase() + dir.slice(1);
    (await links(`gallery/${dir}/`)).filter((f) => IMAGE.test(f)).sort(collator.compare)
      .forEach((f) => items.push(item(`${dir}/${f}`, tag)));
  }
  return items;
}

export function initWorks(section, { t, getLang, onLangChange, products }) {
  const track = section.querySelector('#works-track');
  const thumbs = section.querySelector('#works-thumbs');
  const current = section.querySelector('[data-works-current]');
  const total = section.querySelector('[data-works-total]');
  const prevBtn = section.querySelector('[data-works-prev]');
  const nextBtn = section.querySelector('[data-works-next]');
  const bar = section.querySelector('.works-progress span');
  let index = 0;
  let built = false;
  let works = [];
  let loading = null;

  const lang = () => getLang();
  const title = (w) => w.title?.[lang()] ?? t(`product.${w.id}`, products.find((p) => p.id === w.id)?.name);
  const caption = (w) => (w.text ? w.text[lang()] : w[lang()]) || '';
  const slides = () => [...track.children];

  function build() {
    track.replaceChildren();
    thumbs.replaceChildren();
    works.forEach((w, i) => {
      const li = document.createElement('li');
      li.className = 'work-slide';
      li.setAttribute('aria-roledescription', 'slide');
      li.innerHTML = `
        <figure>
          <img src="${w.src}" alt="" loading="${i < 2 ? 'eager' : 'lazy'}" decoding="async" draggable="false" />
          <figcaption>
            ${w.tag ? `<span class="work-tag">${t(`tag.${w.tag}`, w.tag)}</span>` : ''}
            <h3></h3>
            <p></p>
          </figcaption>
        </figure>`;
      li.querySelector('img').alt = title(w);
      li.querySelector('h3').textContent = title(w);
      li.querySelector('p').textContent = caption(w);
      li.addEventListener('click', () => { if (!dragged && i !== index) go(i); });
      track.append(li);

      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'work-thumb';
      b.setAttribute('aria-label', title(w));
      b.innerHTML = `<img src="${w.thumb}" alt="" loading="lazy" decoding="async" draggable="false" />`;
      b.addEventListener('click', () => go(i));
      thumbs.append(b);
    });
    total.textContent = pad(works.length);
    built = true;
    setActive(index);
  }

  // Scroll so slide i sits in the middle of the track
  function go(i, smooth = true) {
    const s = slides()[Math.max(0, Math.min(works.length - 1, i))];
    if (!s) return;
    track.scrollTo({ left: s.offsetLeft - (track.clientWidth - s.offsetWidth) / 2, behavior: smooth ? 'smooth' : 'auto' });
  }

  function setActive(i) {
    index = i;
    slides().forEach((s, j) => {
      s.classList.toggle('is-active', j === i);
      s.setAttribute('aria-hidden', String(j !== i));
    });
    [...thumbs.children].forEach((b, j) => b.toggleAttribute('aria-current', j === i));
    current.textContent = pad(i + 1);
    bar.style.width = `${((i + 1) / works.length) * 100}%`;
    prevBtn.disabled = i === 0;
    nextBtn.disabled = i === works.length - 1;
    const tb = thumbs.children[i];
    if (tb) thumbs.scrollTo({ left: tb.offsetLeft - (thumbs.clientWidth - tb.offsetWidth) / 2, behavior: 'smooth' });
  }

  // The slide nearest the middle is the active one
  let ticking = false;
  track.addEventListener('scroll', () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => {
      ticking = false;
      const mid = track.scrollLeft + track.clientWidth / 2;
      let best = 0, dist = Infinity;
      slides().forEach((s, j) => {
        const d = Math.abs(s.offsetLeft + s.offsetWidth / 2 - mid);
        if (d < dist) { dist = d; best = j; }
      });
      if (best !== index) setActive(best);
    });
  }, { passive: true });

  prevBtn.addEventListener('click', () => go(index - 1));
  nextBtn.addEventListener('click', () => go(index + 1));
  section.addEventListener('keydown', (e) => {
    if (e.target.closest('input, textarea')) return;
    if (e.key === 'ArrowLeft') { e.preventDefault(); go(index - 1); }
    else if (e.key === 'ArrowRight') { e.preventDefault(); go(index + 1); }
  });

  // Mouse drag (touch and trackpads scroll natively)
  let drag = null;
  let dragged = false;
  track.addEventListener('pointerdown', (e) => {
    if (e.pointerType !== 'mouse' || e.button !== 0) return;
    drag = { x: e.clientX, left: track.scrollLeft };
    dragged = false;
  });
  addEventListener('pointermove', (e) => {
    if (!drag) return;
    const dx = e.clientX - drag.x;
    if (!dragged && Math.abs(dx) > 5) { dragged = true; track.classList.add('is-dragging'); }
    if (dragged) track.scrollLeft = drag.left - dx;
  });
  addEventListener('pointerup', () => {
    if (!drag) return;
    drag = null;
    if (!dragged) return;
    track.classList.remove('is-dragging');
    go(index); // settle on the nearest slide
    setTimeout(() => { dragged = false; }, 0); // swallow the click that ends the drag
  });

  let resizeTimer;
  addEventListener('resize', () => {
    if (!built || section.hidden) return;
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => go(index, false), 120);
  });
  onLangChange(() => { if (built) build(); });

  return {
    async open() {
      if (!built) {
        loading ||= loadGallery().then((items) => {
          works = items.length ? items : SAMPLES.map((w) => ({ ...w, src: SRC(w.img), thumb: SRC(w.img) }));
        });
        await loading;
        if (!built) build();
      }
      requestAnimationFrame(() => go(index, false));
    },
  };
}
