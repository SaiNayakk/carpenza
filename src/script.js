// Portfolio photos: assets/work/photos.json is written by scripts/media.py
// from the raw photos, with a small (-s) and full (-l) webp of each.
const LABELS = { kitchen: "Modular Kitchen", wardrobe: "Wardrobe", living: "Living & TV", ceiling: "False Ceiling", bedroom: "Bedroom & Study", office: "Office" };
const FIRST = 15; // shown before "Show all projects" in the All view
let projects = [];

const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];

/* ---------- Background photos ---------- */
// url() inside a custom property resolves against the stylesheet that uses it
// (assets/), not the page, so make the inline --img paths absolute first.
$$("[style*='--img']").forEach(el => {
  const m = el.style.getPropertyValue("--img").match(/url\(['"]?([^'")]+)['"]?\)/);
  if (m) el.style.setProperty("--img", `url("${new URL(m[1], location.href).href}")`);
});

/* ---------- Loader ---------- */
document.body.classList.add("is-loading");
window.addEventListener("load", () => {
  setTimeout(() => {
    $("#loader").classList.add("is-done");
    document.body.classList.remove("is-loading");
    document.body.classList.add("is-ready");
  }, 900);
});
// Never trap visitors behind the loader if an image is slow
setTimeout(() => {
  $("#loader").classList.add("is-done");
  document.body.classList.remove("is-loading");
  document.body.classList.add("is-ready");
}, 3500);

$("#year").textContent = new Date().getFullYear();

/* ---------- Nav ---------- */
const nav = $("#nav");
const onScroll = () => nav.classList.toggle("is-scrolled", window.scrollY > 40);
window.addEventListener("scroll", onScroll, { passive: true });
onScroll();

const toggle = $("#navToggle");
const links = $("#navLinks");
toggle.addEventListener("click", () => {
  const open = toggle.getAttribute("aria-expanded") !== "true";
  toggle.setAttribute("aria-expanded", open);
  links.classList.toggle("is-open", open);
  document.body.style.overflow = open ? "hidden" : "";
});
$$("a", links).forEach(a => a.addEventListener("click", () => {
  toggle.setAttribute("aria-expanded", "false");
  links.classList.remove("is-open");
  document.body.style.overflow = "";
}));

/* ---------- Hero slideshow ---------- */
const slides = $$(".hero__slide");
const dots = $$("#heroDots button");
let current = 0, timer;
const show = i => {
  slides[current].classList.remove("is-active");
  dots[current].classList.remove("is-active");
  current = (i + slides.length) % slides.length;
  slides[current].classList.add("is-active");
  void dots[current].offsetWidth; // restart progress animation
  dots[current].classList.add("is-active");
};
const play = () => { clearInterval(timer); timer = setInterval(() => show(current + 1), 6000); };
dots.forEach((d, i) => d.addEventListener("click", () => { show(i); play(); }));
play();

/* ---------- Scroll reveal ---------- */
const io = new IntersectionObserver(entries => {
  entries.forEach(e => {
    if (e.isIntersecting) { e.target.classList.add("is-in"); io.unobserve(e.target); }
  });
}, { threshold: 0.12, rootMargin: "0px 0px -40px 0px" });
const observeReveals = root => $$(".reveal:not(.is-in)", root).forEach((el, i) => {
  el.style.transitionDelay = `${Math.min(i % 4, 3) * 90}ms`;
  io.observe(el);
});

/* ---------- Portfolio ---------- */
const grid = $("#grid");
const moreBtn = $("#moreBtn");
let showAll = false, filter = "all";
const img = (p, size) => `assets/work/${p.slug}-${size}.webp`;
const applyFilter = () => {
  let n = 0;
  $$(".card", grid).forEach(c => {
    const match = filter === "all" || c.dataset.cat === filter;
    const shown = match && (filter !== "all" || showAll || n < FIRST);
    if (match) n++;
    c.classList.toggle("is-hidden", !shown);
  });
  moreBtn.hidden = filter !== "all" || showAll;
  observeReveals(grid);
};
fetch("assets/work/photos.json").then(r => r.json()).then(list => {
  projects = list;
  grid.innerHTML = projects.map((p, i) => `
  <figure class="card reveal" data-cat="${p.cat}" data-i="${i}" tabindex="0" role="button" aria-label="Open ${p.title}" style="aspect-ratio:${p.w}/${p.h}">
    <img src="${img(p, "s")}" srcset="${img(p, "s")} ${Math.round(p.w / 2)}w, ${img(p, "l")} ${p.w}w" sizes="(max-width: 600px) 50vw, (max-width: 1080px) 33vw, 25vw" width="${p.w}" height="${p.h}" alt="${p.title}" loading="lazy">
    <figcaption class="card__cap"><small>${LABELS[p.cat]}</small><h4>${p.title}</h4></figcaption>
  </figure>`).join("");
  moreBtn.textContent = `Show all ${projects.length} projects`;
  applyFilter();
});
observeReveals(document);

$$("#filters button").forEach(btn => btn.addEventListener("click", () => {
  $$("#filters button").forEach(b => b.classList.toggle("is-active", b === btn));
  filter = btn.dataset.filter;
  applyFilter();
}));
moreBtn.addEventListener("click", () => { showAll = true; applyFilter(); });

/* ---------- Lightbox ---------- */
const lb = $("#lightbox"), lbImg = $("#lbImg"), lbCap = $("#lbCap");
let lbIndex = 0;
const visible = () => $$(".card:not(.is-hidden)", grid).map(c => +c.dataset.i);
const openLb = i => {
  lbIndex = i;
  const p = projects[i];
  lbImg.src = img(p, "l");
  lbImg.alt = p.title;
  lbCap.textContent = `${p.title} · ${LABELS[p.cat]}`;
  lb.hidden = false;
  document.body.style.overflow = "hidden";
};
const closeLb = () => { lb.hidden = true; document.body.style.overflow = ""; };
const step = d => {
  const v = visible();
  openLb(v[(v.indexOf(lbIndex) + d + v.length) % v.length]);
};
grid.addEventListener("click", e => { const c = e.target.closest(".card"); if (c) openLb(+c.dataset.i); });
grid.addEventListener("keydown", e => {
  const c = e.target.closest(".card");
  if (c && (e.key === "Enter" || e.key === " ")) { e.preventDefault(); openLb(+c.dataset.i); }
});
$("#lbClose").addEventListener("click", closeLb);
$("#lbPrev").addEventListener("click", () => step(-1));
$("#lbNext").addEventListener("click", () => step(1));
lb.addEventListener("click", e => { if (e.target === lb) closeLb(); });
document.addEventListener("keydown", e => {
  if (lb.hidden) return;
  if (e.key === "Escape") closeLb();
  if (e.key === "ArrowLeft") step(-1);
  if (e.key === "ArrowRight") step(1);
});

/* ---------- Walkthrough videos: play only while on screen ---------- */
const vio = new IntersectionObserver(entries => entries.forEach(e => {
  if (e.isIntersecting) e.target.play().catch(() => {});
  else e.target.pause();
}), { threshold: 0.4 });
$$(".walk__clip video").forEach(v => vio.observe(v));

/* ---------- Parallax band ---------- */
const bandBg = $(".band__bg");
const parallax = () => {
  const r = bandBg.parentElement.getBoundingClientRect();
  if (r.bottom < 0 || r.top > innerHeight) return;
  const p = (r.top + r.height / 2 - innerHeight / 2) / innerHeight;
  bandBg.style.transform = `translateY(${p * -60}px)`;
};
window.addEventListener("scroll", parallax, { passive: true });
parallax();

/* ---------- Cursor ---------- */
const cursor = $("#cursor");
if (matchMedia("(hover: hover) and (pointer: fine)").matches) {
  let x = 0, y = 0, cx = 0, cy = 0;
  addEventListener("mousemove", e => { x = e.clientX; y = e.clientY; cursor.classList.add("is-on"); });
  document.addEventListener("mouseleave", () => cursor.classList.remove("is-on"));
  (function loop() {
    cx += (x - cx) * 0.18; cy += (y - cy) * 0.18;
    cursor.style.transform = `translate(${cx}px, ${cy}px)`;
    requestAnimationFrame(loop);
  })();
  document.addEventListener("mouseover", e => {
    cursor.classList.toggle("is-hover", !!e.target.closest("a, button, .card, .service, video"));
  });
}

/* ---------- Quote form ---------- */
const form = $("#quoteForm");
form.addEventListener("submit", e => {
  e.preventDefault();
  const d = Object.fromEntries(new FormData(form));
  let ok = true;
  ["name", "phone", "service"].forEach(k => {
    const bad = !String(d[k] || "").trim();
    form.elements[k].closest(".field").classList.toggle("is-invalid", bad);
    if (bad) ok = false;
  });
  const msg = $("#formMsg");
  if (!ok) { msg.textContent = "Please fill in your name, phone and the service you need."; return; }

  const text = `Hi Carpenza Interiors, I'd like a quote.\n\nName: ${d.name}\nPhone: ${d.phone}\nService: ${d.service}${d.message ? `\nDetails: ${d.message}` : ""}`;
  window.open(`https://wa.me/918722304278?text=${encodeURIComponent(text)}`, "_blank", "noopener");
  msg.textContent = "Thank you! Your message is ready to send. We'll get back to you shortly.";
});
