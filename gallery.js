/* Matas — full-screen infinite 3D gallery (vanilla three.js port of the
   react-three-fiber "InfiniteGallery" template). Paintings drift toward the
   viewer along z, recycled endlessly, with near/far opacity falloff. Navigate
   by wheel, arrow keys, or drag; autoplay resumes after 3s of inactivity. */
import * as THREE from "three";

const IMAGES = (window.__MATAS_WORKS__ || []).slice();
const canvas = document.getElementById("gl");
const root = document.querySelector(".gallery-root");
if (canvas && root && IMAGES.length) {
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // ---- tunables (mirror the template's props) ----------------------------
  const Z_SPACING = 2.6;     // gap between consecutive planes
  const POOL = Math.max(IMAGES.length, 16);
  const D = POOL * Z_SPACING; // full recycle depth
  const NEAR = 0.35, FAR = 17;      // opacity falloff bounds (distance from camera)
  const FADE_FAR = 4.5;             // fade-in distance as a plane approaches from afar
  const FADE_NEAR = 1.8;            // fade-out distance as a plane passes the camera (smaller = fades later)
  const AUTO_SPEED = reduce ? 0 : 1.7;  // world-units / second
  const SPREAD_X = 5.4, SPREAD_Y = 3.1;
  const BASE_H = 1.75;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(58, 1, 0.1, 100);
  camera.position.set(0, 0, 0);

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  const loader = new THREE.TextureLoader();
  const hash = (n) => { const s = Math.sin(n * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); };

  const geo = new THREE.PlaneGeometry(1, 1);
  const planes = [];
  for (let i = 0; i < POOL; i++) {
    const src = IMAGES[i % IMAGES.length];
    const mat = new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false, toneMapped: false });
    const mesh = new THREE.Mesh(geo, mat);
    const scl = 0.82 + hash(i * 2.1) * 0.5;   // slight size variety
    mesh.userData = {
      phase: i / POOL,
      x: (hash(i * 2.7) - 0.5) * SPREAD_X,
      y: (hash(i * 5.3) - 0.5) * SPREAD_Y,
      scl,
      aspect: 1,
    };
    mesh.scale.set(BASE_H * scl, BASE_H * scl, 1);
    mesh.renderOrder = i;
    scene.add(mesh);
    planes.push(mesh);
    loader.load(src, (tex) => {
      tex.colorSpace = THREE.SRGBColorSpace;
      const a = (tex.image && tex.image.width / tex.image.height) || 1;
      mesh.userData.aspect = a;
      mesh.scale.set(BASE_H * scl * a, BASE_H * scl, 1);
      mat.map = tex; mat.needsUpdate = true;
    });
  }

  // ---- navigation state --------------------------------------------------
  let progress = 0;        // eased current position (world units)
  let target = 0;          // where input wants us
  let lastInput = -9999;   // time of last user input
  const smooth = (a, b, t) => a + (b - a) * t;
  const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);

  function nudge(delta) { target += delta; lastInput = performance.now() / 1000; }
  root.addEventListener("wheel", (e) => { e.preventDefault(); nudge(e.deltaY * 0.0016 * Z_SPACING); }, { passive: false });
  window.addEventListener("keydown", (e) => {
    if (e.key === "ArrowUp" || e.key === "ArrowLeft") nudge(-Z_SPACING);
    else if (e.key === "ArrowDown" || e.key === "ArrowRight") nudge(Z_SPACING);
  });
  let touchY = null;
  root.addEventListener("touchstart", (e) => { touchY = e.touches[0].clientY; }, { passive: true });
  root.addEventListener("touchmove", (e) => {
    if (touchY == null) return;
    const dy = touchY - e.touches[0].clientY; touchY = e.touches[0].clientY;
    nudge(dy * 0.01 * Z_SPACING);
  }, { passive: true });
  root.addEventListener("touchend", () => { touchY = null; }, { passive: true });

  // ---- resize ------------------------------------------------------------
  function resize() {
    const w = root.clientWidth, h = root.clientHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }
  window.addEventListener("resize", resize);
  resize();

  // ---- loop --------------------------------------------------------------
  const Z_FRONT = 2.5;          // just behind the camera (invisible), recycle point
  let prev = performance.now();
  let visible = true;
  document.addEventListener("visibilitychange", () => { visible = !document.hidden; prev = performance.now(); });

  function frame(now) {
    requestAnimationFrame(frame);
    if (!visible) return;
    const dt = Math.min((now - prev) / 1000, 0.05); prev = now;
    const t = now / 1000;

    // autoplay resumes 3s after the last input
    if (t - lastInput > 3) target += AUTO_SPEED * dt;
    progress = smooth(progress, target, 1 - Math.pow(0.0025, dt)); // frame-rate independent ease

    for (const m of planes) {
      const d = m.userData;
      let zn = (d.phase + progress / D) % 1; if (zn < 0) zn += 1;
      const z = (Z_FRONT - D) + zn * D;   // range [Z_FRONT - D, Z_FRONT]
      m.position.set(d.x, d.y, z);
      const dist = -z;                     // distance in front of camera
      const fadeIn = clamp01((FAR - dist) / FADE_FAR);
      const fadeOut = clamp01((dist - NEAR) / FADE_NEAR);
      m.material.opacity = fadeIn * fadeOut;
      m.visible = m.material.opacity > 0.001;
    }
    renderer.render(scene, camera);
  }
  requestAnimationFrame(frame);

  // reveal once the first textures have had a moment
  document.documentElement.classList.add("gallery-ready");
}
