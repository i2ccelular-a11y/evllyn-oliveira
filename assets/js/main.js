/* Studio Evllyn Oliveira — interactions (vanilla, no dependencies) */
(() => {
  const d = document, root = d.documentElement;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const fine = matchMedia('(hover: hover) and (pointer: fine)').matches;
  const $ = (s, c = d) => c.querySelector(s);
  const $$ = (s, c = d) => [...c.querySelectorAll(s)];

  /* ---------- Header + menu ---------- */
  const header = $('.site-header');
  const menuBtn = $('.menu-btn');
  const menu = $('#menu');
  const setMenu = (open) => {
    d.body.classList.toggle('menu-open', open);
    menuBtn?.setAttribute('aria-expanded', String(open));
    menu?.setAttribute('aria-hidden', String(!open));
    if (menu) menu.inert = !open;
    if (open) setTimeout(() => $('a', menu)?.focus(), 350);
  };
  if (menu) menu.inert = true;
  menuBtn?.addEventListener('click', () => setMenu(!d.body.classList.contains('menu-open')));
  $$('#menu a').forEach(a => a.addEventListener('click', () => setMenu(false)));
  d.addEventListener('keydown', e => { if (e.key === 'Escape' && d.body.classList.contains('menu-open')) { setMenu(false); menuBtn?.focus(); } });

  /* ---------- Split headings into lines for reveal ---------- */
  $$('[data-split]').forEach(el => {
    const lines = el.innerHTML.split(/<br\s*\/?>/i);
    el.innerHTML = lines.map((l, i) => `<span class="split-line"><span style="--d:${(i * 0.09).toFixed(2)}s">${l}</span></span>`).join('');
  });

  /* ---------- Reveal on scroll ---------- */
  // clip-path hides the target from IntersectionObserver, so clip reveals watch their parent
  const proxy = new Map();
  const io = new IntersectionObserver((entries) => {
    entries.forEach(en => {
      if (!en.isIntersecting) return;
      (proxy.get(en.target) || [en.target]).forEach(t => t.classList.add('is-in'));
      io.unobserve(en.target);
    });
  }, { rootMargin: '0px 0px -8% 0px', threshold: 0.12 });
  $$('[data-reveal], [data-split]').forEach(el => {
    if (el.dataset.reveal === 'clip' && el.parentElement) {
      const host = el.parentElement;
      proxy.set(host, [...(proxy.get(host) || []), el]); io.observe(host);
    } else io.observe(el);
  });

  /* ---------- Scroll-driven effects (single rAF loop) ---------- */
  const toTop = $('.to-top');
  const parallax = $$('[data-parallax]');
  const hubBg = $('.hub-bg');
  const phImg = $('.portrait-hero .ph-img img');
  let ticking = false;
  const onScroll = () => {
    const y = scrollY, vh = innerHeight, max = root.scrollHeight - vh;
    header?.classList.toggle('is-scrolled', y > 40);
    if (toTop) { toTop.classList.toggle('is-visible', y > vh * .8); toTop.style.setProperty('--p', max > 0 ? (y / max).toFixed(3) : 0); }
    if (!reduce) {
      parallax.forEach(el => {
        const r = el.getBoundingClientRect();
        const speed = parseFloat(el.dataset.parallax) || 0.15;
        const off = (r.top + r.height / 2 - vh / 2) * -speed;
        el.style.transform = `translate3d(0, ${off.toFixed(1)}px, 0)`;
      });
      if (hubBg) {
        const p = Math.min(1, y / (vh * 1.6));
        hubBg.style.setProperty('--s', (1.06 + p * 0.1).toFixed(3));
        hubBg.style.setProperty('--b', (0.82 - p * 0.32).toFixed(3));
        hubBg.style.setProperty('--v', (0.25 + p * 0.45).toFixed(3));
      }
      if (phImg) phImg.style.setProperty('--s', (1.08 + Math.min(1, y / vh) * 0.12).toFixed(3));
    }
    ticking = false;
  };
  addEventListener('scroll', () => { if (!ticking) { ticking = true; requestAnimationFrame(onScroll); } }, { passive: true });
  addEventListener('resize', onScroll, { passive: true });
  onScroll();
  toTop?.addEventListener('click', () => scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' }));

  /* ---------- Pointer: 3D tilt + light ---------- */
  if (fine && !reduce) {
    $$('[data-tilt]').forEach(el => {
      const max = parseFloat(el.dataset.tilt) || 8;
      el.addEventListener('pointermove', e => {
        const r = el.getBoundingClientRect();
        const x = (e.clientX - r.left) / r.width, yy = (e.clientY - r.top) / r.height;
        el.style.transition = 'transform .15s linear';
        el.style.transform = `perspective(1100px) rotateX(${((0.5 - yy) * max).toFixed(2)}deg) rotateY(${((x - 0.5) * max).toFixed(2)}deg) translateZ(0)`;
        el.style.setProperty('--mx', `${(x * 100).toFixed(1)}%`);
        el.style.setProperty('--my', `${(yy * 100).toFixed(1)}%`);
      });
      el.addEventListener('pointerleave', () => { el.style.transition = ''; el.style.transform = ''; });
    });
    const light = $('.hub-bg .light');
    const mega = $('.mega-star');
    addEventListener('pointermove', e => {
      const nx = e.clientX / innerWidth - 0.5, ny = e.clientY / innerHeight - 0.5;
      if (light) { light.style.setProperty('--lx', `${nx * 80}px`); light.style.setProperty('--ly', `${ny * 60}px`); }
      if (mega) { mega.style.setProperty('--ry', `${(-14 + nx * 18).toFixed(2)}deg`); mega.style.setProperty('--rx', `${(4 - ny * 10).toFixed(2)}deg`); }
    }, { passive: true });
  }

  /* ---------- Coverflow carousel ---------- */
  $$('[data-flow]').forEach(flow => {
    const items = $$('.flow-item', flow);
    const dotsWrap = $('.dots', flow.parentElement);
    let i = Math.floor(items.length / 2), timer;
    const dots = items.map((_, k) => {
      const b = d.createElement('button'); b.type = 'button'; b.setAttribute('aria-label', `Foto ${k + 1}`);
      b.addEventListener('click', () => go(k)); dotsWrap?.appendChild(b); return b;
    });
    const render = () => {
      const narrow = innerWidth < 640;
      const step = narrow ? 52 : 62, depth = narrow ? 120 : 170;
      items.forEach((el, k) => {
        let o = k - i; const n = items.length;
        if (o > n / 2) o -= n; if (o < -n / 2) o += n;
        const a = Math.abs(o);
        el.style.transform = `translate(-50%, -50%) translateX(${o * step}%) translateZ(${-a * depth}px) rotateY(${o * -28}deg) scale(${a ? 0.92 : 1})`;
        el.style.opacity = a > 3 ? 0 : 1 - a * 0.18;
        el.style.filter = a ? `brightness(${1 - a * 0.22}) blur(${a > 1 ? 1 : 0}px)` : 'none';
        el.style.zIndex = 100 - a;
        el.style.visibility = a > 3 ? 'hidden' : 'visible';
        el.setAttribute('aria-hidden', a ? 'true' : 'false');
        el.tabIndex = a ? -1 : 0;
      });
      dots.forEach((b, k) => b.setAttribute('aria-current', String(k === i)));
    };
    const go = (k) => { i = (k + items.length) % items.length; render(); restart(); };
    const restart = () => { clearInterval(timer); if (!reduce) timer = setInterval(() => go(i + 1), 4200); };
    $('[data-prev]', flow.parentElement)?.addEventListener('click', () => go(i - 1));
    $('[data-next]', flow.parentElement)?.addEventListener('click', () => go(i + 1));
    items.forEach((el, k) => el.addEventListener('click', () => { if (k !== i) go(k); else openLB(el.dataset.full || $('img', el).src, $('img', el).alt, items.map(x => $('img', x)), k); }));
    items.forEach(el => el.addEventListener('keydown', e => { if (e.key === 'Enter') el.click(); }));
    flow.addEventListener('keydown', e => { if (e.key === 'ArrowLeft') go(i - 1); if (e.key === 'ArrowRight') go(i + 1); });
    let sx = null;
    flow.addEventListener('pointerdown', e => { sx = e.clientX; });
    flow.addEventListener('pointerup', e => { if (sx === null) return; const dx = e.clientX - sx; if (Math.abs(dx) > 40) go(i + (dx < 0 ? 1 : -1)); sx = null; });
    flow.addEventListener('mouseenter', () => clearInterval(timer));
    flow.addEventListener('mouseleave', restart);
    new IntersectionObserver(([en]) => en.isIntersecting ? restart() : clearInterval(timer)).observe(flow);
    addEventListener('resize', render, { passive: true });
    render();
  });

  /* ---------- Lightbox ---------- */
  const lb = $('#lightbox');
  let lbList = [], lbIdx = 0;
  const showLB = () => {
    const img = lbList[lbIdx]; if (!img || !lb) return;
    const big = $('img', lb); big.src = img.currentSrc || img.src; big.alt = img.alt;
    $('figcaption', lb).textContent = img.alt;
  };
  function openLB(_src, _alt, list, idx) {
    if (!lb) return; lbList = list; lbIdx = idx; showLB();
    if (typeof lb.showModal === 'function') lb.showModal(); else lb.setAttribute('open', '');
  }
  if (lb) {
    $('.lb-close', lb).addEventListener('click', () => lb.close());
    $('.lb-prev', lb).addEventListener('click', () => { lbIdx = (lbIdx - 1 + lbList.length) % lbList.length; showLB(); });
    $('.lb-next', lb).addEventListener('click', () => { lbIdx = (lbIdx + 1) % lbList.length; showLB(); });
    lb.addEventListener('click', e => { if (e.target === lb) lb.close(); });
    lb.addEventListener('keydown', e => { if (e.key === 'ArrowLeft') $('.lb-prev', lb).click(); if (e.key === 'ArrowRight') $('.lb-next', lb).click(); });
  }
  $$('[data-lightbox]').forEach(group => {
    const imgs = $$('img', group);
    imgs.forEach((img, k) => {
      const trigger = img.closest('button, a[data-zoom]') || img;
      trigger.addEventListener('click', e => { e.preventDefault(); openLB(img.src, img.alt, imgs, k); });
    });
  });

  /* ---------- Lazy map (click-to-load keeps page light) ---------- */
  $$('[data-map]').forEach(box => {
    const load = () => {
      if (box.dataset.loaded) return; box.dataset.loaded = '1';
      const f = d.createElement('iframe');
      f.src = box.dataset.map; f.loading = 'lazy'; f.title = 'Mapa: localização do Studio Evllyn Oliveira'; f.referrerPolicy = 'no-referrer-when-downgrade';
      box.appendChild(f); setTimeout(() => $('.map-load', box)?.remove(), 600);
    };
    $('button', box)?.addEventListener('click', load);
    new IntersectionObserver(([en], o) => { if (en.isIntersecting) { load(); o.disconnect(); } }, { rootMargin: '200px' }).observe(box);
  });

  /* ---------- Year ---------- */
  $$('[data-year]').forEach(el => el.textContent = new Date().getFullYear());
})();
