/* Matas — load, scroll reveal, and word-by-word reveal (Constantine-style).
   Progressive enhancement only. */
(function () {
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* always start at the top so above-the-fold reveals fire correctly */
  if ("scrollRestoration" in history) history.scrollRestoration = "manual";
  window.scrollTo(0, 0);

  /* split [data-words] elements into per-word spans so they can stagger.
     A word may be marked dim by wrapping it in {curly braces} in the source. */
  document.querySelectorAll("[data-words]").forEach((el) => {
    const raw = el.textContent.replace(/\s+/g, " ").trim();
    el.textContent = "";
    let i = 0;
    raw.split(" ").forEach((word) => {
      let dim = false;
      if (word.startsWith("{") && word.endsWith("}")) { dim = true; word = word.slice(1, -1); }
      const outer = document.createElement("span");
      outer.className = "w";
      const inner = document.createElement("span");
      inner.className = "wi" + (dim ? " dim" : "");
      inner.style.setProperty("--i", i++);
      inner.textContent = word;
      outer.appendChild(inner);
      el.appendChild(outer);
      el.appendChild(document.createTextNode(" "));
    });
  });

  /* page-load sequence */
  requestAnimationFrame(() => document.documentElement.classList.add("loaded"));

  /* drag-to-scroll for sideways project rows (pointer + wheel) */
  document.querySelectorAll("[data-drag-scroll]").forEach((el) => {
    let down = false, startX = 0, startLeft = 0, moved = 0;
    el.addEventListener("pointerdown", (e) => {
      down = true; moved = 0;
      startX = e.clientX; startLeft = el.scrollLeft;
      el.classList.add("dragging");
      el.setPointerCapture(e.pointerId);
    });
    el.addEventListener("pointermove", (e) => {
      if (!down) return;
      const dx = e.clientX - startX;
      moved = Math.max(moved, Math.abs(dx));
      el.scrollLeft = startLeft - dx;
    });
    const end = () => { down = false; el.classList.remove("dragging"); };
    el.addEventListener("pointerup", end);
    el.addEventListener("pointercancel", end);
    el.addEventListener("pointerleave", end);
    /* swallow the click if it was actually a drag */
    el.addEventListener("click", (e) => { if (moved > 6) { e.preventDefault(); e.stopPropagation(); } }, true);
    /* vertical wheel scrolls the row horizontally */
    el.addEventListener("wheel", (e) => {
      if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) { el.scrollLeft += e.deltaY; e.preventDefault(); }
    }, { passive: false });
  });

  /* home only: reveal the top bar once you scroll past the hero.
     Driven by a sentinel + IntersectionObserver so it is reliable across
     Safari's dynamic toolbar (offsetHeight maths used to be flaky). */
  const head = document.querySelector(".site-head.autohide");
  if (head) {
    const sentinel = document.querySelector(".autohide-sentinel");
    const setShown = (on) => head.classList.toggle("shown", on);
    if (sentinel && "IntersectionObserver" in window) {
      new IntersectionObserver((entries) => {
        const e = entries[0];
        // shown when the sentinel (hero bottom) has scrolled above the viewport
        setShown(!e.isIntersecting && e.boundingClientRect.top < 0);
      }, { threshold: 0 }).observe(sentinel);
    } else {
      const onScroll = () => setShown(window.scrollY > window.innerHeight * 0.85);
      window.addEventListener("scroll", onScroll, { passive: true });
      onScroll();
    }
  }

  /* home hero: painting cards rise up over the text as you scroll, warped by
     an SVG displacement filter. Desktop + no-reduced-motion only. */
  const emerge = document.querySelector(".hero-emerge");
  const heroSec = document.querySelector(".hero");
  if (emerge && heroSec && !reduce && window.matchMedia("(min-width: 860px)").matches) {
    document.documentElement.classList.add("emerge-on");
    const disp = document.querySelector("#warp feDisplacementMap");
    const cards = Array.from(emerge.querySelectorAll(".ec"));
    // left = left edge %, w = width vw, delay staggers arrival, rise controls
    // travel, op peak opacity, rot tilt. Cards are anchored top-left and animated
    // via top/left + rotate/scale only (percentage translate drops paints).
    const CFG = [
      { left: 38, w: 26, delay: 0.05, op: 0.86, rot: 2,  dx: -4 },
      { left: 14, w: 22, delay: 0.00, op: 0.82, rot: -4, dx: -6 },
      { left: 62, w: 20, delay: 0.12, op: 0.80, rot: 5,  dx: 6 },
      { left: 4,  w: 17, delay: 0.24, op: 0.76, rot: -6, dx: -5 },
      { left: 76, w: 18, delay: 0.34, op: 0.78, rot: 6,  dx: 7 },
      { left: 30, w: 15, delay: 0.44, op: 0.72, rot: -3, dx: -3 },
      { left: 54, w: 18, delay: 0.28, op: 0.80, rot: 4,  dx: 5 },
    ];
    cards.forEach((c, i) => {
      const cfg = CFG[i] || CFG[0];
      c.style.width = cfg.w + "vw";
    });
    const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
    const lerp = (a, b, t) => a + (b - a) * t;
    const easeIO = (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);
    let running = false, parked = false;
    const frame = () => {
      const vh = window.innerHeight;
      // scroller-agnostic progress: how far the hero has scrolled up, in viewports.
      const p = clamp(-heroSec.getBoundingClientRect().top / vh, 0, 3);
      // outside the active window: hide once, then stop the loop until next scroll.
      if (p > 1.6) {
        if (!parked) { cards.forEach((c) => (c.style.opacity = "0")); parked = true; }
        running = false; return;
      }
      parked = false;
      const e = clamp(p, 0, 1);
      const gate = 1 - clamp((p - 1.15) / 0.3, 0, 1);
      const t = performance.now();
      cards.forEach((c, i) => {
        const cfg = CFG[i] || CFG[0];
        const cp = clamp((p - cfg.delay) / 1.15, 0, 1);
        const top = lerp(82, -44, easeIO(cp));     // rise from below the fold to above it
        const left = cfg.left + cfg.dx * (cp - 0.5) * 2;
        const sc = lerp(0.82, 1.06, cp);
        const bell = Math.pow(Math.sin(Math.PI * cp), 1.1);
        c.style.top = top.toFixed(2) + "%";
        c.style.left = left.toFixed(2) + "%";
        c.style.opacity = (cfg.op * bell * gate).toFixed(3);
        c.style.transform = "rotate(" + cfg.rot + "deg) scale(" + sc.toFixed(3) + ")";
      });
      if (disp) disp.setAttribute("scale", (lerp(46, 12, e) + 3.2 * Math.sin(t * 0.0018) + 3.2).toFixed(1));
      requestAnimationFrame(frame);
    };
    const kick = () => { if (!running) { running = true; requestAnimationFrame(frame); } };
    // body is the scroll container on this site, so catch scroll in the capture
    // phase (scroll doesn't bubble); also listen on window for the root scroller.
    window.addEventListener("scroll", kick, { passive: true, capture: true });
    window.addEventListener("resize", kick, { passive: true });
    kick();
  }

  /* art page lightbox: click a painting to see it full size */
  const lb = document.getElementById("lightbox");
  if (lb) {
    const lbImg = lb.querySelector(".lightbox-img");
    const lbCap = lb.querySelector(".lightbox-cap");
    const open = (img) => {
      lbImg.src = img.currentSrc || img.src;
      lbImg.alt = img.alt || "";
      lbCap.textContent = (img.alt || "").replace(/, by Matas$/, "");
      lb.classList.add("open"); lb.setAttribute("aria-hidden", "false");
      document.body.classList.add("lb-open");
    };
    const close = () => {
      lb.classList.remove("open"); lb.setAttribute("aria-hidden", "true");
      document.body.classList.remove("lb-open");
    };
    document.querySelectorAll(".piece-media").forEach((fig) => {
      const btn = fig.querySelector(".piece-zoom") || fig;
      btn.addEventListener("click", () => { const img = fig.querySelector("img"); if (img) open(img); });
    });
    lb.addEventListener("click", (e) => { if (e.target !== lbImg) close(); });
    document.addEventListener("keydown", (e) => { if (e.key === "Escape" && lb.classList.contains("open")) close(); });
  }

  const items = document.querySelectorAll(".reveal, [data-words], .ruler, .rule, .framed, .clip");
  if (reduce || !("IntersectionObserver" in window)) {
    items.forEach((el) => el.classList.add("in"));
    return;
  }

  const io = new IntersectionObserver(
    (entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting) {
          e.target.classList.add("in");
          io.unobserve(e.target);
        }
      });
    },
    { rootMargin: "0px 0px -10% 0px", threshold: 0.1 }
  );
  items.forEach((el) => io.observe(el));

  /* belt-and-braces: reveal anything already on screen at load,
     so above-the-fold elements never wait on an observer race */
  const sweep = () => {
    const h = window.innerHeight;
    items.forEach((el) => {
      if (el.classList.contains("in")) return;
      const r = el.getBoundingClientRect();
      if (r.top < h * 0.92 && r.bottom > 0) {
        el.classList.add("in");
        io.unobserve(el);
      }
    });
  };
  window.addEventListener("load", () => requestAnimationFrame(sweep));
  requestAnimationFrame(() => requestAnimationFrame(sweep));
})();
