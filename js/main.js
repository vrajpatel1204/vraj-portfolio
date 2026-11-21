(() => {
  "use strict";

  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const finePointer = matchMedia("(hover: hover) and (pointer: fine)").matches;

  /* ---------- Arc reactor (prop-accurate) ----------
     Outer → inner, as on the real movie-prop reactor:
     dark machined housing · 10 glowing coil panels capped with copper blocks ·
     ring of small vent lights · concentric metal/light rings · perforated mesh disc.
     Built procedurally; brightness flickers irregularly (see flicker()). */
  function buildReactor(svg) {
    const C = 200;
    const rad = (d) => (d * Math.PI) / 180;
    const P = (r, a) => [C + r * Math.cos(a), C + r * Math.sin(a)].map((n) => n.toFixed(2));
    const sector = (r1, r2, a1, a2) => {
      const [ax, ay] = P(r2, a1), [bx, by] = P(r2, a2), [cx, cy] = P(r1, a2), [dx, dy] = P(r1, a1);
      return `M${ax} ${ay}A${r2} ${r2} 0 0 1 ${bx} ${by}L${cx} ${cy}A${r1} ${r1} 0 0 0 ${dx} ${dy}Z`;
    };

    const N = 10, STEP = 360 / N;
    let panels = "", copper = "", stripes = "", dots = "", holes = "", screws = "";

    for (let i = 0; i < N; i++) {
      const mid = rad(i * STEP - 90);
      // glowing coil panel
      panels += `<path d="${sector(120, 176, mid - rad(15.5), mid + rad(15.5))}"/>`;
      // copper cap block at outer end
      copper += `<path d="${sector(150, 178, mid - rad(8.5), mid + rad(8.5))}"/>`;
      for (let k = 1; k < 5; k++) {
        const r = 150 + k * 5.6;
        const [ax, ay] = P(r, mid - rad(8.5)), [bx, by] = P(r, mid + rad(8.5));
        stripes += `M${ax} ${ay}A${r} ${r} 0 0 1 ${bx} ${by}`;
      }
      const [sx, sy] = P(189, mid + rad(STEP / 2));
      screws += `<circle cx="${sx}" cy="${sy}" r="3.2" fill="url(#screw)" stroke="#010508" stroke-width=".8"/>`;
    }
    for (let i = 0; i < 40; i++) {
      const [x, y] = P(100, rad(i * 9));
      holes += `<circle cx="${x}" cy="${y}" r="4.9"/>`;
      dots += `<circle cx="${x}" cy="${y}" r="3.1"/>`;
    }

    svg.innerHTML = `
      <defs>
        <linearGradient id="metal" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stop-color="#58707e"/><stop offset=".5" stop-color="#16232c"/><stop offset="1" stop-color="#3a515f"/>
        </linearGradient>
        <radialGradient id="screw" cx=".35" cy=".35" r=".8"><stop offset="0" stop-color="#b8d0dc"/><stop offset="1" stop-color="#26404d"/></radialGradient>
        <radialGradient id="panel" cx="200" cy="200" r="176" gradientUnits="userSpaceOnUse">
          <stop offset=".66" stop-color="#cdf4ff"/><stop offset=".82" stop-color="#63ccff"/><stop offset="1" stop-color="#2a82e6"/>
        </radialGradient>
        <radialGradient id="cu" cx="200" cy="200" r="178" gradientUnits="userSpaceOnUse">
          <stop offset=".82" stop-color="#e0773a"/><stop offset=".92" stop-color="#b8531f"/><stop offset="1" stop-color="#5a2410"/>
        </radialGradient>
        <radialGradient id="disc" cx=".5" cy=".5" r=".5">
          <stop offset="0" stop-color="#f4feff"/><stop offset=".35" stop-color="#9fe6ff" stop-opacity=".85"/><stop offset="1" stop-color="#1b5f8c" stop-opacity=".15"/>
        </radialGradient>
        <radialGradient id="vignette" cx=".5" cy=".5" r=".5">
          <stop offset=".72" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".55"/>
        </radialGradient>
        <pattern id="mesh" width="8" height="14" patternUnits="userSpaceOnUse">
          <circle cx="4" cy="3.5" r="1.45" fill="#0b2a3c"/><circle cx="0" cy="10.5" r="1.45" fill="#0b2a3c"/><circle cx="8" cy="10.5" r="1.45" fill="#0b2a3c"/>
        </pattern>
        <clipPath id="discClip"><circle cx="200" cy="200" r="60"/></clipPath>
        <filter id="g3" x="-40%" y="-40%" width="180%" height="180%"><feGaussianBlur stdDeviation="3" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
        <filter id="g7" x="-60%" y="-60%" width="220%" height="220%"><feGaussianBlur stdDeviation="7" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
        <filter id="bloom" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="12"/></filter>
      </defs>

      <!-- machined housing -->
      <circle cx="200" cy="200" r="199" fill="url(#metal)"/>
      <circle cx="200" cy="200" r="196.5" fill="none" stroke="#a8c2cf" stroke-opacity=".3"/>
      <circle cx="200" cy="200" r="183" fill="#0f1b23" stroke="#03080c" stroke-width="2.5"/>
      ${screws}
      <circle cx="200" cy="200" r="179" fill="#02070b"/>

      <g class="lit">
        <!-- layer 1: coil panels + outer glow (flickers) -->
        <g id="fl1">
          <g fill="url(#panel)" opacity=".55" filter="url(#bloom)">${panels}</g>
          <g fill="url(#panel)" stroke="#0a3b5e" stroke-width="1.2" stroke-linejoin="round" filter="url(#g3)">${panels}</g>
        </g>

        <!-- copper cap blocks (lit faintly by the panels, so they barely flicker) -->
        <g fill="url(#cu)" stroke="#1a0a04" stroke-width="1.3" stroke-linejoin="round">${copper}</g>
        <path d="${stripes}" stroke="#2a0f05" stroke-opacity=".55" stroke-width="1.1" fill="none"/>

        <!-- inner housing -->
        <circle cx="200" cy="200" r="112" fill="#050d14" stroke="#4b6573" stroke-width="5"/>
        <circle cx="200" cy="200" r="115.5" fill="none" stroke="#a9c3d0" stroke-opacity=".3"/>
        <g fill="#01060a">${holes}</g>

        <!-- layer 2: vent lights, light rings, mesh disc (flickers on its own) -->
        <g id="fl2">
          <g fill="#dffaff" filter="url(#g3)">${dots}</g>
          <circle cx="200" cy="200" r="88" fill="none" stroke="#5ac8ff" stroke-opacity=".55" stroke-width="12" filter="url(#g7)"/>
          <circle cx="200" cy="200" r="88" fill="none" stroke="#e6fbff" stroke-width="3" filter="url(#g3)"/>
          <circle cx="200" cy="200" r="80" fill="none" stroke="#03090e" stroke-width="6"/>
          <circle cx="200" cy="200" r="74" fill="none" stroke="#bfeaff" stroke-width="2.4" filter="url(#g3)"/>
          <circle cx="200" cy="200" r="68" fill="#061622" stroke="#2a4a5c" stroke-width="2"/>
          <g clip-path="url(#discClip)">
            <circle cx="200" cy="200" r="60" fill="url(#disc)"/>
            <rect x="140" y="140" width="120" height="120" fill="url(#mesh)"/>
          </g>
          <circle cx="200" cy="200" r="46" fill="none" stroke="#f2fdff" stroke-width="2.6" filter="url(#g3)"/>
          <circle cx="200" cy="200" r="24" fill="#fff" fill-opacity=".85" filter="url(#g7)"/>
        </g>
      </g>
      <circle cx="200" cy="200" r="199" fill="url(#vignette)" pointer-events="none"/>`;
  }

  const reactor = $("#reactor");
  buildReactor(reactor);

  /* ---------- Reactor flicker ----------
     Irregular, subtle — like a real LED/plasma source on a slightly
     unstable supply. Mostly 0.93–1.0, occasional quick dips. */
  (function flicker() {
    const fl1 = $("#fl1"), fl2 = $("#fl2"), halo = $(".reactor-halo");
    window.__reactorLevel = 1; // shared with reactor3d.js
    if (!fl1 || reduce) return;
    let level = 1, target = 1;
    function pick() {
      const r = Math.random();
      target = r < 0.07 ? 0.74 + Math.random() * 0.1      // quick dip
             : r < 0.3  ? 0.9 + Math.random() * 0.06      // soft waver
             : 0.97 + Math.random() * 0.03;               // steady
      setTimeout(pick, r < 0.07 ? 45 + Math.random() * 70 : 70 + Math.random() * 260);
    }
    setTimeout(pick, 2400); // after power-on
    (function loop() {
      level += (target - level) * 0.35;
      window.__reactorLevel = level;
      fl1.style.opacity = level.toFixed(3);
      fl2.style.opacity = (0.5 * level + 0.5 * (0.96 + Math.random() * 0.04)).toFixed(3);
      if (halo) halo.style.opacity = (0.55 + 0.45 * level).toFixed(3);
      requestAnimationFrame(loop);
    })();
  })();

  // Safety net: if the 3D reactor still isn't up after 15s (slow/blocked CDN), show the SVG one.
  setTimeout(() => {
    const w = $(".hero-reactor");
    if (w && !w.classList.contains("gl-ready")) w.classList.add("gl-failed");
  }, 15000);

  /* ---------- Hero reveal ---------- */
  $$(".hero .reveal").forEach((el, i) => {
    el.style.setProperty("--d", `${0.1 + i * 0.12}s`);
    setTimeout(() => el.classList.add("in"), 40);
  });

  /* ---------- Scroll reveal ---------- */
  const heroEls = new Set($$(".hero .reveal"));
  const io = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (!e.isIntersecting) return;
      e.target.classList.add("in");
      io.unobserve(e.target);
    });
  }, { threshold: 0.12, rootMargin: "0px 0px -5% 0px" });

  $$(".reveal").forEach((el) => {
    if (heroEls.has(el)) return;
    const sibs = [...el.parentElement.children].filter((n) => n.classList.contains("reveal"));
    el.style.setProperty("--d", `${Math.max(0, sibs.indexOf(el)) * 0.08}s`);
    io.observe(el);
  });

  /* ---------- Photo lightbox ---------- */
  const lb = $("#lightbox");
  if (lb) {
    const lbImg = $("img", lb);
    $$(".shot").forEach((btn) => btn.addEventListener("click", () => {
      const img = $("img", btn);
      lbImg.src = img.currentSrc || img.src;
      lbImg.alt = img.alt;
      lb.classList.add("open");
    }));
    const close = () => lb.classList.remove("open");
    lb.addEventListener("click", close);
    addEventListener("keydown", (e) => { if (e.key === "Escape") close(); });
  }

  /* ---------- Nav ---------- */
  const nav = $("#nav");
  const onScroll = () => nav.classList.toggle("scrolled", scrollY > 20);
  addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  /* ---------- Pointer effects (desktop) ---------- */
  if (finePointer && !reduce) {
    const glow = $("#cursorGlow");
    let gx = innerWidth / 2, gy = innerHeight / 3, tx = gx, ty = gy;
    addEventListener("pointermove", (e) => {
      tx = e.clientX; ty = e.clientY;
      const x = (e.clientX / innerWidth - 0.5) * 2, y = (e.clientY / innerHeight - 0.5) * 2;
      reactor.style.transform = `perspective(1000px) rotateY(${x * 8}deg) rotateX(${-y * 8}deg)`;
    }, { passive: true });
    (function loop() {
      gx += (tx - gx) * 0.12; gy += (ty - gy) * 0.12;
      glow.style.transform = `translate(${gx}px, ${gy}px)`;
      requestAnimationFrame(loop);
    })();

    $$(".tilt").forEach((card) => {
      card.addEventListener("pointermove", (e) => {
        const r = card.getBoundingClientRect();
        const px = (e.clientX - r.left) / r.width, py = (e.clientY - r.top) / r.height;
        card.style.setProperty("--mx", `${px * 100}%`);
        card.style.setProperty("--my", `${py * 100}%`);
        card.style.setProperty("--ry", `${(px - 0.5) * 4}deg`);
        card.style.setProperty("--rx", `${-(py - 0.5) * 4}deg`);
      });
      card.addEventListener("pointerleave", () => {
        card.style.setProperty("--rx", "0deg");
        card.style.setProperty("--ry", "0deg");
      });
    });
  }

  /* ---------- Embers ---------- */
  const canvas = $("#embers");
  if (canvas && !reduce) {
    const ctx = canvas.getContext("2d");
    let w, h, parts = [], running = true;
    const make = (initial) => ({
      x: Math.random() * w, y: initial ? Math.random() * h : h + 10,
      r: Math.random() * 1.5 + 0.4, vy: Math.random() * 0.35 + 0.1, vx: (Math.random() - 0.5) * 0.15,
      a: Math.random() * 0.5 + 0.15, gold: Math.random() < 0.12, ph: Math.random() * 6.28,
    });
    function resize() {
      const dpr = Math.min(devicePixelRatio || 1, 2);
      w = innerWidth; h = innerHeight;
      canvas.width = w * dpr; canvas.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      parts = Array.from({ length: Math.min(60, Math.floor(w / 22)) }, () => make(true));
    }
    resize();
    addEventListener("resize", resize);
    document.addEventListener("visibilitychange", () => { running = !document.hidden; if (running) requestAnimationFrame(draw); });
    function draw(t = 0) {
      if (!running) return;
      ctx.clearRect(0, 0, w, h);
      for (const p of parts) {
        p.y -= p.vy; p.x += p.vx + Math.sin(t / 1800 + p.ph) * 0.15;
        if (p.y < -10) Object.assign(p, make(false));
        const a = p.a * (0.6 + 0.4 * Math.sin(t / 700 + p.ph));
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, 6.2832);
        ctx.fillStyle = p.gold ? `rgba(255,180,84,${a})` : `rgba(77,232,255,${a})`;
        ctx.shadowBlur = 8;
        ctx.shadowColor = p.gold ? "#ffb454" : "#4de8ff";
        ctx.fill();
      }
      requestAnimationFrame(draw);
    }
    requestAnimationFrame(draw);
  }
})();
