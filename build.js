/* Generates static index.html and art.html from the content model.
   Run: node build.js  */
const fs = require("fs");
const path = require("path");

const A = (id) => `assets/img-${id}.jpg`;
const VER = Date.now().toString(36);   // cache-bust css/js on every build

// Projects is hidden for now — flip to true to bring back the tab, page,
// hero link and home section.
const SHOW_PROJECTS = false;

/* ---- projects (non-art design work, placeholder) ---------------------- */
const projects = [
  { n: "01", title: "Nocturne",   cat: "Brand Identity",     year: "2024", status: "Case study soon" },
  { n: "02", title: "Field Notes", cat: "Editorial Design",  year: "2023", status: "Case study soon" },
  { n: "03", title: "Halcyon",    cat: "Art Direction",      year: "2024", status: "Case study soon" },
  { n: "04", title: "Drift",      cat: "Motion & Film",      year: "2025", status: "In progress" },
  { n: "05", title: "Atlas",      cat: "Web & Digital",      year: "2023", status: "Case study soon" },
  { n: "06", title: "Margin",     cat: "Photography",        year: "2024", status: "Case study soon" },
];
const projectCard = (p, interactive) => `<article class="proj-card${interactive ? " is-preview" : ""}" tabindex="0">
    <div class="proj-top"><span class="proj-n">${p.n}</span><span class="proj-cat">${p.cat}</span></div>
    <div class="proj-mid" aria-hidden="true"><span class="proj-ghost">${p.title}</span></div>
    <div class="proj-bot">
      <h3 class="proj-title">${p.title}</h3>
      <div class="proj-meta"><span>${p.year}</span><span class="proj-status">${p.status}</span></div>
    </div>
  </article>`;

/* ---- gallery content (Matas, in catalogue order) ---------------------- */
const works = [
  { num: "003", img: "cd3be181-369c-4c3b-9103-0a0d3c45fcec",
    concept: "Explores the fragile essence of innocence and its gradual erosion through external influences. The central disfigured eyes symbolise purity, set within a vast expanse of blue that embodies an ocean of untainted innocence. The darker shades of blue and black signify the pervasive forces of corruption, infiltrating and intertwining with innocence, subtly seeping beneath the surface.",
    tech: "Realised on canvas with acrylic paint, starting the base with a light sketch of the flow with acrylic markers, measuring the correct positioning for the disfigured eyes in the middle.",
    size: "100 × 150 cm", medium: "Acrylic on canvas", year: "2022", price: "£1,250" },

  { num: "010", img: "d51b01d7-4450-4bf9-b7cd-f0d9324e289b",
    concept: "Reflects on the corrosive nature of workplace culture and its capacity to consume. Rendered in a palette of muted, heavy tones, the painting evokes disquiet and dislocation. Two figures appear, half-recognisable, suggesting a fading sense of self and the difficulty of holding onto identity.",
    tech: "Realised on canvas, the background painted with a stiletto, roughly sketched over the figure behind, lines filled with a thick brush in an uneven manner.",
    size: "100 × 150 cm", medium: "Acrylic on canvas", year: "2024", price: "£1,100" },

  { num: "001.1", img: "a86574f8-7e68-40d0-95b6-8b289221bf09",
    concept: "Examines the weight of financial despair and the faceless entities that shape the daily struggle. The single banknote stands as both symbol and witness, its surface carrying the traces of blood-stained histories. The facelessness of government control emerges through the object, suggesting how structures of authority extend quietly into every corner of life.",
    tech: "Realised on a $5 bill, with acrylic as the base for the face and an acrylic marker for the details and outline.",
    size: "15.6 × 6.6 cm", medium: "Acrylic on bank note", year: "2023", price: "unavailable" },

  { num: "001", img: "b364f682-e3d1-416a-80cf-90b556a73d99",
    concept: "Confronts the absence of genuine, authentic purpose, often mistaken for the pursuit of wealth and power. It explores the detrimental effects of losing yourself in that pursuit, leading to a loss of identity.",
    tech: "Realised on canvas with spray acrylic as base and acrylic pen for outline.",
    size: "100 × 150 cm", medium: "Acrylic on canvas", year: "2022", price: "unavailable" },

  { num: "011", img: "b01cbe59-e2d8-43f0-8ff6-9f8cd67b78cc",
    concept: "Traces the darker sides of unchecked infatuation and its power to overwhelm. What begins as desire turns corrosive, leaving behind unease and self-disgust. The imagery suggests a collapse of boundaries, where passion slips into obsession, and the self becomes both the object and victim of its own consumption.",
    tech: "Realised on canvas with oil paint.",
    size: "60 × 60 cm", medium: "Oil on canvas", year: "2025", price: "£725" },

  { num: "008", img: "81e28c86-865a-480e-8396-a0b910a30fb2",
    concept: "Takes an ironic look at the relationship between Iran and America, an Iranian woman rendered onto an American banknote, the worth of one nation printed straight over the body of another. The cat sits beside her as the only real witness, watching the harm carried out in the name of that currency. She is given no eyes, stripped of sight and self, just another casualty counted among the many and quietly forgotten.",
    tech: "Realised on a 50-dollar note, sketching the lady with the cat in pencil and using acrylic for colour with black pen for the details.",
    size: "15.1 × 6.5 cm", medium: "Acrylic on bank note", year: "2024", price: "£375" },

  { num: "009", img: "8b59a1f1-c239-43d4-9979-f3254cedb56a",
    concept: "Revisits the themes of 003 on a more intimate scale, tracing the loss of innocence through the weight of monetary control. The composition evokes entrapment, as if boxed into a space where freedom is curtailed and value is measured against imposed systems. The smaller scale heightens the sense of confinement.",
    tech: "Realised on a 2-dollar note with acrylic paint.",
    size: "15.5 × 6.6 cm", medium: "Acrylic on bank note", year: "2024", price: "£275" },

  { num: "002", img: "45a74f5e-d016-427e-a1b7-248f466e1ce7",
    concept: "Sinks into the isolation and loneliness that come from being left alone with yourself for too long. The deep blue spreads across the canvas as an ocean of solitude, cold and boundless, holding the figure apart from the world. Within it the face begins to come undone, tracing a slow descent into madness as the mind, starved of anyone else, quietly turns in on itself.",
    tech: "Realised on canvas with acrylic paint.",
    size: "50 × 70 cm", medium: "Acrylic on canvas", year: "2022", price: "unavailable" },

  { num: "006", img: "8d0863b2-504a-43ad-9a31-b4f67ece96c8",
    concept: "Questions the meaning of originality and the ownership of media. The idea itself was manifested through a text-to-image artificial intelligence; the painting unsettles traditional notions of authorship, prompting reflection on where a work truly begins, whether originality lies in conception, execution, or the technology that bridges the two.",
    tech: "Created from the inspiration of AI, realised on canvas with acrylic paint.",
    size: "100 × 150 cm", medium: "Acrylic on canvas", year: "2023", price: "unavailable" },

  { num: "007", img: "9c4986b9-90ee-48c9-8bc0-05dc934ac0ad",
    concept: "Exposes the predatory nature of the art market, where sales and collections reduce artworks to financial instruments. By confronting the practice of using art as a tax shelter, it challenges the systems that commodify creativity and strip it of intention. The piece resists absorption into that cycle, a refusal of industry norms.",
    tech: "Realised with deliberate resistance to display: constructed so that it cannot be hung on a wall. Its very form embodies defiance, rejecting the conventions of presentation and possession, using oil paint and fine powder.",
    size: "30 × 30 cm", medium: "Oil and acrylic on canvas", year: "2024", price: "unavailable" },

  { num: "005", img: "a5b54075-f5e3-4a4c-98c6-930391dec989",
    concept: "Considers the significance of anonymity within a turbulent political landscape. Where authority asserts dominance, the absence of identity becomes a form of protection and resistance. The faceless presence hints at both vulnerability and strength, suggesting how concealment can serve as survival in the face of suppression.",
    tech: "Realised on canvas with oil paint.",
    size: "100 × 150 cm", medium: "Oil on canvas", year: "2022", price: "unavailable" },

  { num: "004", img: "8cd8e54d-08d6-4fa5-ba80-a523fd7424c2",
    concept: "Captures the consuming nature of loneliness and its ability to shape an entire existence. The figure becomes both vessel and source, as isolation pushes outward, spilling beyond the boundaries of the self. Private solitude transforms into an all-encompassing presence, altering not only the inner world but the space around it.",
    tech: "Realised on canvas with acrylic paint.",
    size: "50 × 50 cm", medium: "Acrylic on canvas", year: "2022", price: "unavailable" },
];

/* ---- newly added paintings ---------------------------------------------
   The originals are HEIC/DNG, which can't be decoded in this environment.
   Drop a JPG for each at assets/img-new-0X.jpg and it is included on both
   pages automatically (size/year/price are placeholders to confirm). */
const newWorks = [
  { img: "new-01", concept: "Recent work.", tech: "Acrylic on canvas.", size: "On request", medium: "Acrylic on canvas", year: "2025", price: "Price on request" },
  { img: "new-02", concept: "Recent work.", tech: "Acrylic on canvas.", size: "On request", medium: "Acrylic on canvas", year: "2025", price: "Price on request" },
  { img: "new-03", concept: "Recent work.", tech: "Acrylic on canvas.", size: "On request", medium: "Acrylic on canvas", year: "2025", price: "Price on request" },
  { img: "new-04", concept: "Recent work.", tech: "Acrylic on canvas.", size: "On request", medium: "Acrylic on canvas", year: "2025", price: "Price on request" },
  { img: "new-05", concept: "Speaks to being lost in an environment that never stops shifting, learning to adapt to everything around you without ever letting it swallow you whole. The vibrant yellow pulls the figure forward and holds it clear of the ground behind, a self that bends with its surroundings yet refuses to dissolve into them. It is a portrait of survival through adaptation, staying whole while everything else keeps changing.", tech: "Oil on canvas.", size: "On request", medium: "Oil on canvas", year: "2025", price: "unavailable" },
  { img: "new-06", concept: "A collaborative piece about the connection between a person and the natural world, the hair growing outward into the landscape as though the two were never truly apart. Behind the figure a ghostly presence follows close, the shape of a resentful and regretful past that refuses to be left behind. It lingers as a reminder that wherever you go, everything that came before you comes too.", tech: "Oil on canvas.", size: "On request", medium: "Oil on canvas", year: "2026", price: "Price on request" },
  { img: "new-07", concept: "Carries the pride of the Lithuanian symbol, a reconnection with my roots and a wish to hold them close rather than hide them away. The red figure is my own consciousness pushing through the surface of the painting, looking out and seeing my country clearly, for everything it is and everything it has been. It is an act of belonging, claiming a heritage without shame and wearing it openly.", tech: "Oil on canvas.", size: "On request", medium: "Oil on canvas", year: "2026", price: "Price on request" },
  { img: "new-08", concept: "A collaborative piece made as the cover for an upcoming music album. The faces are painted in the pan African colours, worn openly across the head as a mark of identity and belonging. The red ground behind them holds the frustration of the circumstances, the weight of having to sit still and keep from escalating when met with discrimination, of not being free to react the way others can when their skin happens to be a different colour to yours.", tech: "Oil on canvas.", size: "On request", medium: "Oil on canvas", year: "2026", price: "Price on request" },
].filter((w) => fs.existsSync(path.join(__dirname, "assets/img-" + w.img + ".jpg")));
// number them sequentially after the existing catalogue (…011, 012, 013)
newWorks.forEach((w, i) => { w.num = String(12 + i).padStart(3, "0"); });
works.push(...newWorks);

/* catalogue page order: newest first (by year, then work number) */
const catalogue = [...works].sort((a, b) => (b.year - a.year) || (parseFloat(b.num) - parseFloat(a.num)));

const allYears = works.map((w) => +w.year);
const yearSpan = `${Math.min(...allYears)} to ${Math.max(...allYears)}`;

/* read width/height straight from a JPEG so masonry columns balance */
function jpegRatio(rel) {
  try {
    const b = fs.readFileSync(path.join(__dirname, rel));
    let i = 2;
    while (i < b.length - 9) {
      if (b[i] !== 0xFF) { i++; continue; }
      const m = b[i + 1];
      if (m >= 0xC0 && m <= 0xCF && m !== 0xC4 && m !== 0xC8 && m !== 0xCC) {
        return b.readUInt16BE(i + 5) / b.readUInt16BE(i + 7);
      }
      i += 2 + b.readUInt16BE(i + 2);
    }
  } catch (e) {}
  return 1.3;
}

/* ---- home mosaic = every painting in the catalogue (incl. new) --------- */
const ratios = {
  "cd3be181-369c-4c3b-9103-0a0d3c45fcec": 1.71, "d51b01d7-4450-4bf9-b7cd-f0d9324e289b": 1.53,
  "a86574f8-7e68-40d0-95b6-8b289221bf09": 0.42, "b364f682-e3d1-416a-80cf-90b556a73d99": 1.70,
  "b01cbe59-e2d8-43f0-8ff6-9f8cd67b78cc": 1.00, "81e28c86-865a-480e-8396-a0b910a30fb2": 0.42,
  "8b59a1f1-c239-43d4-9979-f3254cedb56a": 0.42, "45a74f5e-d016-427e-a1b7-248f466e1ce7": 1.26,
  "8d0863b2-504a-43ad-9a31-b4f67ece96c8": 1.71, "9c4986b9-90ee-48c9-8bc0-05dc934ac0ad": 0.99,
  "a5b54075-f5e3-4a4c-98c6-930391dec989": 1.46, "8cd8e54d-08d6-4fa5-ba80-a523fd7424c2": 1.01,
};
const mosaic = works.map((w) => ({
  img: w.img,
  r: ratios[w.img] || jpegRatio("assets/img-" + w.img + ".jpg"),
  num: w.num || "", medium: w.medium || "",
}));

/* greedy-balance items into n vertical columns for flex masonry */
function intoColumns(items, n) {
  const cols = Array.from({ length: n }, () => ({ h: 0, items: [] }));
  items.forEach((it) => {
    const c = cols.reduce((a, b) => (a.h <= b.h ? a : b));
    c.items.push(it);
    c.h += (it.r || 1.3) + 0.35; // + caption/gap allowance
  });
  return cols.map((c) => c.items);
}

/* ---- shared chrome ---------------------------------------------------- */
const FONTS = `<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin><link href="https://fonts.googleapis.com/css2?family=Archivo:wdth,wght@100..125,500..900&family=Inter:wght@400;500;600&display=swap" rel="stylesheet">`;

const head = (title, desc, themeColor = "#4300ff") => `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${title}</title>
<meta name="description" content="${desc}">
<meta name="theme-color" content="${themeColor}">
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
${FONTS}
<link rel="stylesheet" href="styles.css?v=${VER}">
</head>`;

const header = (page) => `<header class="site-head${page==="home"?" autohide":""}">
  <a class="brand" href="index.html">Matas<span class="dot">.</span></a>
  <nav class="nav" aria-label="Primary">
    <a href="art.html"${page==="art"?' aria-current="page"':""}>Fine&nbsp;Art</a>
    ${SHOW_PROJECTS?`<a href="projects.html"${page==="projects"?' aria-current="page"':""}>Projects</a>`:""}
    <a href="mailto:matas@mail.com">Contact</a>
    ${page==="art"||page==="projects"?'<a href="index.html">Back</a>':""}
  </nav>
</header>`;

const footer = () => `<footer class="foot reveal">
  <div class="wrap">
    <div class="foot-grid">
      <p class="foot-cta"><a href="mailto:matas@mail.com">Let's talk<span class="dot" style="color:var(--accent)">.</span></a></p>
      <div class="foot-meta">
        <span class="eyebrow" style="margin-bottom:6px">Enquiries</span>
        <a href="mailto:matas@mail.com">matas@mail.com</a>
        <span>London, UK</span>
        <span>Commissions &amp; original works available</span>
      </div>
    </div>
    <div class="foot-bottom">
      <span>Matas, Fine art &amp; art direction</span>
      <span>© ${new Date().getFullYear()} · All works by the artist</span>
    </div>
  </div>
</footer>`;

const priceMarkup = (p) => p === "unavailable"
  ? `<span class="price sold">Unavailable</span>`
  : `<a class="price avail" href="mailto:matas@mail.com">Contact me</a>`;

/* rotating circular badge (text on a circle) */
const badge = `<div class="badge" aria-hidden="true">
  <svg viewBox="0 0 120 120"><defs><path id="circ" d="M60,60 m-44,0 a44,44 0 1,1 88,0 a44,44 0 1,1 -88,0"/></defs>
  <text><textPath href="#circ" startOffset="0">FINE&nbsp;ART · ORIGINAL&nbsp;PAINTINGS · LONDON · &nbsp;</textPath></text></svg>
  <span class="core"></span></div>`;

const brackets = `<span class="brk tl"></span><span class="brk tr"></span><span class="brk bl"></span><span class="brk br"></span>`;

/* marquee strip */
const marqUnit = `<span class="solid">Original&nbsp;Paintings</span><span class="star"> ✳ </span><span>Fine&nbsp;Art</span><span class="star"> ✳ </span><span class="solid">London</span><span class="star"> ✳ </span><span>${yearSpan}</span><span class="star"> ✳ </span>`;

/* ---- index.html ------------------------------------------------------- */
const indexHTML = `${head("Matas · Fine Art", "London-based artist and art director. Original expressionist paintings exploring identity, corruption and the self.")}
<body class="theme-blue">
${header("home")}
<main>
  <section class="hero">
    <div class="wrap">
      <div class="hero-grid">
        <div>
          <p class="hero-role load l1">London · Fine Artist &amp; Art Director</p>
          <h1 class="hero-mark outline load l2">Matas<span class="dot">.</span></h1>
        </div>
        <div class="hero-foot load l3">
          <nav class="hero-nav" aria-label="Sections">
            <a href="art.html">fine&nbsp;art.</a>
            ${SHOW_PROJECTS?`<a href="projects.html">projects.</a>`:""}
            <a href="mailto:matas@mail.com">contact&nbsp;me.</a>
          </nav>
          <div>
            <p class="hero-lede">I'm a London-based freelance designer and art director with a deep passion for fashion and culture. My work has a <span class="accent">melancholic</span> feel, always reaching back to reconnect with my roots, seeking quality from the past which I bring into my art.</p>
            <a class="scroll-cue" href="#work">Selected work</a>
          </div>
        </div>
      </div>
    </div>
  </section>
  <span class="autohide-sentinel" aria-hidden="true"></span>

  <section class="works section-light" id="work">
    <div class="wrap">
      <div class="section-head reveal">
        <h2 class="section-title outline">Fine&nbsp;art<span class="dot">.</span></h2>
        <a class="section-link" href="art.html">View the full catalogue</a>
      </div>
      <div class="mosaic">
        ${intoColumns(mosaic, 3).map((col)=>`<div class="mcol">
          ${col.map((m)=>`<a class="tile reveal" href="art.html" aria-label="Painting ${m.num}, ${m.medium}, by Matas">
            <img src="${A(m.img)}" alt="Painting ${m.num} by Matas, ${m.medium}" loading="lazy">
            <figcaption><span class="num">View</span></figcaption>
          </a>`).join("\n          ")}
        </div>`).join("\n        ")}
      </div>
    </div>
  </section>

  ${SHOW_PROJECTS?`<section class="projects-block" id="projects">
    <div class="wrap">
      <div class="section-head reveal">
        <div>
          <h2 class="section-title outline">Projects<span class="dot">.</span></h2>
          <p class="projects-sub">Selected work beyond the canvas, art direction, brand and digital.</p>
        </div>
        <a class="section-link" href="projects.html">All projects</a>
      </div>
    </div>
    <div class="proj-scroller reveal" data-drag-scroll>
      <div class="proj-track">
        ${projects.map((p)=>projectCard(p, true)).join("\n        ")}
        <a class="proj-card proj-card-end" href="projects.html">
          <span class="proj-end-label">View all<br>projects</span>
          <span class="proj-end-arrow" aria-hidden="true">&rarr;</span>
        </a>
      </div>
    </div>
    <div class="wrap"><p class="proj-hint reveal">Drag or scroll sideways to explore</p></div>
  </section>`:""}
</main>
${footer()}
<script src="script.js?v=${VER}"></script>
</body></html>`;

/* ---- art.html --------------------------------------------------------- */
const artHTML = `${head("Matas, Fine Art Catalogue", "The complete catalogue of original paintings by Matas: identity, corruption, money and the self.")}
<body>
${header("art")}
<main>
  <section class="gallery-intro">
    <div class="wrap">
      <p class="eyebrow load l1">The catalogue · ${yearSpan}</p>
      <h1 class="load l2">Fine art<span class="dot">.</span></h1>
      <p class="sub load l3">Original expressionist paintings, on canvas, oil and banknote, circling identity, corruption, money and the slow erosion of the self.</p>
      <div class="gallery-count load l4">
        <span><b>${works.length}</b> works</span>
        <span><b>${works.filter(w=>w.price!=="unavailable").length}</b> available</span>
        <span>London, UK</span>
      </div>
    </div>
  </section>

  <div class="wrap">
    ${catalogue.map((w)=>`<article class="piece reveal">
      <figure class="piece-media">
        <button class="piece-zoom" type="button" aria-label="Expand work ${w.num}"></button>
        <img src="${A(w.img)}" alt="Work ${w.num}, ${w.medium}, ${w.year}, by Matas" loading="lazy">
      </figure>
      <div class="piece-text">
        <div class="piece-num">${w.num.replace(".", '<span class="slash">.</span>')}</div>
        <p class="piece-body">${w.concept}</p>
        <p class="piece-tech">${w.tech}</p>
        <dl class="spec">
          <dt>Dimensions</dt><dd>${w.size}</dd>
          <dt>Medium</dt><dd>${w.medium}</dd>
          <dt>Year</dt><dd>${w.year}</dd>
          <dt>Availability</dt><dd>${priceMarkup(w.price)}</dd>
        </dl>
      </div>
    </article>`).join("\n    ")}
  </div>
</main>
<div class="lightbox" id="lightbox" aria-hidden="true" role="dialog" aria-modal="true" aria-label="Artwork preview">
  <button class="lightbox-close" type="button" aria-label="Close preview">&times;</button>
  <figure class="lightbox-figure"><img class="lightbox-img" alt=""><figcaption class="lightbox-cap"></figcaption></figure>
</div>
${footer()}
<script src="script.js?v=${VER}"></script>
</body></html>`;

/* ---- projects.html ----------------------------------------------------- */
const projectsHTML = `${head("Matas · Projects", "Design and art-direction projects by Matas beyond the canvas: brand identity, editorial, motion and digital.")}
<body class="theme-blue">
${header("projects")}
<main>
  <section class="projects-page">
    <div class="wrap">
      <p class="pp-eyebrow load l1">Beyond the canvas</p>
      <h1 class="pp-title outline load l2">Projects<span class="dot">.</span></h1>
      <p class="pp-lead load l3">Design and art direction work, brand identity, editorial, motion and digital. Case studies are on the way, drag the row below to preview what's coming.</p>
    </div>

    <div class="proj-scroller load l4" data-drag-scroll>
      <div class="proj-track">
        ${projects.map((p)=>projectCard(p, true)).join("\n        ")}
      </div>
    </div>

    <div class="wrap">
      <div class="pp-list">
        ${projects.map((p)=>`<a class="pp-row" href="mailto:matas@mail.com?subject=Project%20enquiry%20${encodeURIComponent(p.title)}">
          <span class="pp-row-n">${p.n}</span>
          <span class="pp-row-title">${p.title}</span>
          <span class="pp-row-cat">${p.cat}</span>
          <span class="pp-row-year">${p.year}</span>
          <span class="pp-row-status">${p.status}</span>
        </a>`).join("\n        ")}
      </div>
    </div>
  </section>
</main>
${footer()}
<script src="script.js?v=${VER}"></script>
</body></html>`;

fs.writeFileSync(path.join(__dirname, "index.html"), indexHTML);
fs.writeFileSync(path.join(__dirname, "art.html"), artHTML);
if (SHOW_PROJECTS) {
  fs.writeFileSync(path.join(__dirname, "projects.html"), projectsHTML);
} else {
  try { fs.unlinkSync(path.join(__dirname, "projects.html")); } catch (e) {}
}
try { fs.unlinkSync(path.join(__dirname, "jewelry.html")); } catch (e) {}
console.log("Wrote index.html, art.html" + (SHOW_PROJECTS ? " and projects.html" : " (projects hidden)"));
