/* Halftone wordmark — prints the home-page "Matas." as a field of dots.

   Vanilla port of the 21st.dev "Halftone Wordmark Footer" idea (React-only, so
   it can't drop into this no-build static site). Each dot is sized by how much
   of the letter covers its cell, so the word keeps its edges; the dots part
   around the pointer on springs and warm toward the accent as they're pushed,
   and a click sends a shock ring through the word.

   The real <h1> stays in the DOM (selection, SEO, screen readers) with its text
   made invisible once the canvas is up; the canvas sits inside the h1, so the
   h1's mix-blend-mode: exclusion still inverts the dots against the paintings.
   The word is fitted to the h1's own rendered text box — canvas can't set
   Archivo's font-stretch: 118%, so we measure the DOM text and scale to it. */

/* Pure helpers (same maths as the original component) */
const clamp01 = (c) => (c < 0 ? 0 : c > 1 ? 1 : c);
/** Dot radius for a cell coverage in [0, 1]: area-true, so tone stays even. */
const dotRadius = (cov, gap) => Math.sqrt(clamp01(cov)) * gap * 0.56;
const hex = (h) => {
  const m = /^#?([0-9a-f]{6})$/i.exec(h.trim());
  return m ? [0, 2, 4].map((i) => parseInt(m[1].slice(i, i + 2), 16)) : null;
};

function init(h1) {
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const word = h1.textContent.trim();                       // "Matas."
  const css = getComputedStyle(document.documentElement);
  const ink = [255, 255, 255];
  const warm = hex(css.getPropertyValue("--accent")) || [67, 0, 255];
  const PAD = 0.35;                                         // canvas bleed around the h1, × font size

  // zero-size inline-block: its bottom edge is the h1's text baseline
  const base = document.createElement("span");
  base.className = "hm-base";
  base.setAttribute("aria-hidden", "true");
  h1.appendChild(base);

  const canvas = document.createElement("canvas");
  canvas.className = "hm-canvas";
  canvas.setAttribute("aria-hidden", "true");
  h1.appendChild(canvas);
  const ctx = canvas.getContext("2d");

  let w = 0, h = 0, dpr = 1, ox = 0, oy = 0;
  let dots = new Float32Array(0), count = 0, gap = 6;
  let px = -1e5, py = -1e5, radius = 80;
  let ring = { x: 0, y: 0, t: -1 };
  let raf = 0, awake = true, visible = true;

  const layout = () => {
    const cs = getComputedStyle(h1);
    const size = parseFloat(cs.fontSize);
    const hr = h1.getBoundingClientRect();
    // text box of the word itself (glyph advances), and its baseline
    const range = document.createRange();
    range.setStart(h1, 0);
    range.setEnd(h1, h1.childNodes.length - 2);              // up to (not incl.) our marker + canvas
    const tr = range.getBoundingClientRect();
    const baseY = base.getBoundingClientRect().bottom;

    const pad = size * PAD;
    ox = hr.left - pad; oy = hr.top - pad;                   // canvas origin in viewport px
    w = Math.max(1, Math.round(hr.width + pad * 2));
    h = Math.max(1, Math.round(hr.height + pad * 2));
    canvas.style.left = -pad + "px";
    canvas.style.top = -pad + "px";
    canvas.style.width = w + "px";
    canvas.style.height = h + "px";
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);

    // set the word on a 1x mask, stretched to the DOM's own width
    const mask = document.createElement("canvas");
    mask.width = w; mask.height = h;
    const m = mask.getContext("2d", { willReadFrequently: true });
    m.font = `${cs.fontWeight} ${size}px ${cs.fontFamily}`;
    if ("fontStretch" in m) m.fontStretch = "expanded";
    const natural = m.measureText(word).width || 1;
    m.save();
    m.translate(tr.left - ox, baseY - oy);
    m.scale(tr.width / natural, 1);
    m.textBaseline = "alphabetic";
    m.fillText(word, 0, 0);
    m.restore();
    const img = m.getImageData(0, 0, w, h).data;

    gap = Math.max(3, Math.min(7, size / 36));
    radius = Math.max(40, size * 0.42);
    const cols = Math.ceil(w / gap), rows = Math.ceil(h / gap);
    const tmp = [];
    for (let gy = 0; gy < rows; gy++) {
      for (let gx = 0; gx < cols; gx++) {
        let sum = 0;                                         // coverage: 3×3 samples per cell
        for (let sy = 0; sy < 3; sy++) for (let sx = 0; sx < 3; sx++) {
          const x = Math.min(w - 1, Math.floor(gx * gap + ((sx + 0.5) * gap) / 3));
          const y = Math.min(h - 1, Math.floor(gy * gap + ((sy + 0.5) * gap) / 3));
          sum += img[(y * w + x) * 4 + 3];
        }
        const cov = sum / (9 * 255);
        if (cov < 0.06) continue;
        const hx = gx * gap + gap / 2, hy = gy * gap + gap / 2;
        tmp.push(hx, hy, 0, 0, hx, hy, dotRadius(cov, gap));
      }
    }
    dots = new Float32Array(tmp);
    count = tmp.length / 7;
    h1.classList.add("is-halftone");
    awake = true;
  };

  const draw = (now) => {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);
    const r = reduced ? 0 : radius;
    const age = ring.t < 0 ? 1e9 : now - ring.t;
    const ringR = age * 0.9;
    let moving = false;
    for (let i = 0; i < count; i++) {
      const j = i * 7;
      let x = dots[j], y = dots[j + 1], vx = dots[j + 2], vy = dots[j + 3];
      const hx = dots[j + 4], hy = dots[j + 5];
      if (!reduced) {
        if (age < 900) {                                     // shock ring from a click
          const dx = hx - ring.x, dy = hy - ring.y;
          const d = Math.sqrt(dx * dx + dy * dy) + 0.001;
          const band = 1 - Math.min(1, Math.abs(d - ringR) / 26);
          if (band > 0) { const f = band * 3.2 * (1 - age / 900); vx += (dx / d) * f; vy += (dy / d) * f; }
        }
        const dx = x - px, dy = y - py, d2 = dx * dx + dy * dy;
        if (r > 0 && d2 < r * r) {                           // pointer push
          const d = Math.sqrt(d2) + 0.001, f = (1 - d / r) * 2.6;
          vx += (dx / d) * f; vy += (dy / d) * f;
        }
        vx = (vx + (hx - x) * 0.05) * 0.84;                  // spring home, damped
        vy = (vy + (hy - y) * 0.05) * 0.84;
        x += vx; y += vy;
        if (Math.abs(vx) + Math.abs(vy) > 0.02 || Math.abs(x - hx) + Math.abs(y - hy) > 0.05) moving = true;
        else { x = hx; y = hy; vx = 0; vy = 0; }
        dots[j] = x; dots[j + 1] = y; dots[j + 2] = vx; dots[j + 3] = vy;
      }
      const k = Math.min(1, Math.hypot(x - hx, y - hy) / 28);  // warmth: 0 home → 1 pushed
      ctx.fillStyle = k > 0.02
        ? `rgb(${Math.round(ink[0] + (warm[0] - ink[0]) * k)},${Math.round(ink[1] + (warm[1] - ink[1]) * k)},${Math.round(ink[2] + (warm[2] - ink[2]) * k)})`
        : "#fff";
      ctx.beginPath();
      ctx.arc(x, y, dots[j + 6], 0, 6.2832);
      ctx.fill();
    }
    awake = moving || age < 900 || px > -1e4;                // sleep once everything is home
  };

  const loop = (now) => { raf = 0; if (!visible) return; draw(now); if (awake) raf = requestAnimationFrame(loop); };
  const wake = () => { awake = true; if (!raf && visible) raf = requestAnimationFrame(loop); };

  // .gallery-overlay is pointer-events: none (the gallery drags underneath),
  // so listen on the window and map to canvas space
  const local = (e) => {
    const b = canvas.getBoundingClientRect();
    return [e.clientX - b.left, e.clientY - b.top];
  };
  const near = (x, y) => x > -radius && y > -radius && x < w + radius && y < h + radius;
  addEventListener("pointermove", (e) => {
    const [x, y] = local(e);
    if (near(x, y)) { px = x; py = y; wake(); }
    else if (px > -1e4) { px = py = -1e5; wake(); }
  }, { passive: true });
  document.addEventListener("pointerleave", () => { px = py = -1e5; wake(); });
  addEventListener("pointerdown", (e) => {
    if (reduced || e.target.closest("a,button")) return;
    const [x, y] = local(e);
    if (!near(x, y)) return;
    ring = { x, y, t: performance.now() };
    wake();
  }, { passive: true });

  const relayout = () => { layout(); wake(); };
  new ResizeObserver(relayout).observe(h1);
  new IntersectionObserver((es) => { visible = es[0] ? es[0].isIntersecting : true; if (visible) wake(); }).observe(h1);
  // wait for Archivo so the dots trace the real face, not the fallback
  const ready = document.fonts && document.fonts.load
    ? document.fonts.load(`900 100px Archivo`).catch(() => {}).then(() => document.fonts.ready)
    : Promise.resolve();
  ready.then(relayout);
}

const mark = document.querySelector(".gallery-overlay .hero-mark");
if (mark && document.createElement("canvas").getContext) init(mark);
