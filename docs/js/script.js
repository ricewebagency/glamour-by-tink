//
// Global JavaScript for the Glamour by Tink site.
// Handles responsive navigation toggling and a simple
// testimonial slider on the home page.

const LOADER_TAB_FLAG = '__gbt_loader_seen__';
const SALONIZED_WIDGET_SCRIPT_SRC = 'https://static-widget.salonized.com/loader.js';
const SALONIZED_BOOKING_SELECTOR = '.salonized-booking[data-gbt-booking-widget]';
const BOOKING_BACKDROP_SELECTOR = '[data-booking-backdrop]';
const BOOKING_WIDGET_MAX_WIDTH = 560;
const BOOKING_WIDGET_MAX_HEIGHT = 760;
const SALONIZED_BOOKING_CONFIG = Object.freeze({
  company: 'aN9GJytSPxkVewbFheHoF2bo',
  color: '#FF6575',
  language: 'nl',
  outline: 'shadow'
});

let bookingWidgetReadyPromise;
let bookingBackdropHideTimerId = 0;

initImmersiveLoader();

document.addEventListener('DOMContentLoaded', () => {
  const currentYear = String(new Date().getFullYear());
  document.querySelectorAll('[data-current-year]').forEach((element) => {
    element.textContent = currentYear;
  });

  initPageTransitions();
  initAnchorNavigation();
  initFooterItemIcons();
  initBookingWidget();
  initHeaderScrollState();

  const navToggle = document.getElementById('navToggle');
  const mobileMenu = document.getElementById('mobileMenu');
  const header = document.querySelector('.site-header');
  if (navToggle && mobileMenu) {
    const mobileLinks = Array.from(mobileMenu.querySelectorAll('a'));

    const setMenuState = (expanded) => {
      navToggle.setAttribute('aria-expanded', String(expanded));
      navToggle.setAttribute('aria-label', expanded ? 'Sluit menu' : 'Open menu');
      mobileMenu.classList.toggle('is-open', expanded);
      mobileMenu.setAttribute('aria-hidden', String(!expanded));

      if (header) {
        header.classList.toggle('is-menu-open', expanded);
      }
    };

    const toggleMenu = () => {
      const expanded = navToggle.getAttribute('aria-expanded') === 'true';
      setMenuState(!expanded);
    };

    setMenuState(false);
    navToggle.addEventListener('click', toggleMenu);

    document.addEventListener('click', (event) => {
      const isMenuOpen = navToggle.getAttribute('aria-expanded') === 'true';
      if (!isMenuOpen) {
        return;
      }

      const target = event.target;
      if (!(target instanceof Node)) {
        return;
      }

      if (navToggle.contains(target) || mobileMenu.contains(target)) {
        return;
      }

      setMenuState(false);
    });

    mobileLinks.forEach((link) => {
      link.addEventListener('click', () => {
        setMenuState(false);
      });
    });

    window.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') {
        setMenuState(false);
      }
    });

    const mobileBreakpoint = window.matchMedia('(min-width: 640px)');
    mobileBreakpoint.addEventListener('change', (event) => {
      if (event.matches) {
        setMenuState(false);
      }
    });
  }

  // Testimonials slider (on homepage)
  const reviewsContainer = document.getElementById('reviewsInner');
  const prevBtn = document.getElementById('prevReview');
  const nextBtn = document.getElementById('nextReview');
  if (reviewsContainer && prevBtn && nextBtn) {
    const items = reviewsContainer.children;
    let currentIndex = 0;
    const total = items.length;
    function updateSlider() {
      const offset = currentIndex * 100;
      reviewsContainer.style.transform = `translateX(-${offset}%)`;
    }
    prevBtn.addEventListener('click', () => {
      currentIndex = (currentIndex - 1 + total) % total;
      updateSlider();
    });
    nextBtn.addEventListener('click', () => {
      currentIndex = (currentIndex + 1) % total;
      updateSlider();
    });
  }

  initFooterReveal();
});

function initPageTransitions() {
  const body = document.body;
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const transitionMs = prefersReducedMotion ? 25 : 160;
  let isNavigating = false;

  if (!body) {
    return;
  }

  body.classList.remove('opacity-0');
  body.classList.add('opacity-100');

  if (!prefersReducedMotion) {
    body.classList.add('transition-opacity', 'duration-200', 'ease-out');
  }

  // Browsers can restore pages from bfcache with old classes still applied.
  window.addEventListener('pageshow', () => {
    body.classList.remove('opacity-0');
    body.classList.add('opacity-100');
  });

  document.addEventListener('click', (event) => {
    if (event.defaultPrevented || isNavigating) {
      return;
    }

    const link = event.target.closest('a');
    if (!(link instanceof HTMLAnchorElement)) {
      return;
    }

    if (!link.href || link.target === '_blank' || link.hasAttribute('download')) {
      return;
    }

    const href = link.getAttribute('href') || '';
    if (
      href.startsWith('#')
      || href.startsWith('mailto:')
      || href.startsWith('tel:')
      || href.startsWith('javascript:')
    ) {
      return;
    }

    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0) {
      return;
    }

    const destination = new URL(link.href, window.location.href);
    if (destination.origin !== window.location.origin) {
      return;
    }

    const samePath = destination.pathname === window.location.pathname;
    const hashOnlyChange = samePath && destination.search === window.location.search && destination.hash;
    if (hashOnlyChange) {
      return;
    }

    event.preventDefault();
    isNavigating = true;
    body.classList.remove('opacity-100');
    body.classList.add('opacity-0');

    window.setTimeout(() => {
      window.location.assign(destination.href);
    }, transitionMs);
  });
}

function initImmersiveLoader() {
  const body = document.body;
  const releaseGuard = () => window.__gbtLoaderGuard?.release();

  if (!body || body.dataset.loaderDisabled === 'true') {
    releaseGuard();
    return;
  }

  if (hasSeenLoaderInCurrentTab()) {
    releaseGuard();
    return;
  }

  markLoaderAsSeenInCurrentTab();

  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const minVisibleMs = 900;
  const simEstimateMs = 2400;
  const exitDurationMs = prefersReducedMotion ? 100 : 420;
  const fontWaitMs = prefersReducedMotion ? 150 : 900;
  const hardCloseMs = prefersReducedMotion ? 1800 : 4200;

  const animatedGlyph = `
    <svg viewBox="0 0 120 120" class="h-24 w-24" aria-hidden="true" focusable="false">
      <defs>
        <linearGradient id="appLoaderBarsGradient" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="#9e846c"></stop>
          <stop offset="55%" stop-color="#8b7056"></stop>
          <stop offset="100%" stop-color="#7e7267"></stop>
        </linearGradient>
      </defs>

      <g fill="url(#appLoaderBarsGradient)">
        <rect x="14" y="48" width="8" height="24" rx="4">
          <animate attributeName="y" values="56;34;56" dur="1.2s" begin="0s" repeatCount="indefinite"></animate>
          <animate attributeName="height" values="16;38;16" dur="1.2s" begin="0s" repeatCount="indefinite"></animate>
        </rect>
        <rect x="30" y="40" width="8" height="40" rx="4">
          <animate attributeName="y" values="50;22;50" dur="1.2s" begin="0.08s" repeatCount="indefinite"></animate>
          <animate attributeName="height" values="20;54;20" dur="1.2s" begin="0.08s" repeatCount="indefinite"></animate>
        </rect>
        <rect x="46" y="34" width="8" height="52" rx="4">
          <animate attributeName="y" values="44;14;44" dur="1.2s" begin="0.16s" repeatCount="indefinite"></animate>
          <animate attributeName="height" values="28;62;28" dur="1.2s" begin="0.16s" repeatCount="indefinite"></animate>
        </rect>
        <rect x="62" y="28" width="8" height="60" rx="4">
          <animate attributeName="y" values="36;8;36" dur="1.2s" begin="0.24s" repeatCount="indefinite"></animate>
          <animate attributeName="height" values="36;72;36" dur="1.2s" begin="0.24s" repeatCount="indefinite"></animate>
        </rect>
        <rect x="78" y="34" width="8" height="52" rx="4">
          <animate attributeName="y" values="44;14;44" dur="1.2s" begin="0.32s" repeatCount="indefinite"></animate>
          <animate attributeName="height" values="28;62;28" dur="1.2s" begin="0.32s" repeatCount="indefinite"></animate>
        </rect>
        <rect x="94" y="40" width="8" height="40" rx="4">
          <animate attributeName="y" values="50;22;50" dur="1.2s" begin="0.4s" repeatCount="indefinite"></animate>
          <animate attributeName="height" values="20;54;20" dur="1.2s" begin="0.4s" repeatCount="indefinite"></animate>
        </rect>
      </g>
    </svg>
  `;

  const staticGlyph = `
    <svg viewBox="0 0 120 120" class="h-24 w-24" aria-hidden="true" focusable="false">
      <defs>
        <linearGradient id="appLoaderBarsGradient" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="#d6bf8a"></stop>
          <stop offset="55%" stop-color="#c6a45a"></stop>
          <stop offset="100%" stop-color="#a6855e"></stop>
        </linearGradient>
      </defs>
      <g fill="url(#appLoaderBarsGradient)">
        <rect x="14" y="56" width="8" height="16" rx="4"></rect>
        <rect x="30" y="50" width="8" height="20" rx="4"></rect>
        <rect x="46" y="44" width="8" height="28" rx="4"></rect>
        <rect x="62" y="36" width="8" height="36" rx="4"></rect>
        <rect x="78" y="44" width="8" height="28" rx="4"></rect>
        <rect x="94" y="50" width="8" height="20" rx="4"></rect>
      </g>
    </svg>
  `;

  const loader = document.createElement('div');
  loader.id = 'appLoader';
  loader.className = [
    'visible opacity-0 fixed inset-0 z-[9999] flex items-center justify-center overflow-hidden',
    'bg-[linear-gradient(135deg,#000000_0%,#080808_42%,#1b150d_100%)] text-white',
    'transition-opacity duration-500 ease-out motion-reduce:transition-none'
  ].join(' ');
  loader.setAttribute('role', 'dialog');
  loader.setAttribute('aria-modal', 'true');
  loader.setAttribute('aria-label', 'Pagina wordt geladen');

  loader.innerHTML = `
    <div class="pointer-events-none absolute -left-28 top-[-6rem] h-72 w-72 rounded-full bg-amber-200/10 blur-3xl" aria-hidden="true"></div>
    <div class="pointer-events-none absolute -right-24 bottom-[-5rem] h-64 w-64 rounded-full bg-amber-600/20 blur-3xl" aria-hidden="true"></div>

    <div id="appLoaderPanel" class="relative w-full max-w-sm px-8 text-center transition-all duration-500 ease-out motion-reduce:transition-none outline-none focus:outline-none focus-visible:outline-none" tabindex="-1">
      <div class="relative mx-auto w-fit">
        <div class="pointer-events-none absolute inset-0 rounded-full bg-amber-400/20 blur-2xl" aria-hidden="true"></div>
        <div id="appLoaderGlyph" class="relative">${prefersReducedMotion ? staticGlyph : animatedGlyph}</div>
      </div>

      <p class="mt-5 text-[0.82rem] font-medium uppercase tracking-[0.34em] text-[#e8dcc2]/85">Glamour by tink</p>
      <div id="appLoaderProgress" class="sr-only" role="progressbar" aria-label="Laadvoortgang" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0"></div>
      <p id="appLoaderPercent" class="sr-only">0%</p>
    </div>
  `;

  body.append(loader);

  const panel = loader.querySelector('#appLoaderPanel');
  const glyph = loader.querySelector('#appLoaderGlyph');
  const progressNode = loader.querySelector('#appLoaderProgress');
  const percentNode = loader.querySelector('#appLoaderPercent');

  if (!panel || !glyph || !progressNode || !percentNode) {
    loader.remove();
    releaseGuard();
    return;
  }

  // Fade the loader in over the dark guard background, then reveal the (covered) page.
  window.requestAnimationFrame(() => {
    window.requestAnimationFrame(() => {
      loader.classList.remove('opacity-0');
    });
  });
  window.setTimeout(releaseGuard, prefersReducedMotion ? 50 : 520);

  const previousHtmlOverflow = document.documentElement.style.overflow;
  const previousBodyOverflow = body.style.overflow;
  document.documentElement.style.overflow = 'hidden';
  body.style.overflow = 'hidden';
  body.setAttribute('aria-busy', 'true');

  const inertTargets = Array.from(body.children).filter((node) => node !== loader);
  inertTargets.forEach((node) => {
    if (node instanceof HTMLElement) {
      node.inert = true;
    }
  });

  panel.focus({ preventScroll: true });

  const startedAt = performance.now();
  let progress = 0;
  let displayed = -1;
  let readyToFinish = false;
  let isClosed = false;
  let isUnlocked = false;
  let rafId = 0;
  let closeTimerId = 0;
  let hardCloseTimerId = 0;

  const easeOutCubic = (value) => 1 - Math.pow(1 - Math.min(1, value), 3);

  const render = (value) => {
    const clamped = Math.max(0, Math.min(100, value));
    progressNode.setAttribute('aria-valuenow', String(Math.round(clamped)));

    const rounded = Math.round(clamped);

    if (rounded !== displayed) {
      displayed = rounded;
      percentNode.textContent = `${rounded}%`;
    }
  };

  const unlock = () => {
    if (isUnlocked) {
      return;
    }
    isUnlocked = true;

    inertTargets.forEach((node) => {
      if (node instanceof HTMLElement) {
        node.inert = false;
      }
    });

    document.documentElement.style.overflow = previousHtmlOverflow;
    body.style.overflow = previousBodyOverflow;
    body.setAttribute('aria-busy', 'false');
  };

  const close = () => {
    if (isClosed) {
      return;
    }

    isClosed = true;
    loader.classList.add('opacity-0');
    panel.classList.add('opacity-0', 'scale-95');

    closeTimerId = window.setTimeout(() => {
      loader.remove();
      unlock();
    }, exitDurationMs);
  };

  const forceClose = () => {
    if (isClosed) {
      return;
    }

    if (rafId) {
      window.cancelAnimationFrame(rafId);
      rafId = 0;
    }

    render(100);
    close();
  };

  const tick = (now) => {
    const elapsed = now - startedAt;
    const t = Math.min(1, elapsed / simEstimateMs);
    const simulatedTarget = Math.min(95, 95 * easeOutCubic(t));
    const target = readyToFinish ? 100 : simulatedTarget;
    const blend = readyToFinish ? 0.16 : 0.05;

    progress += (target - progress) * blend;
    if (readyToFinish && 100 - progress < 0.3) {
      progress = 100;
    }

    render(progress);

    if (progress >= 100) {
      close();
      return;
    }

    rafId = window.requestAnimationFrame(tick);
  };

  const readyPromise = new Promise((resolve) => {
    if (document.readyState === 'complete') {
      resolve();
      return;
    }
    window.addEventListener('load', resolve, { once: true });
  });

  const fontPromise = document.fonts?.ready
    ? Promise.race([
      document.fonts.ready.catch(() => {}),
      new Promise((resolve) => {
        window.setTimeout(resolve, fontWaitMs);
      })
    ])
    : Promise.resolve();

  const visiblePromise = new Promise((resolve) => {
    window.setTimeout(resolve, minVisibleMs);
  });

  render(0);
  rafId = window.requestAnimationFrame(tick);
  hardCloseTimerId = window.setTimeout(forceClose, hardCloseMs);

  Promise.all([readyPromise, fontPromise, visiblePromise]).then(() => {
    readyToFinish = true;
  });

  // Guard against edge-cases where the page lifecycle aborts the animation.
  window.addEventListener('pagehide', () => {
    if (rafId) {
      window.cancelAnimationFrame(rafId);
      rafId = 0;
    }
    if (hardCloseTimerId) {
      window.clearTimeout(hardCloseTimerId);
    }
    if (closeTimerId) {
      window.clearTimeout(closeTimerId);
    }
    loader.remove();
    unlock();
  }, { once: true });
}

function hasSeenLoaderInCurrentTab() {
  return typeof window.name === 'string' && window.name.includes(LOADER_TAB_FLAG);
}

function markLoaderAsSeenInCurrentTab() {
  if (hasSeenLoaderInCurrentTab()) {
    return;
  }

  const currentName = typeof window.name === 'string' ? window.name : '';
  const separator = currentName ? '|' : '';
  window.name = `${currentName}${separator}${LOADER_TAB_FLAG}`;
}

// ─────────────────────────────────────────────────────────────
// Shared header glass effect on scroll
// Keeps the navbar behavior consistent across pages.
// ─────────────────────────────────────────────────────────────
function initHeaderScrollState() {
  const header = document.querySelector('.site-header');
  if (!header) {
    return;
  }

  const updateHeaderState = () => {
    header.classList.toggle('is-scrolled', window.scrollY > 24);
  };

  updateHeaderState();
  window.addEventListener('scroll', updateHeaderState, { passive: true });
  window.addEventListener('load', updateHeaderState);
}

function initFooterItemIcons() {
  const footer = document.querySelector('.site-footer');
  if (!footer) {
    return;
  }

  const scriptSource = Array.from(document.scripts)
    .map((script) => script.getAttribute('src'))
    .find((src) => typeof src === 'string' && /(^|\/)js\/script\.js(?:[?#].*)?$/.test(src));

  const iconBaseUrl = scriptSource
    ? new URL('../assets/icons/', new URL(scriptSource, window.location.href))
    : new URL('./assets/icons/', window.location.href);

  const applyIcon = (element, iconFile, altText) => {
    if (!element || element.dataset.footerIconApplied === 'true') {
      return;
    }

    const icon = document.createElement('img');
    icon.src = new URL(iconFile, iconBaseUrl).href;
    icon.alt = altText;
    icon.className = 'h-[0.95em] w-[0.95em] shrink-0 object-contain opacity-90';
    icon.loading = 'lazy';
    icon.decoding = 'async';

    element.classList.add('inline-flex', 'items-center', 'gap-2', 'align-top');
    element.prepend(icon);
    element.dataset.footerIconApplied = 'true';
  };

  footer.querySelectorAll('.footer-col--nav .footer-nav-link').forEach((link) => {
    applyIcon(link, 'chevron-right.svg', 'Link');
  });
}

// ─────────────────────────────────────────────────────────────
// Footer scroll-reveal
// Uses IntersectionObserver to trigger CSS-driven animations:
//   · Pre-footer CTA  → cascaded entry via .is-revealed
//   · Footer columns  → staggered entry via .is-visible
//   · Divider lines   → draw animation via .is-drawn
// ─────────────────────────────────────────────────────────────
function initAnchorNavigation() {
  const header = document.querySelector('.site-header');
  const snapContainer = document.querySelector('.panel-scroll');
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  let snapResetTimer = 0;

  const updateAnchorOffset = () => {
    const headerHeight = header ? Math.ceil(header.getBoundingClientRect().height) : 0;
    document.documentElement.style.setProperty('--site-header-offset', `${headerHeight + 16}px`);
  };

  const temporarilyDisableSnap = () => {
    if (!snapContainer) {
      return;
    }

    snapContainer.classList.add('is-anchor-scrolling');
    window.clearTimeout(snapResetTimer);
    snapResetTimer = window.setTimeout(() => {
      snapContainer.classList.remove('is-anchor-scrolling');
    }, reducedMotion ? 80 : 700);
  };

  const scrollToHash = (hash, behavior = 'smooth') => {
    if (!hash || hash === '#') {
      return false;
    }

    const targetId = decodeURIComponent(hash.slice(1));
    if (!targetId) {
      return false;
    }

    const target = document.getElementById(targetId);
    if (!target) {
      return false;
    }

    updateAnchorOffset();
    temporarilyDisableSnap();

    const headerOffset = header ? Math.ceil(header.getBoundingClientRect().height) + 12 : 12;
    const targetTop = window.scrollY + target.getBoundingClientRect().top - headerOffset;

    window.scrollTo({
      top: Math.max(0, targetTop),
      behavior: reducedMotion ? 'auto' : behavior
    });

    return true;
  };

  updateAnchorOffset();
  window.addEventListener('resize', updateAnchorOffset, { passive: true });
  window.addEventListener('load', updateAnchorOffset);

  if (document.fonts?.ready) {
    document.fonts.ready.then(updateAnchorOffset).catch(() => {});
  }

  document.addEventListener('click', (event) => {
    const link = event.target.closest('a[href*="#"]');
    if (!(link instanceof HTMLAnchorElement)) {
      return;
    }
    if (link.hasAttribute('data-booking-open')) {
      return;
    }

    const url = new URL(link.href, window.location.href);
    const isSamePage = url.origin === window.location.origin
      && url.pathname === window.location.pathname
      && url.hash;

    if (!isSamePage) {
      return;
    }

    event.preventDefault();
    if (window.location.hash !== url.hash) {
      history.pushState(null, '', url.hash);
    }

    scrollToHash(url.hash);
  });

  if (window.location.hash) {
    window.requestAnimationFrame(() => {
      window.setTimeout(() => {
        scrollToHash(window.location.hash, 'auto');
      }, 40);
    });
  }

  window.addEventListener('hashchange', () => {
    scrollToHash(window.location.hash);
  });
}

function initFooterReveal() {
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Pre-footer CTA: observe the section, child elements cascade via CSS
  const prefooterCta = document.querySelector('.prefooter-cta');
  if (prefooterCta) {
    if (reducedMotion) {
      prefooterCta.classList.add('is-revealed');
    } else {
      const ctaObserver = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              prefooterCta.classList.add('is-revealed');
              ctaObserver.unobserve(entry.target);
            }
          });
        },
        { threshold: 0.12, rootMargin: '0px 0px -5% 0px' }
      );
      ctaObserver.observe(prefooterCta);
    }
  }

  // Footer columns: each observed individually, CSS handles stagger via nth-child delay
  const footerCols = document.querySelectorAll('.footer-col');
  if (footerCols.length) {
    if (reducedMotion) {
      footerCols.forEach((col) => col.classList.add('is-visible'));
    } else {
      const colObserver = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              entry.target.classList.add('is-visible');
              colObserver.unobserve(entry.target);
            }
          });
        },
        { threshold: 0.1, rootMargin: '0px 0px -5% 0px' }
      );
      footerCols.forEach((col) => colObserver.observe(col));
    }
  }

  // Divider lines: animated scaleX draw
  const lines = document.querySelectorAll('.footer-rule');
  if (lines.length) {
    if (reducedMotion) {
      lines.forEach((line) => line.classList.add('is-drawn'));
    } else {
      const lineObserver = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              entry.target.classList.add('is-drawn');
              lineObserver.unobserve(entry.target);
            }
          });
        },
        { threshold: 0.5 }
      );
      lines.forEach((line) => lineObserver.observe(line));
    }
  }
}

function initBookingWidget() {
  const openTriggers = Array.from(document.querySelectorAll('[data-booking-open]'));

  if (!openTriggers.length) {
    return;
  }

  const openBookingWidget = () => {
    ensureBookingWidgetReady()
      .then((bookingWidget) => {
        if (!bookingWidget?.showWidget) {
          return;
        }

        hideDefaultSalonizedButton();
        bookingWidget.showWidget();
      })
      .catch(() => {});
  };

  openTriggers.forEach((trigger) => {
    trigger.addEventListener('click', (event) => {
      if (trigger.tagName === 'A') {
        event.preventDefault();
      }

      openBookingWidget();
    });
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && window.szBooking?.hideWidget) {
      window.szBooking.hideWidget();
    }
  });

  ensureBookingWidgetReady().catch(() => {});
}

function ensureBookingWidgetReady() {
  if (window.szBooking?.showWidget) {
    decorateBookingWidget(window.szBooking);
    hideDefaultSalonizedButton();
    return Promise.resolve(window.szBooking);
  }

  if (bookingWidgetReadyPromise) {
    return bookingWidgetReadyPromise;
  }

  bookingWidgetReadyPromise = new Promise((resolve, reject) => {
    createSalonizedBookingContainer();

    const settleWhenReady = () => {
      const startedAt = Date.now();
      const pollId = window.setInterval(() => {
        if (window.szBooking?.showWidget) {
          window.clearInterval(pollId);
          decorateBookingWidget(window.szBooking);
          hideDefaultSalonizedButton();
          resolve(window.szBooking);
          return;
        }

        if (Date.now() - startedAt >= 6000) {
          window.clearInterval(pollId);
          bookingWidgetReadyPromise = undefined;
          reject(new Error('Salonized booking widget could not be initialized.'));
        }
      }, 50);
    };

    const existingScript = document.querySelector(`script[src="${SALONIZED_WIDGET_SCRIPT_SRC}"]`);
    if (existingScript) {
      settleWhenReady();
      return;
    }

    const script = document.createElement('script');
    script.src = SALONIZED_WIDGET_SCRIPT_SRC;
    script.async = true;
    script.addEventListener('load', settleWhenReady, { once: true });
    script.addEventListener('error', () => {
      bookingWidgetReadyPromise = undefined;
      reject(new Error('Salonized widget loader failed to load.'));
    }, { once: true });
    document.body.appendChild(script);
  });

  return bookingWidgetReadyPromise;
}

function createSalonizedBookingContainer() {
  const existingContainer = document.querySelector(SALONIZED_BOOKING_SELECTOR);
  if (existingContainer) {
    return existingContainer;
  }

  const container = document.createElement('div');
  container.className = 'salonized-booking';
  container.dataset.gbtBookingWidget = 'true';
  container.dataset.company = SALONIZED_BOOKING_CONFIG.company;
  container.dataset.color = SALONIZED_BOOKING_CONFIG.color;
  container.dataset.language = SALONIZED_BOOKING_CONFIG.language;
  container.dataset.outline = SALONIZED_BOOKING_CONFIG.outline;
  container.hidden = true;
  container.setAttribute('aria-hidden', 'true');
  document.body.appendChild(container);

  return container;
}

function hideDefaultSalonizedButton() {
  const buttonFrame = window.szBooking?.$buttonFrame;
  if (!buttonFrame) {
    return;
  }

  buttonFrame.style.setProperty('display', 'none', 'important');
  buttonFrame.style.setProperty('opacity', '0', 'important');
  buttonFrame.style.setProperty('pointer-events', 'none', 'important');
  buttonFrame.setAttribute('tabindex', '-1');
  buttonFrame.setAttribute('aria-hidden', 'true');
}

function decorateBookingWidget(bookingWidget) {
  if (!bookingWidget || bookingWidget.__gbtBookingDecorated) {
    return;
  }

  const originalShowWidget = bookingWidget.showWidget?.bind(bookingWidget);
  const originalHideWidget = bookingWidget.hideWidget?.bind(bookingWidget);
  const originalToggleWidget = bookingWidget.toggleWidget?.bind(bookingWidget);

  if (originalShowWidget) {
    bookingWidget.showWidget = (...args) => {
      syncBookingBackdrop(true);
      const result = originalShowWidget(...args);
      scheduleBookingFrameSync();
      return result;
    };
  }

  if (originalHideWidget) {
    bookingWidget.hideWidget = (...args) => {
      syncBookingBackdrop(false);
      return originalHideWidget(...args);
    };
  }

  if (originalToggleWidget) {
    bookingWidget.toggleWidget = (...args) => {
      const willOpen = !bookingWidget.state?.isWidgetVisible;
      syncBookingBackdrop(willOpen);
      const result = originalToggleWidget(...args);
      if (willOpen) {
        scheduleBookingFrameSync();
      }
      return result;
    };
  }

  bookingWidget.__gbtBookingDecorated = 'true';

  window.addEventListener('resize', () => {
    updateBookingBackdropInset();
    applyBookingFrameStyles();
  }, { passive: true });
}

function scheduleBookingFrameSync() {
  window.requestAnimationFrame(() => {
    applyBookingFrameStyles();
  });

  window.setTimeout(() => {
    applyBookingFrameStyles();
  }, 80);

  window.setTimeout(() => {
    applyBookingFrameStyles();
  }, 220);
}

function applyBookingFrameStyles() {
  const widgetFrame = window.szBooking?.$widgetFrame;
  if (!widgetFrame) {
    return;
  }

  const viewportInset = getBookingViewportInset();
  const frameWidth = `min(${BOOKING_WIDGET_MAX_WIDTH}px, calc(100vw - ${viewportInset * 2}px))`;
  const frameHeight = `min(${BOOKING_WIDGET_MAX_HEIGHT}px, calc(100vh - ${viewportInset * 2}px))`;

  widgetFrame.style.setProperty('right', `${viewportInset}px`, 'important');
  widgetFrame.style.setProperty('bottom', `${viewportInset}px`, 'important');
  widgetFrame.style.setProperty('left', 'auto', 'important');
  widgetFrame.style.setProperty('top', 'auto', 'important');
  widgetFrame.style.setProperty('width', frameWidth, 'important');
  widgetFrame.style.setProperty('max-width', frameWidth, 'important');
  widgetFrame.style.setProperty('height', frameHeight, 'important');
  widgetFrame.style.setProperty('max-height', frameHeight, 'important');
  widgetFrame.style.setProperty('border-radius', viewportInset <= 14 ? '18px' : '22px', 'important');
  widgetFrame.style.setProperty('box-shadow', '0 28px 80px -34px rgba(0, 0, 0, 0.72)', 'important');
  widgetFrame.style.setProperty('overflow', 'hidden', 'important');
  widgetFrame.style.setProperty('background-color', '#ffffff', 'important');
}

function syncBookingBackdrop(isVisible) {
  const backdrop = getBookingBackdrop();
  if (!backdrop) {
    return;
  }

  window.clearTimeout(bookingBackdropHideTimerId);

  if (isVisible) {
    updateBookingBackdropInset();
    backdrop.hidden = false;
    backdrop.setAttribute('aria-hidden', 'false');
    window.requestAnimationFrame(() => {
      backdrop.style.opacity = '1';
      backdrop.style.pointerEvents = 'auto';
    });
    return;
  }

  backdrop.style.opacity = '0';
  backdrop.style.pointerEvents = 'none';
  backdrop.setAttribute('aria-hidden', 'true');
  bookingBackdropHideTimerId = window.setTimeout(() => {
    backdrop.hidden = true;
  }, 220);
}

function getBookingBackdrop() {
  const existingBackdrop = document.querySelector(BOOKING_BACKDROP_SELECTOR);
  if (existingBackdrop instanceof HTMLDivElement) {
    return existingBackdrop;
  }

  const backdrop = document.createElement('div');
  backdrop.dataset.bookingBackdrop = 'true';
  backdrop.hidden = true;
  backdrop.setAttribute('aria-hidden', 'true');
  backdrop.style.position = 'fixed';
  backdrop.style.zIndex = '2147483550';
  backdrop.style.borderRadius = '24px';
  backdrop.style.background = 'rgba(4, 3, 3, 0.54)';
  backdrop.style.backdropFilter = 'blur(3px)';
  backdrop.style.webkitBackdropFilter = 'blur(3px)';
  backdrop.style.opacity = '0';
  backdrop.style.pointerEvents = 'none';
  backdrop.style.transition = 'opacity 0.2s ease';
  updateBookingBackdropInset(backdrop);
  backdrop.addEventListener('click', () => {
    if (window.szBooking?.hideWidget) {
      window.szBooking.hideWidget();
    }
  });
  document.body.appendChild(backdrop);

  return backdrop;
}

function updateBookingBackdropInset(existingBackdrop) {
  const backdrop = existingBackdrop || document.querySelector(BOOKING_BACKDROP_SELECTOR);
  if (!(backdrop instanceof HTMLDivElement)) {
    return;
  }

  const viewportInset = getBookingViewportInset();
  backdrop.style.inset = `${viewportInset}px`;
}

function getBookingViewportInset() {
  if (window.innerWidth <= 640) {
    return 12;
  }

  if (window.innerWidth <= 1024) {
    return 16;
  }

  return 22;
}

