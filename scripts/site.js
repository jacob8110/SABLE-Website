(function () {
      if (document.getElementById('global-ambient-light')) return;

      var layer = document.createElement('div');
      layer.id = 'global-ambient-light';
      layer.setAttribute('aria-hidden', 'true');
      var spot = document.createElement('div');
      spot.className = 'global-ambient-spot';
      layer.appendChild(spot);
      document.body.appendChild(layer);

      var reducedMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      var finePointer = window.matchMedia && window.matchMedia('(hover: hover) and (pointer: fine)').matches;
      if (reducedMotion || !finePointer) return;

      var x = window.innerWidth * 0.5;
      var y = window.innerHeight * 0.38;
      var targetX = x;
      var targetY = y;
      var frame = 0;

      function draw() {
        frame = 0;
        x += (targetX - x) * 0.12;
        y += (targetY - y) * 0.12;
        spot.style.transform = 'translate3d(' + x.toFixed(1) + 'px, ' + y.toFixed(1) + 'px, 0) translate(-50%, -50%)';
        if (Math.abs(targetX - x) > 0.35 || Math.abs(targetY - y) > 0.35) {
          frame = window.requestAnimationFrame(draw);
        }
      }

      window.addEventListener('pointermove', function (event) {
        targetX = event.clientX;
        targetY = event.clientY;
        if (!frame) frame = window.requestAnimationFrame(draw);
      }, { passive: true });
    })();

(() => {
  const section = document.querySelector("#shop");
  const track = section?.querySelector("[data-shop-track]");
  const dotsWrap = section?.querySelector("[data-shop-dots]");
  if (!section || !track || !dotsWrap || track.dataset.loopReady) return;
  track.dataset.loopReady = "true";

  const originalCards = Array.from(track.children);
  const count = originalCards.length;
  if (!count) return;

  const makeClones = () => originalCards.map(card => {
    const clone = card.cloneNode(true);
    clone.setAttribute("aria-hidden", "true");
    return clone;
  });
  const before = document.createDocumentFragment();
  makeClones().forEach(card => before.appendChild(card));
  track.insertBefore(before, track.firstChild);
  makeClones().forEach(card => track.appendChild(card));

  for (let i = 0; i < count; i++) {
    const dot = document.createElement("button");
    dot.type = "button";
    dot.className = "sable-shop-dot";
    dot.setAttribute("aria-label", `Show fragrance ${i + 1}`);
    dot.setAttribute("aria-pressed", "false");
    dot.addEventListener("click", () => moveTo(count + i));
    dotsWrap.appendChild(dot);
  }

  const dots = Array.from(dotsWrap.children);
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  let index = count;
  let locked = false;
  let finishTimer;
  let inView = false;
  let autoplayTimer = 0;
  let pointerPaused = false;
  let focusPaused = false;

  function setPosition(animate) {
    const first = track.children[0];
    if (!first) return;
    const gap = parseFloat(getComputedStyle(track).gap) || 0;
    const stride = first.getBoundingClientRect().width + gap;
    track.style.transition = animate && !reduceMotion
      ? "transform 650ms cubic-bezier(.2,.65,.25,1)"
      : "none";
    track.style.transform = `translate3d(${-index * stride}px, 0, 0)`;
    const active = ((index - count) % count + count) % count;
    dots.forEach((dot, i) => dot.setAttribute("aria-pressed", String(i === active)));
  }

  function settleLoop() {
    if (index >= count * 2) {
      index = count;
      setPosition(false);
    } else if (index < count) {
      index = count * 2 - 1;
      setPosition(false);
    }
    locked = false;
  }

  function moveTo(target) {
    if (locked) return;
    locked = true;
    index = target;
    setPosition(true);
    window.clearTimeout(finishTimer);
    finishTimer = window.setTimeout(settleLoop, reduceMotion ? 20 : 720);
  }

  section.querySelector("[data-shop-prev]").addEventListener("click", () => moveTo(index - 1));
  section.querySelector("[data-shop-next]").addEventListener("click", () => moveTo(index + 1));
  track.addEventListener("transitionend", event => {
    if (event.propertyName !== "transform") return;
    window.clearTimeout(finishTimer);
    settleLoop();
  });
  section.addEventListener("mouseenter", () => { pointerPaused = true; });
  section.addEventListener("mouseleave", () => { pointerPaused = false; });
  section.addEventListener("focusin", () => { focusPaused = true; });
  section.addEventListener("focusout", () => {
    window.setTimeout(() => { focusPaused = section.contains(document.activeElement); }, 0);
  });
  window.addEventListener("resize", () => setPosition(false));
  setPosition(false);

  function updateAutoplay() {
    if (inView && !reduceMotion && !autoplayTimer) {
      autoplayTimer = window.setInterval(() => {
        if (!pointerPaused && !focusPaused && !document.hidden && !locked) {
          moveTo(index + 1);
        }
      }, 4200);
    } else if ((!inView || reduceMotion) && autoplayTimer) {
      window.clearInterval(autoplayTimer);
      autoplayTimer = 0;
    }
  }

  if ("IntersectionObserver" in window) {
    const observer = new IntersectionObserver(entries => {
      inView = entries.some(entry => entry.isIntersecting);
      updateAutoplay();
    }, { threshold: 0.2 });
    observer.observe(section);
  } else {
    inView = true;
    updateAutoplay();
  }
})();

(() => {
  const header = document.querySelector(".site-header");
  if (!header || header.dataset.activeSectionReady) return;
  header.dataset.activeSectionReady = "true";

  const links = Array.from(header.querySelectorAll('.nav-links a[href^="#"]'));
  const targets = links
    .map(link => ({ link, section: document.querySelector(link.getAttribute("href")) }))
    .filter(item => item.section)
    .sort((a, b) => a.section.compareDocumentPosition(b.section) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1);

  function setActive(link) {
    links.forEach(item => {
      const active = item === link;
      item.classList.toggle("active", active);
      if (active) item.setAttribute("aria-current", "location");
      else item.removeAttribute("aria-current");
    });
  }

  links.forEach(link => link.addEventListener("click", () => setActive(link)));

  let scheduled = false;
  function updateOnScroll() {
    scheduled = false;
    header.classList.toggle("is-scrolled", window.scrollY > 24);
    if (!targets.length) return;
    const threshold = Math.min(window.innerHeight * .36, header.offsetHeight + 90);
    let current = targets[0];
    for (const item of targets) {
      if (item.section.getBoundingClientRect().top <= threshold) current = item;
      else break;
    }
    setActive(current.link);
  }
  function requestUpdate() {
    if (scheduled) return;
    scheduled = true;
    window.requestAnimationFrame(updateOnScroll);
  }

  window.addEventListener("scroll", requestUpdate, { passive: true });
  window.addEventListener("resize", requestUpdate, { passive: true });
  window.addEventListener("hashchange", requestUpdate);
  updateOnScroll();
})();
