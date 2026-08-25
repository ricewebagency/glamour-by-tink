document.addEventListener('DOMContentLoaded', () => {
  initAcademyInquiryLink();
  initAcademyCarousel();
  initCursorGlow();
  initRevealObserver();
  initFaqAccordion();
});

function initAcademyInquiryLink() {
  const academyLinks = document.querySelectorAll('[data-academy-contact]');
  if (!academyLinks.length) {
    return;
  }

  const whatsappNumber = '31623262640';
  const whatsappMessage = encodeURIComponent('Hey Marissa, ik zou graag meer willen weten over de Powder Brows Academy. Kun je me meer informatie sturen? Bedankt alvast!');
  const mailtoAddress = 'glamourbytink@gmail.com';
  const mailtoSubject = encodeURIComponent('Academie - informatie aanvraag');
  const mailtoBody = encodeURIComponent('Hey Marissa,\n\nIk zou graag meer willen weten over de Powder Brows Academy.\n\nZou je mij meer informatie toe willen sturen? Bedankt alvast!\n\nMet vriendelijke groet,\n');
  const useWhatsApp = window.matchMedia('(max-width: 767px)').matches || window.matchMedia('(pointer: coarse)').matches;

  academyLinks.forEach((link) => {
    const href = useWhatsApp
      ? `https://wa.me/${whatsappNumber}?text=${whatsappMessage}`
      : `mailto:${mailtoAddress}?subject=${mailtoSubject}&body=${mailtoBody}`;

    link.setAttribute('href', href);
    link.setAttribute('aria-label', useWhatsApp ? 'Vraag via WhatsApp' : 'Stuur een e-mail');
  });
}

function initAcademyCarousel() {
  const carousel = document.querySelector('[data-academy-carousel]');
  if (!carousel) {
    return;
  }

  const slides = Array.from(carousel.querySelectorAll('[data-carousel-slide]'));
  if (slides.length < 2) {
    return;
  }

  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const intervalDelay = Number.parseInt(carousel.dataset.interval ?? '4000', 10);
  const rotationDelay = Number.isFinite(intervalDelay) && intervalDelay > 0 ? intervalDelay : 4000;
  let activeIndex = slides.findIndex((slide) => slide.classList.contains('opacity-100'));
  let intervalId = null;

  if (activeIndex < 0) {
    activeIndex = 0;
  }

  const setActiveSlide = (nextIndex) => {
    slides.forEach((slide, index) => {
      const isActive = index === nextIndex;
      slide.classList.toggle('opacity-100', isActive);
      slide.classList.toggle('opacity-0', !isActive);
      slide.classList.toggle('z-10', isActive);
      slide.classList.toggle('z-0', !isActive);
    });
  };

  const stopRotation = () => {
    if (intervalId === null) {
      return;
    }

    window.clearInterval(intervalId);
    intervalId = null;
  };

  const advanceSlide = () => {
    activeIndex = (activeIndex + 1) % slides.length;
    setActiveSlide(activeIndex);
  };

  const startRotation = () => {
    if (intervalId !== null || document.hidden) {
      return;
    }

    intervalId = window.setInterval(advanceSlide, rotationDelay);
  };

  setActiveSlide(activeIndex);

  if (reducedMotion) {
    return;
  }

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      stopRotation();
      return;
    }

    startRotation();
  });

  carousel.addEventListener('mouseenter', stopRotation);
  carousel.addEventListener('mouseleave', startRotation);

  startRotation();
}

function initRevealObserver() {
  const elements = Array.from(document.querySelectorAll('.treatments-reveal'));
  if (!elements.length) {
    return;
  }

  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reducedMotion) {
    elements.forEach((element) => element.classList.add('is-visible'));
    return;
  }

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) {
          return;
        }

        entry.target.classList.add('is-visible');
        observer.unobserve(entry.target);
      });
    },
    {
      threshold: 0.16,
      rootMargin: '0px 0px -10% 0px'
    }
  );

  elements.forEach((element) => observer.observe(element));
}

function initFaqAccordion() {
  const faqList = document.querySelector('[data-faq-list]');
  if (!faqList) {
    return;
  }

  const triggers = Array.from(faqList.querySelectorAll('.faq-trigger'));
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const expandPanel = (panel) => {
    if (panel.hidden) {
      panel.hidden = false;
    }

    if (reducedMotion) {
      panel.style.removeProperty('height');
      panel.style.removeProperty('opacity');
      panel.style.removeProperty('overflow');
      panel.style.removeProperty('transition');
      return;
    }

    panel.style.overflow = 'hidden';
    panel.style.height = '0px';
    panel.style.opacity = '0';
    panel.style.transition = 'height 260ms ease, opacity 220ms ease';

    panel.offsetHeight;

    panel.style.height = `${panel.scrollHeight}px`;
    panel.style.opacity = '1';

    const onExpandEnd = (event) => {
      if (event.propertyName !== 'height') {
        return;
      }

      panel.style.removeProperty('height');
      panel.style.removeProperty('overflow');
      panel.style.removeProperty('transition');
      panel.style.removeProperty('opacity');
    };

    panel.addEventListener('transitionend', onExpandEnd, { once: true });
  };

  const collapsePanel = (panel) => {
    if (panel.hidden) {
      return;
    }

    if (reducedMotion) {
      panel.hidden = true;
      panel.style.removeProperty('height');
      panel.style.removeProperty('opacity');
      panel.style.removeProperty('overflow');
      panel.style.removeProperty('transition');
      return;
    }

    panel.style.overflow = 'hidden';
    panel.style.height = `${panel.scrollHeight}px`;
    panel.style.opacity = '1';
    panel.style.transition = 'height 220ms ease, opacity 180ms ease';

    panel.offsetHeight;

    panel.style.height = '0px';
    panel.style.opacity = '0';

    const onCollapseEnd = (event) => {
      if (event.propertyName !== 'height') {
        return;
      }

      panel.hidden = true;
      panel.style.removeProperty('height');
      panel.style.removeProperty('opacity');
      panel.style.removeProperty('overflow');
      panel.style.removeProperty('transition');
    };

    panel.addEventListener('transitionend', onCollapseEnd, { once: true });
  };

  triggers.forEach((trigger) => {
    trigger.addEventListener('click', () => {
      const isExpanded = trigger.getAttribute('aria-expanded') === 'true';
      const panelId = trigger.getAttribute('aria-controls');
      const panel = panelId ? document.getElementById(panelId) : null;
      if (!panel) {
        return;
      }

      triggers.forEach((otherTrigger) => {
        if (otherTrigger === trigger) {
          return;
        }

        otherTrigger.setAttribute('aria-expanded', 'false');
        const otherPanelId = otherTrigger.getAttribute('aria-controls');
        const otherPanel = otherPanelId ? document.getElementById(otherPanelId) : null;
        if (otherPanel) {
          collapsePanel(otherPanel);
        }
      });

      if (isExpanded) {
        trigger.setAttribute('aria-expanded', 'false');
        collapsePanel(panel);
        return;
      }

      trigger.setAttribute('aria-expanded', 'true');
      expandPanel(panel);
    });
  });
}

function initCursorGlow() {
  const cursor = document.querySelector('.cursor-glow');
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
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
