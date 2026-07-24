document.addEventListener('DOMContentLoaded', () => {
  const reducedMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
  const tabletQuery = window.matchMedia('(min-width: 768px)');
  const desktopQuery = window.matchMedia('(min-width: 1024px)');
  const reducedMotion = reducedMotionQuery.matches;

  initHeaderState();
  initStoryBrandFade(reducedMotion);
  initPanelVisibilityObserver();
  initStoryPanelProgress();
  initStoryPanelDrag();
  initStoryPanelReveal(reducedMotion);
  initStoryScrollHint({ reducedMotion });
  initStoryPanelCopyEqualHeight();
  initSplitVisualSync();
  initShowcaseActivation();
  initHeroReadyState(reducedMotion);
  initRevealObserver(reducedMotion);
  initParallaxSystem({ reducedMotion, tabletQuery, desktopQuery });
  initCursorGlow(reducedMotion);
  initScrollIndicatorMotion({ reducedMotion });

  if (reducedMotion) {
    initReducedMotion();
  }
});

function initHeroReadyState(reducedMotion) {
  if (reducedMotion) {
    document.body.classList.add('is-ready');
    return;
  }

  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      document.body.classList.add('is-ready');
    });
  });
}

function initRevealObserver(reducedMotion) {
  const selectors = [
    '.metric-card',
    '.hero-note',
    '.separator-copy',
    '.visual-stage',
    '.section-intro',
    '.service-step',
    '.showcase-heading',
    '.showcase-item',
    '.stack-card',
    '.cta-shell',
    '.cta-card'
  ];

  const elements = [...new Set(selectors.flatMap((selector) => Array.from(document.querySelectorAll(selector))))];
  if (!elements.length) {
    return;
  }

  elements.forEach((element) => element.classList.add('reveal-on-scroll'));

  if (reducedMotion) {
    elements.forEach((element) => element.classList.add('is-revealed'));
    return;
  }

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-revealed');
          observer.unobserve(entry.target);
        }
      });
    },
    {
      threshold: 0.12,
      rootMargin: '0px 0px 6% 0px'
    }
  );

  elements.forEach((element) => observer.observe(element));
}

function initParallaxSystem({ reducedMotion, tabletQuery, desktopQuery }) {
  const layers = Array.from(document.querySelectorAll('[data-parallax-layer]'));
  if (!layers.length) {
    return;
  }

  const activeLayers = new Set(layers);
  let framePending = false;

  const getMode = () => {
    if (!tabletQuery.matches) {
      return 'mobile';
    }

    return desktopQuery.matches ? 'desktop' : 'tablet';
  };

  const getSpeed = (layer, mode) => {
    const desktopSpeed = Number.parseFloat(layer.dataset.parallaxSpeed || '0');
    const tabletSpeed = Number.parseFloat(layer.dataset.parallaxTablet || `${desktopSpeed}`);
    const mobileFallback = tabletSpeed !== 0 ? tabletSpeed : desktopSpeed;
    const mobileSpeed = Number.parseFloat(layer.dataset.parallaxMobile || `${mobileFallback}`);

    if (mode === 'mobile') {
      return mobileSpeed;
    }

    return mode === 'desktop' ? desktopSpeed : tabletSpeed;
  };

  const setOffset = (layer, offset) => {
    layer.style.setProperty('--parallax-y', `${offset.toFixed(2)}px`);
  };

  const update = () => {
    framePending = false;

    const mode = getMode();
    if (reducedMotion) {
      layers.forEach((layer) => setOffset(layer, 0));
      return;
    }

    const viewportHeight = window.innerHeight;
    const layersToUpdate = mode === 'mobile' ? layers : activeLayers;

    layersToUpdate.forEach((layer) => {
      const speed = getSpeed(layer, mode);
      if (!speed) {
        setOffset(layer, 0);
        return;
      }

      const rect = layer.getBoundingClientRect();
      const distanceFromCenter = rect.top + rect.height / 2 - viewportHeight / 2;
      const maxShift = Number.parseFloat(layer.dataset.parallaxMax || '') || Math.max(18, rect.height * 0.12);
      const offset = Math.max(-maxShift, Math.min(maxShift, distanceFromCenter * speed));

      setOffset(layer, offset);
    });
  };

  const scheduleUpdate = () => {
    if (framePending) {
      return;
    }

    framePending = true;
    requestAnimationFrame(update);
  };

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          activeLayers.add(entry.target);
          return;
        }

        activeLayers.delete(entry.target);
      });

      scheduleUpdate();
    },
    {
      rootMargin: '20% 0px 20% 0px'
    }
  );

  layers.forEach((layer) => observer.observe(layer));

  window.addEventListener('scroll', scheduleUpdate, { passive: true });
  window.addEventListener('resize', scheduleUpdate, { passive: true });
  window.addEventListener('orientationchange', scheduleUpdate, { passive: true });
  tabletQuery.addEventListener('change', scheduleUpdate);
  desktopQuery.addEventListener('change', scheduleUpdate);

  scheduleUpdate();
}

function initHeaderState() {
  const header = document.querySelector('.site-header');
  const storySection = document.querySelector('.story-section');
  if (!header) {
    return;
  }

  const syncHeader = () => {
    if (!storySection) {
      header.classList.toggle('is-scrolled', window.scrollY > 20);
      return;
    }

    const rect = storySection.getBoundingClientRect();
    const progress = Math.max(0, Math.min(1, -rect.top / Math.max(1, rect.height)));
    header.classList.toggle('is-scrolled', progress >= 0.08);
  };

  syncHeader();
  window.addEventListener('scroll', syncHeader, { passive: true });
}

function initStoryBrandFade(reducedMotion) {
  const storySection = document.querySelector('.story-section');
  const storyBrandLockup = document.querySelector('[data-story-brand-lockup]');

  if (!storySection || !storyBrandLockup) {
    return;
  }

  storyBrandLockup.style.willChange = 'opacity';

  if (reducedMotion) {
    storyBrandLockup.style.opacity = '';
    return;
  }

  let framePending = false;
  const baseOpacity = Number.parseFloat(window.getComputedStyle(storyBrandLockup).opacity) || 1;

  const update = () => {
    framePending = false;

    const rect = storySection.getBoundingClientRect();
    const fadeStart = window.innerHeight * 0.25;
    const fadeDistance = Math.max(180, window.innerHeight * 0.22);
    const progress = Math.max(0, Math.min(1, (fadeStart - rect.top) / fadeDistance));

    storyBrandLockup.style.opacity = (baseOpacity * (1 - progress)).toFixed(3);
  };

  const scheduleUpdate = () => {
    if (framePending) {
      return;
    }

    framePending = true;
    requestAnimationFrame(update);
  };

  window.addEventListener('scroll', scheduleUpdate, { passive: true });
  window.addEventListener('resize', scheduleUpdate, { passive: true });
  window.addEventListener('orientationchange', scheduleUpdate, { passive: true });

  scheduleUpdate();
}

function initPanelVisibilityObserver() {
  const panels = document.querySelectorAll('.panel-section');
  if (!panels.length) {
    return;
  }

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        entry.target.classList.toggle('is-visible', entry.isIntersecting && entry.intersectionRatio >= 0.3);
      });
    },
    {
      threshold: [0.3, 0.5, 0.7]
    }
  );

  panels.forEach((panel) => observer.observe(panel));
}

function initStoryPanelProgress() {
  const storyPanels = document.querySelectorAll('.story-panel');
  const storyRail = document.querySelector('.story-panels');
  const label = document.querySelector('[data-panel-current]');

  if (!storyRail || !storyPanels.length || !label) {
    return;
  }

  const updateLabel = () => {
    let activeIndex = 0;
    let bestVisibility = 0;

    storyPanels.forEach((panel, index) => {
      const rect = panel.getBoundingClientRect();
      const visibleWidth = Math.max(0, Math.min(rect.right, window.innerWidth) - Math.max(rect.left, 0));
      const visibility = visibleWidth / Math.max(1, rect.width);

      if (visibility > bestVisibility) {
        bestVisibility = visibility;
        activeIndex = index;
      }
    });

    label.textContent = String(activeIndex + 1).padStart(2, '0');
  };

  updateLabel();
  storyRail.addEventListener('scroll', updateLabel, { passive: true });
  window.addEventListener('resize', updateLabel);
}

function initStoryPanelDrag() {
  const storyRail = document.querySelector('.story-panels');
  const finePointer = window.matchMedia('(pointer: fine)').matches;

  if (!storyRail || !finePointer) {
    return;
  }

  let isDragging = false;
  let hasDragged = false;
  let pointerId = null;
  let startX = 0;
  let startScrollLeft = 0;
  let lastPointerX = 0;
  let lastPointerTime = 0;
  let dragVelocity = 0;
  let targetScrollLeft = storyRail.scrollLeft;
  let smoothScrollFrame = null;
  let inertiaFrame = null;
  const maxScroll = () => Math.max(0, storyRail.scrollWidth - storyRail.clientWidth);

  const clampScroll = (value) => Math.max(0, Math.min(value, maxScroll()));

  const stopInertia = () => {
    if (!inertiaFrame) {
      return;
    }

    cancelAnimationFrame(inertiaFrame);
    inertiaFrame = null;
  };

  const runSmoothDrag = () => {
    if (!isDragging) {
      smoothScrollFrame = null;
      return;
    }

    const current = storyRail.scrollLeft;
    const next = current + (targetScrollLeft - current) * 0.3;
    storyRail.scrollLeft = clampScroll(next);

    if (Math.abs(targetScrollLeft - storyRail.scrollLeft) > 0.35) {
      smoothScrollFrame = requestAnimationFrame(runSmoothDrag);
      return;
    }

    storyRail.scrollLeft = clampScroll(targetScrollLeft);
    smoothScrollFrame = null;
  };

  const startSmoothDrag = () => {
    if (smoothScrollFrame) {
      return;
    }

    smoothScrollFrame = requestAnimationFrame(runSmoothDrag);
  };

  const runInertia = () => {
    if (isDragging) {
      inertiaFrame = null;
      return;
    }

    dragVelocity *= 0.92;

    if (Math.abs(dragVelocity) < 0.08) {
      storyRail.style.scrollSnapType = '';
      inertiaFrame = null;
      return;
    }

    const previous = storyRail.scrollLeft;
    const next = clampScroll(previous + dragVelocity);
    storyRail.scrollLeft = next;

    if (next === 0 || next === maxScroll()) {
      dragVelocity = 0;
      storyRail.style.scrollSnapType = '';
      inertiaFrame = null;
      return;
    }

    inertiaFrame = requestAnimationFrame(runInertia);
  };

  const startInertia = () => {
    if (inertiaFrame || Math.abs(dragVelocity) < 0.12) {
      storyRail.style.scrollSnapType = '';
      return;
    }

    inertiaFrame = requestAnimationFrame(runInertia);
  };

  const resetDragState = () => {
    isDragging = false;
    pointerId = null;
    startX = 0;
    startScrollLeft = 0;
    targetScrollLeft = storyRail.scrollLeft;
    if (smoothScrollFrame) {
      cancelAnimationFrame(smoothScrollFrame);
      smoothScrollFrame = null;
    }
    storyRail.style.cursor = 'grab';
    storyRail.style.userSelect = '';
  };

  storyRail.style.cursor = 'grab';

  storyRail.addEventListener('pointerdown', (event) => {
    if (event.button !== 0) {
      return;
    }

    if (event.target.closest('a, button, input, textarea, select, label')) {
      return;
    }

    stopInertia();
    isDragging = true;
    hasDragged = false;
    pointerId = event.pointerId;
    startX = event.clientX;
    startScrollLeft = storyRail.scrollLeft;
    targetScrollLeft = storyRail.scrollLeft;
    lastPointerX = event.clientX;
    lastPointerTime = event.timeStamp;
    dragVelocity = 0;
    storyRail.style.cursor = 'grabbing';
    storyRail.style.userSelect = 'none';
    storyRail.style.scrollSnapType = 'none';
    storyRail.setPointerCapture(event.pointerId);
  });

  storyRail.addEventListener('pointermove', (event) => {
    if (!isDragging || event.pointerId !== pointerId) {
      return;
    }

    const deltaX = event.clientX - startX;
    if (Math.abs(deltaX) > 4) {
      hasDragged = true;
    }

    if (hasDragged) {
      event.preventDefault();
      targetScrollLeft = clampScroll(startScrollLeft - deltaX);
      startSmoothDrag();

      const moveDelta = event.clientX - lastPointerX;
      const elapsed = Math.max(1, event.timeStamp - lastPointerTime);
      dragVelocity = -(moveDelta / elapsed) * 16.67;
      lastPointerX = event.clientX;
      lastPointerTime = event.timeStamp;
    }
  });

  storyRail.addEventListener('pointerup', (event) => {
    if (event.pointerId !== pointerId) {
      return;
    }

    if (storyRail.hasPointerCapture(event.pointerId)) {
      storyRail.releasePointerCapture(event.pointerId);
    }

    const shouldStartInertia = hasDragged;
    resetDragState();
    if (shouldStartInertia) {
      startInertia();
    }
  });

  storyRail.addEventListener('pointercancel', () => {
    dragVelocity = 0;
    resetDragState();
    storyRail.style.scrollSnapType = '';
  });
  storyRail.addEventListener('mouseleave', () => {
    if (!isDragging) {
      storyRail.style.cursor = 'grab';
    }
  });

  storyRail.addEventListener(
    'click',
    (event) => {
      if (!hasDragged) {
        return;
      }

      event.preventDefault();
      event.stopPropagation();
      hasDragged = false;
    },
    true
  );
}

function initStoryPanelReveal(reducedMotion) {
  const storyRail = document.querySelector('.story-panels');
  const storyPanels = Array.from(document.querySelectorAll('.story-panel'));

  if (!storyRail || !storyPanels.length) {
    return;
  }

  storyRail.classList.add('has-story-anim');

  storyPanels.forEach((panel, index) => {
    panel.style.setProperty('--story-panel-delay', `${(index * 0.09).toFixed(2)}s`);
  });

  if (reducedMotion || !('IntersectionObserver' in window)) {
    storyPanels.forEach((panel) => panel.classList.add('is-entered'));
    return;
  }

  let cascadeStarted = false;

  const markEntered = (panel) => {
    if (!panel || panel.classList.contains('is-entered')) {
      return;
    }

    panel.classList.add('is-entered');
    observer.unobserve(panel);
  };

  const markRemainingPanels = (startIndex) => {
    for (let index = startIndex; index < storyPanels.length; index += 1) {
      markEntered(storyPanels[index]);
    }
  };

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting && entry.intersectionRatio >= 0.36) {
          const currentPanel = entry.target;
          markEntered(currentPanel);

          const currentIndex = storyPanels.indexOf(currentPanel);
          const nextIndex = currentIndex + 1;

          if (!cascadeStarted && nextIndex < storyPanels.length) {
            cascadeStarted = true;
            markRemainingPanels(nextIndex);
          }
        }
      });
    },
    {
      root: storyRail,
      threshold: [0.2, 0.36, 0.6],
      rootMargin: '0px'
    }
  );

  storyPanels.forEach((panel) => observer.observe(panel));
}

function initStoryPanelCopyEqualHeight() {
  const copies = Array.from(document.querySelectorAll('.story-panel .panel-copy'));
  if (copies.length < 2) {
    return;
  }

  let framePending = false;

  const applyEqualHeight = () => {
    framePending = false;

    copies.forEach((copy) => {
      copy.style.height = 'auto';
    });

    const tallestHeight = Math.ceil(
      copies.reduce((maxHeight, copy) => Math.max(maxHeight, copy.scrollHeight), 0)
    );

    copies.forEach((copy) => {
      copy.style.height = `${tallestHeight}px`;
    });
  };

  const scheduleApply = () => {
    if (framePending) {
      return;
    }

    framePending = true;
    requestAnimationFrame(applyEqualHeight);
  };

  window.addEventListener('resize', scheduleApply, { passive: true });
  window.addEventListener('orientationchange', scheduleApply, { passive: true });

  if (window.ResizeObserver) {
    const resizeObserver = new ResizeObserver(() => {
      scheduleApply();
    });

    copies.forEach((copy) => resizeObserver.observe(copy));
  }

  if (document.fonts?.ready) {
    document.fonts.ready.then(scheduleApply).catch(() => {});
  }

  scheduleApply();
}

function initStoryScrollHint({ reducedMotion }) {
  const storyHint = document.querySelector('[data-story-scroll-hint]');
  const storyHintButton = document.querySelector('[data-story-scroll-hint-button]');
  const storySection = document.querySelector('.story-section');
  const storyRail = document.querySelector('.story-panels');
  const storyPanels = Array.from(document.querySelectorAll('.story-panels .story-panel'));
  const mobileQuery = window.matchMedia('(max-width: 767px)');

  if (!storyHint || !storyHintButton || !storySection || !storyRail || !storyPanels.length) {
    return;
  }

  let isVisible = false;
  let hasAnimatedIn = false;
  let isDismissed = false;
  let hideTimeoutId = null;

  const dismissHint = () => {
    if (isDismissed) {
      return;
    }

    isDismissed = true;
    hideHint();
  };

  const showHint = () => {
    if (!mobileQuery.matches || isVisible || isDismissed) {
      return;
    }

    if (hideTimeoutId) {
      window.clearTimeout(hideTimeoutId);
      hideTimeoutId = null;
    }

    isVisible = true;
    storyHint.classList.remove('hidden');

    if (reducedMotion || hasAnimatedIn) {
      storyHint.classList.remove('opacity-0', '-translate-x-4');
      storyHint.classList.add('opacity-100', 'translate-x-0');
      hasAnimatedIn = true;
      return;
    }

    storyHint.classList.remove('opacity-100', 'translate-x-0');
    storyHint.classList.add('opacity-0', '-translate-x-4');

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        if (!isVisible) {
          return;
        }

        storyHint.classList.remove('opacity-0', '-translate-x-4');
        storyHint.classList.add('opacity-100', 'translate-x-0');
      });
    });

    hasAnimatedIn = true;
  };

  const hideHint = () => {
    if (!isVisible) {
      return;
    }

    isVisible = false;
    storyHint.classList.remove('opacity-100', 'translate-x-0');
    storyHint.classList.add('opacity-0', '-translate-x-4');

    hideTimeoutId = window.setTimeout(() => {
      if (!isVisible) {
        storyHint.classList.add('hidden');
      }
    }, 260);
  };

  const updateHintVisibility = () => {
    if (!mobileQuery.matches) {
      hideHint();
      return;
    }

    if (isDismissed) {
      hideHint();
      return;
    }

    const hasHorizontalOverflow = storyRail.scrollWidth - storyRail.clientWidth > 8;
    if (!hasHorizontalOverflow) {
      hideHint();
      return;
    }

    const sectionRect = storySection.getBoundingClientRect();
    const isStoryInView = sectionRect.top < window.innerHeight * 0.72 && sectionRect.bottom > window.innerHeight * 0.28;

    if (isStoryInView) {
      showHint();
      return;
    }

    hideHint();
  };

  const goToNextPanel = () => {
    let activeIndex = 0;
    let bestDistance = Number.POSITIVE_INFINITY;
    const viewportCenter = storyRail.scrollLeft + storyRail.clientWidth / 2;

    storyPanels.forEach((panel, index) => {
      const panelCenter = panel.offsetLeft + panel.offsetWidth / 2;
      const distance = Math.abs(panelCenter - viewportCenter);
      if (distance < bestDistance) {
        bestDistance = distance;
        activeIndex = index;
      }
    });

    const nextIndex = Math.min(activeIndex + 1, storyPanels.length - 1);
    const nextPanel = storyPanels[nextIndex];

    if (!nextPanel) {
      return;
    }

    storyRail.scrollTo({
      left: nextPanel.offsetLeft,
      behavior: reducedMotion ? 'auto' : 'smooth'
    });

    dismissHint();
  };

  mobileQuery.addEventListener('change', updateHintVisibility);
  window.addEventListener('scroll', updateHintVisibility, { passive: true });
  window.addEventListener('resize', updateHintVisibility, { passive: true });
  window.addEventListener('orientationchange', updateHintVisibility, { passive: true });
  storyHintButton.addEventListener('click', goToNextPanel);

  storyRail.addEventListener(
    'pointerdown',
    (event) => {
      if (event.pointerType === 'touch') {
        dismissHint();
      }
    },
    { passive: true }
  );

  storyRail.addEventListener('touchstart', dismissHint, { passive: true });
  storyRail.addEventListener(
    'scroll',
    () => {
      if (storyRail.scrollLeft > 6) {
        dismissHint();
      }
    },
    { passive: true }
  );

  updateHintVisibility();
}

function initSplitVisualSync() {
  const steps = document.querySelectorAll('.service-step');
  const visuals = document.querySelectorAll('.visual-item');
  const splitCopy = document.querySelector('.split-copy');
  const splitSection = document.querySelector('.split-section');

  if (!steps.length || !visuals.length) {
    return;
  }

  const lastStep = steps[steps.length - 1];
  let currentVisualId = null;
  const switchLineRatio = 0.5;

  const setActive = (visualId) => {
    if (visualId === currentVisualId) {
      return;
    }

    currentVisualId = visualId;

    steps.forEach((step) => {
      step.classList.toggle('is-active', step.dataset.visual === visualId);
    });

    visuals.forEach((visual) => {
      visual.classList.toggle('is-active', visual.dataset.visual === visualId);
    });
  };

  setActive(steps[0].dataset.visual);

  const sync = () => {
    const triggerLine = window.innerHeight * switchLineRatio;
    let activeIndex = 0;

    steps.forEach((step, index) => {
      const rect = step.getBoundingClientRect();

      // Switch early: once an item reaches the lower 10% trigger zone,
      // it becomes the active visual.
      if (rect.top <= triggerLine) {
        activeIndex = index;
      }
    });

    const clampedIndex = Math.max(0, Math.min(activeIndex, steps.length - 1));

    if (splitSection && splitSection.getBoundingClientRect().bottom < 0) {
      setActive(null);
      return;
    }

    if (lastStep.getBoundingClientRect().bottom < 0) {
      setActive(lastStep.dataset.visual);
      return;
    }

    setActive(steps[clampedIndex].dataset.visual);
  };

  sync();
  window.addEventListener('scroll', sync, { passive: true });
  window.addEventListener('resize', sync, { passive: true });
  splitCopy?.addEventListener('scroll', sync, { passive: true });

  steps.forEach((step) => {
    step.addEventListener('mouseenter', () => setActive(step.dataset.visual));
    step.addEventListener('focusin', () => setActive(step.dataset.visual));
  });
}

function initShowcaseActivation() {
  const items = document.querySelectorAll('.showcase-item');
  if (!items.length) {
    return;
  }

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        entry.target.classList.toggle('is-active', entry.isIntersecting && entry.intersectionRatio >= 0.6);
      });
    },
    {
      threshold: [0.4, 0.6, 0.8]
    }
  );

  items.forEach((item) => observer.observe(item));
}

function initCursorGlow(reducedMotion) {
  const cursor = document.querySelector('.cursor-glow');
  const coarsePointer = window.matchMedia('(pointer: coarse)').matches;

  if (!cursor || reducedMotion || coarsePointer) {
    return;
  }

  const particleLimit = 18;
  const particleSpawnInterval = 36;
  const activeParticles = new Set();

  let currentX = window.innerWidth / 2;
  let currentY = window.innerHeight / 2;
  let targetX = currentX;
  let targetY = currentY;
  let previousX = currentX;
  let previousY = currentY;
  let frameId = null;
  let lastParticleTime = 0;

  const spawnParticle = (x, y, velocityX, velocityY) => {
    const particle = document.createElement('span');
    const size = 6 + Math.random() * 4.5;
    const driftX = (Math.random() - 0.5) * 16 - velocityX * 0.06;
    const driftY = -10 - Math.random() * 14 - Math.min(8, Math.abs(velocityY) * 0.05);

    particle.className = 'cursor-trail-particle cursor-trail-particle--spark';
    particle.style.setProperty('--x', `${x}px`);
    particle.style.setProperty('--y', `${y}px`);
    particle.style.setProperty('--drift-x', `${driftX.toFixed(2)}px`);
    particle.style.setProperty('--drift-y', `${driftY.toFixed(2)}px`);
    particle.style.setProperty('--particle-size', `${size.toFixed(2)}px`);
    particle.style.setProperty('--particle-duration', `${(760 + Math.random() * 420).toFixed(0)}ms`);
    particle.style.setProperty('--twinkle-rotate', `${(Math.random() * 70 - 35).toFixed(2)}deg`);

    document.body.appendChild(particle);
    activeParticles.add(particle);

    particle.addEventListener(
      'animationend',
      () => {
        activeParticles.delete(particle);
        particle.remove();
      },
      { once: true }
    );

    if (activeParticles.size > particleLimit) {
      const oldestParticle = activeParticles.values().next().value;
      if (oldestParticle) {
        activeParticles.delete(oldestParticle);
        oldestParticle.remove();
      }
    }
  };

  const render = () => {
    currentX += (targetX - currentX) * 0.16;
    currentY += (targetY - currentY) * 0.16;

    const deltaX = currentX - previousX;
    const deltaY = currentY - previousY;
    const distance = Math.hypot(targetX - currentX, targetY - currentY);
    const rotation = Math.atan2(deltaY, deltaX) * (180 / Math.PI);

    cursor.style.opacity = '1';
    cursor.style.setProperty('--cursor-rotation', `${rotation.toFixed(2)}deg`);
    cursor.style.setProperty('--cursor-scale', `${(1 + Math.min(0.05, distance / 520)).toFixed(3)}`);
    cursor.style.transform = `translate3d(${currentX}px, ${currentY}px, 0) translate3d(-50%, -50%, 0) scale(var(--cursor-scale))`;

    previousX = currentX;
    previousY = currentY;

    if (distance > 0.18) {
      frameId = requestAnimationFrame(render);
      return;
    }

    frameId = null;
  };

  window.addEventListener('pointermove', (event) => {
    const velocityX = event.clientX - targetX;
    const velocityY = event.clientY - targetY;
    const movement = Math.abs(velocityX) + Math.abs(velocityY);
    const now = performance.now();

    targetX = event.clientX;
    targetY = event.clientY;

    if (movement > 2.5 && now - lastParticleTime >= particleSpawnInterval) {
      spawnParticle(event.clientX - velocityX * 0.18, event.clientY - velocityY * 0.18, velocityX, velocityY);

      if (movement > 26) {
        spawnParticle(
          event.clientX + (Math.random() - 0.5) * 5,
          event.clientY + (Math.random() - 0.5) * 5,
          velocityX * 0.6,
          velocityY * 0.6
        );
      }

      lastParticleTime = now;
    }

    if (!frameId) {
      frameId = requestAnimationFrame(render);
    }
  });

  window.addEventListener('pointerleave', () => {
    cursor.style.opacity = '0';
    cursor.style.setProperty('--cursor-scale', '1');
  });
}

function initScrollIndicatorMotion({ reducedMotion }) {
  const indicator = document.querySelector('[data-scroll-indicator]');
  const heroSection = document.querySelector('.hero-scene');
  const bookingWidget = document.querySelector('[data-booking-fab]');
  const indicatorLabel = indicator?.querySelector('p');
  const indicatorIcon = indicator?.querySelector('svg');

  if (!indicator || !heroSection) {
    return;
  }

  indicator.style.willChange = 'transform, opacity';

  let widgetVisible = false;
  const widgetShowThreshold = 200;
  const widgetHideThreshold = 225;

  const applyWidgetVisibility = (targetWidget, isVisible) => {
    targetWidget.style.setProperty('opacity', isVisible ? '1' : '0', 'important');
    targetWidget.style.setProperty('pointer-events', isVisible ? 'auto' : 'none', 'important');
    targetWidget.style.setProperty('transform', isVisible ? 'translate3d(0, 0, 0)' : 'translate3d(22px, 0, 0)', 'important');
  };

  const initializeWidget = (targetWidget) => {
    if (!targetWidget || targetWidget.dataset.gbtWidgetInitialized) {
      return;
    }

    applyWidgetVisibility(targetWidget, widgetVisible);
    targetWidget.style.setProperty(
      'transition',
      'transform 0.72s cubic-bezier(0.22, 1, 0.36, 1), opacity 0.72s cubic-bezier(0.22, 1, 0.36, 1), box-shadow 0.2s linear',
      'important'
    );
    targetWidget.dataset.gbtWidgetInitialized = 'true';
  };

  if (bookingWidget) {
    initializeWidget(bookingWidget);
  }

  if (reducedMotion) {
    if (bookingWidget) {
      applyWidgetVisibility(bookingWidget, true);
    }

    indicator.style.transform = 'translate3d(0, 0, 0)';
    if (indicatorLabel) {
      indicatorLabel.style.transform = 'translate3d(0, 0, 0)';
      indicatorLabel.style.opacity = '';
    }

    if (indicatorIcon) {
      indicatorIcon.style.transform = 'translate3d(0, 0, 0)';
      indicatorIcon.style.opacity = '';
    }
    return;
  }

  let framePending = false;
  let loopFrameId = null;
  const loopActiveMs = 1400;
  const loopPauseMs = 3000;
  const loopCycleMs = loopActiveMs + loopPauseMs;

  if (indicatorLabel) {
    indicatorLabel.style.transform = 'translate3d(0, 0, 0)';
    indicatorLabel.style.opacity = '';
  }

  const animateLoop = (time) => {
    const loopTime = time % loopCycleMs;
    let iconY = 0;
    let iconScale = 1;

    if (loopTime <= loopActiveMs) {
      const activeProgress = loopTime / loopActiveMs;
      if (activeProgress <= 0.35) {
        const riseProgress = activeProgress / 0.35;
        iconY = -3.2 * riseProgress;
        iconScale = 1 + 0.02 * riseProgress;
      } else {
        const returnProgress = (activeProgress - 0.35) / 0.65;
        iconY = -3.2 * (1 - returnProgress);
        iconScale = 1.02 - 0.02 * returnProgress;
      }
    }

    if (indicatorIcon) {
      indicatorIcon.style.transform = `translate3d(0, ${iconY.toFixed(2)}px, 0) scale(${iconScale.toFixed(4)})`;
      indicatorIcon.style.opacity = '';
    }

    loopFrameId = requestAnimationFrame(animateLoop);
  };

  const update = () => {
    framePending = false;

    const heroRect = heroSection.getBoundingClientRect();
    const heroTravel = Math.max(1, heroRect.height * 0.9);
    const heroProgress = Math.max(0, Math.min(1, -heroRect.top / heroTravel));
    const fadeStart = 50;
    const fadeEnd = 290;
    const fadeProgress = Math.max(0, Math.min(1, (window.scrollY - fadeStart) / (fadeEnd - fadeStart)));
    const opacity = 1 - fadeProgress;
    const fadeLiftOffset = fadeProgress * 28;
    const offsetY = heroProgress * 24 - fadeLiftOffset;

    indicator.style.transform = `translate3d(0, ${offsetY.toFixed(2)}px, 0)`;
    indicator.style.opacity = opacity.toFixed(3);

    if (bookingWidget) {
      const shouldShowWidget = widgetVisible
        ? window.scrollY > widgetHideThreshold
        : window.scrollY > widgetShowThreshold;

      if (shouldShowWidget !== widgetVisible) {
        widgetVisible = shouldShowWidget;
        applyWidgetVisibility(bookingWidget, widgetVisible);
      }
    }
  };

  const scheduleUpdate = () => {
    if (framePending) {
      return;
    }

    framePending = true;
    requestAnimationFrame(update);
  };

  window.addEventListener('scroll', scheduleUpdate, { passive: true });
  window.addEventListener('resize', scheduleUpdate, { passive: true });
  window.addEventListener('orientationchange', scheduleUpdate, { passive: true });

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      if (loopFrameId) {
        cancelAnimationFrame(loopFrameId);
        loopFrameId = null;
      }
      return;
    }

    if (!loopFrameId) {
      loopFrameId = requestAnimationFrame(animateLoop);
    }
  });

  scheduleUpdate();
  loopFrameId = requestAnimationFrame(animateLoop);
}

function initReducedMotion() {
  document.documentElement.classList.add('reduced-motion');
  document.body.classList.add('is-ready');

  document.querySelectorAll('.panel-section').forEach((panel) => {
    panel.classList.add('is-visible');
  });

  document.querySelectorAll('.reveal-on-scroll').forEach((element) => {
    element.classList.add('is-revealed');
  });

  document.querySelectorAll('.story-panel').forEach((panel) => {
    panel.classList.add('is-entered');
  });

  document.querySelectorAll('.visual-item').forEach((visual, index) => {
    visual.classList.toggle('is-active', index === 0);
  });
}
