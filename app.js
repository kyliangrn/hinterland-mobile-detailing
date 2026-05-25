/* Hinterland Mobile Detailing — interactions */
(() => {
  const $  = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => Array.from(c.querySelectorAll(s));

  // Footer year
  $('#year').textContent = new Date().getFullYear();

  // ░ Mobile nav ░
  const toggle = $('.nav__toggle');
  const links  = $('.nav__links');
  toggle?.addEventListener('click', () => {
    const open = links.classList.toggle('is-open');
    toggle.setAttribute('aria-expanded', String(open));
  });
  links?.addEventListener('click', e => {
    if (e.target.tagName === 'A') {
      links.classList.remove('is-open');
      toggle.setAttribute('aria-expanded', 'false');
    }
  });

  // ░ Sticky nav state + scroll progress ░
  const nav = $('.nav');
  const progress = $('.scroll-progress span');
  let ticking = false;
  function onScroll() {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => {
      const y = window.scrollY;
      nav.classList.toggle('is-stuck', y > 40);
      const h = document.documentElement.scrollHeight - window.innerHeight;
      progress.style.width = (h > 0 ? (y / h) * 100 : 0) + '%';
      ticking = false;
    });
  }
  onScroll();
  window.addEventListener('scroll', onScroll, { passive: true });

  // ░ Reveal on scroll ░
  const io = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (e.isIntersecting) {
        e.target.classList.add('in');
        io.unobserve(e.target);
      }
    });
  }, { threshold: 0.12, rootMargin: '0px 0px -60px 0px' });

  const revealSelectors = [
    '.reveal', '[data-image-reveal]',
    '.value', '.feature-card',
    '.section-head', '.about__body > *', '.about__media',
    '.contact__intro > *', '.contact__form .field', '.contact__form button',
    '.ambient__copy > *', '.ambient__media',
    '.intro__statement', '.cat-item'
  ];
  $$(revealSelectors.join(',')).forEach(el => {
    if (!el.classList.contains('reveal') && !el.hasAttribute('data-image-reveal')) {
      el.classList.add('reveal');
    }
    io.observe(el);
  });

  // ░ Stagger reveal delays for groups ░
  $$('.value').forEach((el, i) => el.style.setProperty('--d', (i * 0.08) + 's'));
  $$('.feature-card').forEach((el, i) => el.style.setProperty('--d', (i * 0.1) + 's'));
  $$('.about__bullets li').forEach((el, i) => {
    el.classList.add('reveal');
    el.style.setProperty('--d', (i * 0.05) + 's');
    io.observe(el);
  });
  $$('.cat-item').forEach((el, i) => el.style.setProperty('--d', (i * 0.05) + 's'));

  // ░ Counter animation (hero stats) ░
  const counters = $$('[data-count]');
  const countObs = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      const el = entry.target;
      const target = parseInt(el.dataset.count, 10);
      const suffix = el.dataset.suffix || '';
      const duration = 1600;
      const start = performance.now();
      function step(now) {
        const t = Math.min(1, (now - start) / duration);
        const eased = 1 - Math.pow(1 - t, 3);
        el.textContent = Math.round(target * eased) + suffix;
        if (t < 1) requestAnimationFrame(step);
      }
      requestAnimationFrame(step);
      countObs.unobserve(el);
    });
  }, { threshold: 0.5 });
  counters.forEach(c => countObs.observe(c));

  // ░ Parallax — hero image + area image ░
  const parallaxTargets = [
    { el: $('.hero__media img'), strength: 0.15 },
    { el: $('.area__hero img'), strength: 0.12 }
  ].filter(t => t.el);

  if (parallaxTargets.length && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
    let pTicking = false;
    function onParallax() {
      if (pTicking) return;
      pTicking = true;
      requestAnimationFrame(() => {
        parallaxTargets.forEach(({ el, strength }) => {
          const rect = el.parentElement.getBoundingClientRect();
          if (rect.bottom < 0 || rect.top > window.innerHeight) { pTicking = false; return; }
          const offset = (rect.top + rect.height / 2 - window.innerHeight / 2) * strength;
          el.style.transform = `translate3d(0, ${-offset}px, 0) scale(1.04)`;
        });
        pTicking = false;
      });
    }
    onParallax();
    window.addEventListener('scroll', onParallax, { passive: true });
    window.addEventListener('resize', onParallax);
  }

  // ░ Interactive catalogue (Section 03) ░
  const items = $$('.cat-item');
  const cards = $$('.cat-card');

  function activate(targetId) {
    items.forEach(i => {
      const on = i.dataset.target === targetId;
      i.classList.toggle('is-active', on);
      i.setAttribute('aria-selected', String(on));
    });
    cards.forEach(c => c.classList.toggle('is-active', c.id === targetId));
  }

  items.forEach(item => {
    item.addEventListener('click', e => {
      e.preventDefault();
      activate(item.dataset.target);
    });
    item.addEventListener('mouseenter', () => {
      // preview on hover (desktop only)
      if (window.matchMedia('(hover: hover)').matches) {
        activate(item.dataset.target);
      }
    });
    item.addEventListener('focus', () => activate(item.dataset.target));
  });

  // ░ Contact form — AJAX submit to Formspree ░
  const form = $('.contact__form[data-ajax]');
  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const button = form.querySelector('button[type="submit"]');
      const label  = button.querySelector('.btn__label');
      const success = form.querySelector('.form__success');
      const error   = form.querySelector('.form__error');
      success.hidden = true;
      error.hidden = true;

      const originalText = label.textContent;
      label.textContent = 'Sending…';
      button.disabled = true;

      try {
        const data = new FormData(form);
        const res = await fetch(form.action, {
          method: 'POST',
          body: data,
          headers: { 'Accept': 'application/json' }
        });

        if (res.ok) {
          form.reset();
          success.hidden = false;
          label.textContent = 'Sent ✓';
          setTimeout(() => { label.textContent = originalText; button.disabled = false; }, 2400);
        } else {
          const body = await res.json().catch(() => ({}));
          throw new Error(body.error || 'Network error');
        }
      } catch (err) {
        console.error('[form]', err);
        error.hidden = false;
        label.textContent = originalText;
        button.disabled = false;
      }
    });
  }

  // ░ Hash deep-linking to a service ░
  if (location.hash) {
    const id = location.hash.slice(1);
    if ($('#' + CSS.escape(id))?.classList.contains('cat-card')) {
      activate(id);
    }
  }
  window.addEventListener('hashchange', () => {
    const id = location.hash.slice(1);
    if ($('#' + CSS.escape(id))?.classList.contains('cat-card')) {
      activate(id);
    }
  });
})();
