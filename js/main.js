// FAQ accordion — one open at a time
document.querySelectorAll('.faq-question').forEach(btn => {
  btn.addEventListener('click', () => {
    const item = btn.closest('.faq-item');
    const isOpen = item.classList.contains('open');
    document.querySelectorAll('.faq-item.open').forEach(el => {
      el.classList.remove('open');
      el.querySelector('.faq-question').setAttribute('aria-expanded', 'false');
    });
    if (!isOpen) {
      item.classList.add('open');
      btn.setAttribute('aria-expanded', 'true');
    }
  });
});

// Pricing monthly / annual toggle
(function () {
  const paidPlan = document.getElementById('paid-plan');
  const toggle = document.getElementById('pricing-toggle');
  const amount = document.getElementById('pricing-amount');
  const period = document.getElementById('pricing-period');
  if (!paidPlan || !toggle || !amount || !period) return;

  toggle.addEventListener('click', () => {
    const isAnnual = paidPlan.classList.toggle('annual');
    toggle.setAttribute('aria-pressed', String(isAnnual));
    toggle.setAttribute('aria-label', isAnnual ? 'Switch to monthly billing' : 'Switch to yearly billing');
    amount.textContent = isAnnual ? '$49.99' : '$4.99';
    period.textContent = isAnnual ? '/year' : '/month';
  });
})();

// Team color swatches tint the glow and swap the Team Detail screenshot;
// the sun/moon button flips the section (and screenshots) between dark and light.
(function () {
  const section = document.querySelector('.teams-section');
  const swatches = document.querySelectorAll('.team-swatch');
  const modeToggle = document.getElementById('mode-toggle');
  const img = document.getElementById('team-detail-img');
  if (!section || !swatches.length || !img) return;

  let color = 'red';
  let mode = section.dataset.mode || 'dark';
  const src = (c, m) => `images/team-detail-${c}-${m}.webp`;

  // Warm the cache so swaps don't flash
  const preload = () => {
    swatches.forEach(s => {
      ['light', 'dark'].forEach(m => { new Image().src = src(s.dataset.color, m); });
    });
  };
  if ('requestIdleCallback' in window) requestIdleCallback(preload); else setTimeout(preload, 1500);

  const update = () => { img.src = src(color, mode); };

  swatches.forEach(swatch => {
    swatch.addEventListener('click', () => {
      swatches.forEach(s => s.setAttribute('aria-pressed', 'false'));
      swatch.setAttribute('aria-pressed', 'true');
      section.style.setProperty('--team-color', swatch.style.getPropertyValue('--swatch'));
      color = swatch.dataset.color;
      update();
    });
  });

  if (modeToggle) {
    modeToggle.addEventListener('click', () => {
      mode = mode === 'dark' ? 'light' : 'dark';
      section.dataset.mode = mode;
      modeToggle.setAttribute('aria-pressed', String(mode === 'light'));
      modeToggle.setAttribute('aria-label', mode === 'light' ? 'Switch to dark mode' : 'Switch to light mode');
      update();
    });
  }
})();

// Playable demo — one clip at a time; the main Play button also drives the progress bar
(function () {
  const main = document.getElementById('demo-play');
  const card = document.getElementById('demo-player');
  const label = document.getElementById('demo-play-label');
  const time = document.getElementById('demo-time');
  const progress = document.getElementById('demo-progress');
  if (!main || !card || !label || !time || !progress) return;

  const audio = new Audio();
  audio.preload = 'metadata';
  audio.src = main.dataset.audio;
  const fill = progress.firstElementChild;
  let active = null;

  const format = s => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;

  function drawMain(elapsed) {
    const total = audio.duration;
    const pct = total ? Math.min(elapsed / total, 1) * 100 : 0;
    fill.style.transform = `translateX(${pct - 100}%)`;
    progress.setAttribute('aria-valuenow', String(Math.round(pct)));
    if (total) time.textContent = format(Math.ceil(total - elapsed));
  }

  function setPlaying(btn, playing) {
    btn.setAttribute('aria-pressed', String(playing));
    if (btn === main) {
      label.textContent = playing ? 'Pause' : 'Play';
      card.classList.toggle('is-playing', playing);
    }
  }

  function start(btn) {
    if (active && active !== btn) setPlaying(active, false);
    if (active !== btn) {
      audio.src = btn.dataset.audio;
      if (active === main || btn === main) { fill.style.transform = 'translateX(-100%)'; progress.setAttribute('aria-valuenow', '0'); }
    }
    active = btn;
    setPlaying(btn, true);
    audio.play().catch(() => setPlaying(btn, false));
  }

  document.querySelectorAll('[data-audio]').forEach(btn => {
    btn.addEventListener('click', () => {
      if (active === btn && !audio.paused) {
        audio.pause();
        setPlaying(btn, false);
      } else {
        start(btn);
      }
    });
  });

  audio.addEventListener('loadedmetadata', () => {
    if (active === main || !active) time.textContent = format(Math.ceil(audio.duration));
  });

  audio.addEventListener('timeupdate', () => {
    if (active === main) drawMain(audio.currentTime);
  });

  audio.addEventListener('ended', () => {
    const finished = active;
    if (finished) setPlaying(finished, false);
    active = null;
    audio.src = main.dataset.audio;
    fill.style.transform = 'translateX(-100%)';
    progress.setAttribute('aria-valuenow', '0');
  });
})();

// Cross-fade through a phone's screenshots; pauses off-screen and for Reduce Motion.
// Images with data-src load just before their turn, so long lists stay light.
(function () {
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  document.querySelectorAll('.cycle').forEach(el => {
    const imgs = el.querySelectorAll('img');
    if (imgs.length < 2 || reduce) return;
    const delay = Number(el.dataset.cycle) || 3500;
    let i = 0;
    let timer = null;

    const ready = img => new Promise(resolve => {
      if (img.dataset.src) { img.src = img.dataset.src; delete img.dataset.src; }
      if (img.complete && img.naturalWidth) return resolve();
      img.addEventListener('load', resolve, { once: true });
      img.addEventListener('error', resolve, { once: true });
    });

    const step = async () => {
      const next = (i + 1) % imgs.length;
      await ready(imgs[next]);
      imgs[i].classList.remove('active');
      i = next;
      imgs[i].classList.add('active');
      ready(imgs[(i + 1) % imgs.length]); // warm the one after
    };
    const start = () => { if (!timer) timer = setInterval(step, delay); };
    const stop = () => { clearInterval(timer); timer = null; };
    new IntersectionObserver(([e]) => (e.isIntersecting ? start() : stop()), { threshold: 0.3 }).observe(el);
  });
})();
