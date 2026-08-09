(() => {
  'use strict';

  /* ---------------------------------------------------------
     Environment checks
  --------------------------------------------------------- */
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const isFinePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  const isNarrow = () => window.innerWidth <= 860;

  const $ = (sel, ctx = document) => ctx.querySelector(sel);
  const $$ = (sel, ctx = document) => Array.from(ctx.querySelectorAll(sel));

  const rafThrottle = (fn) => {
    let ticking = false;
    return (...args) => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => { fn(...args); ticking = false; });
    };
  };

  /* ---------------------------------------------------------
     Navbar: background on scroll + mobile menu
  --------------------------------------------------------- */
  const navbar = $('#navbar');
  const menuToggle = $('#menuToggle');
  const navLinks = $('#navLinks');
  const mobileNavOverlay = $('#mobileNavOverlay');

  function setNavScrolled() {
    if (!navbar) return;
    navbar.classList.toggle('scrolled', window.scrollY > 12);
  }
  setNavScrolled();

  function updateMobileMenu(isActive) {
    if (!menuToggle || !navLinks) return;
    menuToggle.classList.toggle('active', isActive);
    navLinks.classList.toggle('active', isActive);
    if (mobileNavOverlay) mobileNavOverlay.classList.toggle('is-visible', isActive);
    menuToggle.setAttribute('aria-expanded', String(isActive));
    document.body.style.overflow = isActive ? 'hidden' : '';
  }

  function closeMobileMenu() {
    updateMobileMenu(false);
  }

  if (menuToggle && navLinks) {
    menuToggle.addEventListener('click', () => {
      const isActive = !menuToggle.classList.contains('active');
      updateMobileMenu(isActive);
    });

    if (mobileNavOverlay) {
      mobileNavOverlay.addEventListener('click', closeMobileMenu);
    }

    navLinks.addEventListener('click', (event) => {
      event.stopPropagation();
    });

    let touchStartX = 0;
    let touchStartY = 0;

    navLinks.addEventListener('touchstart', (event) => {
      const touch = event.changedTouches[0];
      touchStartX = touch.clientX;
      touchStartY = touch.clientY;
    }, { passive: true });

    navLinks.addEventListener('touchend', (event) => {
      const touch = event.changedTouches[0];
      const deltaX = touch.clientX - touchStartX;
      const deltaY = touch.clientY - touchStartY;
      if (deltaX > 50 && Math.abs(deltaY) < 60 && navLinks.classList.contains('active')) {
        closeMobileMenu();
      }
    });

    $$('a', navLinks).forEach((link) => link.addEventListener('click', closeMobileMenu));

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') closeMobileMenu();
    });

    window.addEventListener('resize', rafThrottle(() => {
      if (!isNarrow()) closeMobileMenu();
    }));
  }

  /* ---------------------------------------------------------
     Section tracking: nav active state + pipeline rail nodes
  --------------------------------------------------------- */
  const sectionIds = ['home', 'about', 'skills', 'projects', 'experience', 'contact'];
  const railIds = ['about', 'skills', 'projects', 'experience', 'contact'];
  const sections = sectionIds
    .map((id) => document.getElementById(id))
    .filter(Boolean);

  const navAnchors = $$('[data-nav]');
  const railNodes = $$('.rail-node');

  let currentSectionId = 'home';

  function updateActiveStates(id) {
    currentSectionId = id;

    navAnchors.forEach((a) => {
      const target = a.getAttribute('href').replace('#', '');
      a.classList.toggle('active', target === id);
    });

    const activeRailIndex = railIds.indexOf(id);
    railNodes.forEach((node) => {
      const forId = node.getAttribute('data-rail-for');
      const idx = railIds.indexOf(forId);
      node.classList.remove('is-active', 'is-done');
      if (idx === -1) return;
      if (idx === activeRailIndex) node.classList.add('is-active');
      else if (activeRailIndex > idx) node.classList.add('is-done');
    });
  }

  if ('IntersectionObserver' in window && sections.length) {
    const sectionObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) updateActiveStates(entry.target.id);
        });
      },
      { rootMargin: '-40% 0px -40% 0px', threshold: 0 }
    );
    sections.forEach((s) => sectionObserver.observe(s));
  }

  /* ---------------------------------------------------------
     Pipeline rail fill + mobile progress bar (continuous)
  --------------------------------------------------------- */
  const railFill = $('#railFill');
  const mobileProgressFill = $('#mobileProgressFill');
  const aboutEl = document.getElementById('about');
  const contactEl = document.getElementById('contact');

  let pipelineStart = 0;
  let pipelineEnd = 1;

  function cachePipelineBounds() {
    if (!aboutEl || !contactEl) return;
    pipelineStart = aboutEl.offsetTop;
    pipelineEnd = contactEl.offsetTop + contactEl.offsetHeight;
  }
  cachePipelineBounds();

  function updateRailFill() {
    if (!aboutEl || !contactEl) return;
    const viewCenter = window.scrollY + window.innerHeight * 0.5;
    let progress = (viewCenter - pipelineStart) / (pipelineEnd - pipelineStart);
    progress = Math.max(0, Math.min(1, progress));
    const pct = (progress * 100).toFixed(1) + '%';
    if (railFill) railFill.style.height = pct;
    if (mobileProgressFill) mobileProgressFill.style.width = pct;
  }

  const onScroll = rafThrottle(() => {
    setNavScrolled();
    updateRailFill();
  });
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', rafThrottle(() => {
    cachePipelineBounds();
    updateRailFill();
  }));
  updateRailFill();

  /* ---------------------------------------------------------
     Scroll reveal
  --------------------------------------------------------- */
  const revealEls = $$('.reveal, .reveal-stagger');
  if ('IntersectionObserver' in window && revealEls.length) {
    const revealObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible');
            revealObserver.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12, rootMargin: '0px 0px -60px 0px' }
    );
    revealEls.forEach((el) => revealObserver.observe(el));
  } else {
    revealEls.forEach((el) => el.classList.add('is-visible'));
  }

  /* ---------------------------------------------------------
     Hero stat count-up
  --------------------------------------------------------- */
  const heroStats = $('#heroStats');
  function animateCount(el) {
    const target = parseFloat(el.getAttribute('data-count'));
    const decimals = parseInt(el.getAttribute('data-decimals') || '0', 10);
    if (reducedMotion || isNaN(target)) {
      el.textContent = target.toFixed(decimals);
      return;
    }
    const duration = 1100;
    const start = performance.now();
    function tick(now) {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3); // ease-out-cubic
      el.textContent = (target * eased).toFixed(decimals);
      if (t < 1) requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  }

  if (heroStats) {
    const countTargets = $$('[data-count]', heroStats);
    if ('IntersectionObserver' in window) {
      const statObserver = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              countTargets.forEach(animateCount);
              statObserver.disconnect();
            }
          });
        },
        { threshold: 0.4 }
      );
      statObserver.observe(heroStats);
    } else {
      countTargets.forEach(animateCount);
    }
  }

  /* ---------------------------------------------------------
     Hero console typewriter
  --------------------------------------------------------- */
  function typeConsole() {
    const lines = $$('.console-line');
    if (!lines.length) return;

    if (reducedMotion) {
      lines.forEach((line) => {
        line.classList.add('shown');
        const typed = $('.console-typed', line);
        const out = $('.console-output', line);
        if (typed) { typed.textContent = typed.getAttribute('data-text') || ''; typed.classList.add('done'); }
        if (out) { out.innerHTML = out.getAttribute('data-out') || ''; out.style.display = 'block'; }
      });
      return;
    }

    let lineIndex = 0;

    function typeLine() {
      if (lineIndex >= lines.length) return;
      const line = lines[lineIndex];
      line.classList.add('shown');
      const typed = $('.console-typed', line);
      const out = $('.console-output', line);
      const text = typed ? (typed.getAttribute('data-text') || '') : '';
      let charIndex = 0;

      if (out) out.style.display = 'none';

      function typeChar() {
        if (!typed) { finishLine(); return; }
        if (charIndex <= text.length) {
          typed.textContent = text.slice(0, charIndex);
          charIndex++;
          setTimeout(typeChar, 26 + Math.random() * 22);
        } else {
          finishLine();
        }
      }

      function finishLine() {
        if (typed) typed.classList.add('done');
        setTimeout(() => {
          if (out) {
            out.innerHTML = out.getAttribute('data-out') || '';
            out.style.display = 'block';
          }
          lineIndex++;
          setTimeout(typeLine, 220);
        }, 120);
      }

      typeChar();
    }

    typeLine();
  }
  typeConsole();

  /* ---------------------------------------------------------
     Skills tabs
  --------------------------------------------------------- */
  const tabList = $('#tabList');
  const tabButtons = $$('.tab-btn', tabList);
  const tabPanels = $$('.tab-panel');
  const skillWindowTitle = $('#skillWindowTitle');
  const tabFileNames = {
    cloud: 'cat skills/cloud.yaml',
    containers: 'cat skills/containers.yaml',
    cicd: 'cat skills/cicd.yaml',
    security: 'cat skills/security.yaml',
    monitoring: 'cat skills/monitoring.yaml',
    data: 'cat skills/tools.yaml',
  };

  function activateTab(name, { focus = false } = {}) {
    tabButtons.forEach((btn) => {
      const match = btn.getAttribute('data-tab') === name;
      btn.setAttribute('aria-selected', String(match));
      btn.tabIndex = match ? 0 : -1;
      if (match && focus) btn.focus();
    });
    tabPanels.forEach((panel) => {
      panel.classList.toggle('is-active', panel.getAttribute('data-panel') === name);
    });
    if (skillWindowTitle && tabFileNames[name]) skillWindowTitle.textContent = tabFileNames[name];
  }

  if (tabButtons.length) {
    tabButtons.forEach((btn, i) => {
      btn.addEventListener('click', () => activateTab(btn.getAttribute('data-tab')));
      btn.addEventListener('keydown', (e) => {
        let next = null;
        if (e.key === 'ArrowRight') next = tabButtons[(i + 1) % tabButtons.length];
        if (e.key === 'ArrowLeft') next = tabButtons[(i - 1 + tabButtons.length) % tabButtons.length];
        if (next) { e.preventDefault(); activateTab(next.getAttribute('data-tab'), { focus: true }); }
      });
    });
  }

  /* ---------------------------------------------------------
     Copy to clipboard + toast
  --------------------------------------------------------- */
  const toast = $('#toast');
  let toastTimer = null;
  function showToast(message) {
    if (!toast) return;
    toast.textContent = message;
    toast.classList.add('is-visible');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove('is-visible'), 1900);
  }

  $$('.copy-btn').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const value = btn.getAttribute('data-copy') || '';
      try {
        if (navigator.clipboard && navigator.clipboard.writeText) {
          await navigator.clipboard.writeText(value);
        } else {
          const ta = document.createElement('textarea');
          ta.value = value;
          ta.style.position = 'fixed';
          ta.style.opacity = '0';
          document.body.appendChild(ta);
          ta.select();
          document.execCommand('copy');
          document.body.removeChild(ta);
        }
        showToast('$ copied to clipboard');
      } catch (err) {
        showToast('$ copy failed — select manually');
      }
    });
  });

  /* ---------------------------------------------------------
     Footer session uptime counter
  --------------------------------------------------------- */
  const uptimeVal = $('#uptimeVal');
  if (uptimeVal) {
    const startTime = Date.now();
    function pad(n) { return String(n).padStart(2, '0'); }
    function tickUptime() {
      const elapsed = Math.floor((Date.now() - startTime) / 1000);
      const h = Math.floor(elapsed / 3600);
      const m = Math.floor((elapsed % 3600) / 60);
      const s = elapsed % 60;
      uptimeVal.textContent = `${pad(h)}:${pad(m)}:${pad(s)}`;
    }
    tickUptime();
    setInterval(tickUptime, 1000);
  }

  /* ---------------------------------------------------------
     Custom cursor + magnetic buttons + card tilt
     (desktop / fine-pointer only, respects reduced motion)
  --------------------------------------------------------- */
  if (isFinePointer && !reducedMotion && !isNarrow()) {
    document.body.classList.add('has-custom-cursor');
    const cursorDot = $('#cursorDot');
    const cursorRing = $('#cursorRing');

    let mouseX = window.innerWidth / 2;
    let mouseY = window.innerHeight / 2;
    let ringX = mouseX;
    let ringY = mouseY;

    window.addEventListener('mousemove', (e) => {
      mouseX = e.clientX;
      mouseY = e.clientY;
      if (cursorDot) {
        cursorDot.style.transform = `translate3d(${mouseX}px, ${mouseY}px, 0) translate(-50%, -50%)`;
      }
    }, { passive: true });

    function animateRing() {
      ringX += (mouseX - ringX) * 0.18;
      ringY += (mouseY - ringY) * 0.18;
      if (cursorRing) {
        cursorRing.style.transform = `translate3d(${ringX}px, ${ringY}px, 0) translate(-50%, -50%)`;
      }
      requestAnimationFrame(animateRing);
    }
    requestAnimationFrame(animateRing);

    const hoverTargets = 'a, button, .chip, .tab-btn, .project-card, .commit-card, .contact-row';
    document.addEventListener('mouseover', (e) => {
      if (e.target.closest(hoverTargets) && cursorRing) cursorRing.classList.add('is-hover');
    });
    document.addEventListener('mouseout', (e) => {
      if (e.target.closest(hoverTargets) && cursorRing) cursorRing.classList.remove('is-hover');
    });

    // Magnetic buttons
    $$('.btn, .social-icon').forEach((el) => {
      el.addEventListener('mousemove', (e) => {
        const rect = el.getBoundingClientRect();
        const relX = e.clientX - rect.left - rect.width / 2;
        const relY = e.clientY - rect.top - rect.height / 2;
        el.style.transform = `translate(${relX * 0.18}px, ${relY * 0.28}px)`;
      });
      el.addEventListener('mouseleave', () => { el.style.transform = ''; });
    });

    // Project card tilt
    $$('.project-card').forEach((card) => {
      card.addEventListener('mousemove', (e) => {
        const rect = card.getBoundingClientRect();
        const px = (e.clientX - rect.left) / rect.width - 0.5;
        const py = (e.clientY - rect.top) / rect.height - 0.5;
        card.style.transform = `perspective(900px) rotateX(${(-py * 5).toFixed(2)}deg) rotateY(${(px * 6).toFixed(2)}deg) translateY(-2px)`;
      });
      card.addEventListener('mouseleave', () => { card.style.transform = ''; });
    });
  }

  /* ---------------------------------------------------------
     Hero network canvas
  --------------------------------------------------------- */
  const canvas = $('#net-canvas');
  if (canvas && canvas.getContext) {
    const ctx = canvas.getContext('2d');
    const heroSection = $('#home');
    let width = 0, height = 0, dpr = Math.min(window.devicePixelRatio || 1, 2);
    let particles = [];
    let animId = null;
    let running = false;
    let heroVisible = true;

    const accent = 'rgba(255, 138, 61,';
    const accent2 = 'rgba(94, 200, 255,';

    function particleCount() {
      const area = width * height;
      const base = Math.floor(area / 22000);
      const cap = window.innerWidth <= 640 ? 22 : 55;
      return Math.max(14, Math.min(cap, base));
    }

    function resize() {
      const rect = canvas.parentElement.getBoundingClientRect();
      width = rect.width;
      height = rect.height;
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      canvas.style.width = width + 'px';
      canvas.style.height = height + 'px';
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      seedParticles();
    }

    function seedParticles() {
      const count = particleCount();
      particles = new Array(count).fill(0).map(() => ({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 0.28,
        vy: (Math.random() - 0.5) * 0.28,
        r: Math.random() * 1.6 + 0.8,
        c: Math.random() > 0.72 ? accent2 : accent,
      }));
    }

    function step() {
      if (!running) return;
      ctx.clearRect(0, 0, width, height);

      particles.forEach((p) => {
        p.x += p.vx;
        p.y += p.vy;
        if (p.x < 0 || p.x > width) p.vx *= -1;
        if (p.y < 0 || p.y > height) p.vy *= -1;
      });

      const linkDist = Math.min(150, width / 5);
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const a = particles[i], b = particles[j];
          const dx = a.x - b.x, dy = a.y - b.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < linkDist) {
            const alpha = (1 - dist / linkDist) * 0.16;
            ctx.strokeStyle = `rgba(232, 235, 242, ${alpha})`;
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(b.x, b.y);
            ctx.stroke();
          }
        }
      }

      particles.forEach((p) => {
        ctx.beginPath();
        ctx.fillStyle = `${p.c} 0.85)`;
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fill();
      });

      animId = requestAnimationFrame(step);
    }

    function start() {
      if (running || reducedMotion) return;
      running = true;
      animId = requestAnimationFrame(step);
    }
    function stop() {
      running = false;
      if (animId) cancelAnimationFrame(animId);
    }

    resize();
    if (!reducedMotion) start(); else {
      // draw a single static frame for texture, then stop
      seedParticles();
      ctx.clearRect(0, 0, width, height);
      particles.forEach((p) => {
        ctx.beginPath();
        ctx.fillStyle = `${p.c} 0.5)`;
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fill();
      });
    }

    let resizeTimer = null;
    window.addEventListener('resize', () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(resize, 180);
    });

    document.addEventListener('visibilitychange', () => {
      if (document.hidden) stop();
      else if (heroVisible && !reducedMotion) start();
    });

    if ('IntersectionObserver' in window && heroSection) {
      const heroObserver = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            heroVisible = entry.isIntersecting;
            if (heroVisible && !document.hidden) start();
            else stop();
          });
        },
        { threshold: 0.05 }
      );
      heroObserver.observe(heroSection);
    }
  }

  /* ---------------------------------------------------------
     Reveal body once everything is wired up (avoids flash)
  --------------------------------------------------------- */
  document.body.style.opacity = '1';
})();