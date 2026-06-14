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
