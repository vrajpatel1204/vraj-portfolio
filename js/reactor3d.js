/* ============================================================
   Photoreal arc reactor — three.js (WebGL)
   Modelled on the real-life movie-prop reactors:
   black machined housing · 10 copper-wound coils alternating with
   frosted white-blue LED blocks · ring of lit vent holes ·
   chrome bezels · Fresnel-ringed lens under a glass dome.
   Falls back silently to the SVG reactor if WebGL/CDN fails.
   ============================================================ */
import * as THREE from "three";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";
import { OutputPass } from "three/addons/postprocessing/OutputPass.js";

const wrap = document.querySelector(".hero-reactor");
const canvas = document.getElementById("reactor3d");
const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;

try {
  if (!wrap || !canvas) throw new Error("no mount");
  init();
} catch (err) {
  console.warn("[reactor3d] falling back to SVG:", err);
  wrap?.classList.add("gl-failed");
}

function init() {
  /* ---------- renderer / scene / camera ---------- */
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: "high-performance" });
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 1.5));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 0.95;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x03060b);
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;

  const camera = new THREE.PerspectiveCamera(28, 1, 0.1, 50);
  camera.position.set(0, 0, 4.8);

  /* ---------- procedural textures ---------- */
  function copperTexture() {
    const c = document.createElement("canvas");
    c.width = 64; c.height = 256;
    const g = c.getContext("2d");
    const turns = 18, h = c.height / turns;
    for (let i = 0; i < turns; i++) {
      const y = i * h;
      const grad = g.createLinearGradient(0, y, 0, y + h);
      const j = 0.9 + Math.random() * 0.2; // per-wire tone variation
      grad.addColorStop(0, `rgb(${40 * j},16,5)`);
      grad.addColorStop(0.22, `rgb(${190 * j},96,40)`);
      grad.addColorStop(0.5, `rgb(${255 * Math.min(j, 1)},176,112)`);
      grad.addColorStop(0.78, `rgb(${170 * j},80,30)`);
      grad.addColorStop(1, `rgb(${30 * j},11,3)`);
      g.fillStyle = grad;
      g.fillRect(0, y, 64, h);
    }
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = 8;
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    return t;
  }

  function lensTexture() {
    const S = 512, cx = S / 2;
    const c = document.createElement("canvas");
    c.width = c.height = S;
    const g = c.getContext("2d");
    const rg = g.createRadialGradient(cx, cx, 0, cx, cx, cx);
    rg.addColorStop(0, "#f2fbff");
    rg.addColorStop(0.12, "#a8e0ff");
    rg.addColorStop(0.4, "#3f9cff");
    rg.addColorStop(0.78, "#0f4f9e");
    rg.addColorStop(1, "#051a35");
    g.fillStyle = rg;
    g.fillRect(0, 0, S, S);
    // Fresnel-style concentric grooves
    for (let r = 12, i = 0; r < cx; r += 8, i++) {
      g.beginPath();
      g.arc(cx, cx, r, 0, Math.PI * 2);
      g.lineWidth = i % 4 === 0 ? 2.4 : 1.1;
      g.strokeStyle = i % 2 ? "rgba(0,18,46,.5)" : "rgba(235,250,255,.32)";
      g.stroke();
    }
    // fine perforation mesh
    g.fillStyle = "rgba(2,26,56,.38)";
    for (let y = 0, row = 0; y < S; y += 11, row++) {
      for (let x = (row % 2) * 5.5; x < S; x += 11) {
        if (Math.hypot(x - cx, y - cx) < cx - 4) { g.beginPath(); g.arc(x, y, 2, 0, Math.PI * 2); g.fill(); }
      }
    }
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = 8;
    return t;
  }

  /* ---------- light budget (tuned to avoid blown-out highlights) ---------- */
  const LED_I = 1.6, SPILL_I = 0.14, DOT = [0.7, 1.1, 1.5], LENS_I = 1.0, GLOW_I = 0.9, FILL_I = 0.35;

  /* ---------- materials ---------- */
  const plastic = new THREE.MeshStandardMaterial({ color: 0x0b0d10, roughness: 0.42, metalness: 0.3, envMapIntensity: 0.55 });
  const chrome = new THREE.MeshStandardMaterial({ color: 0xd3dce2, roughness: 0.18, metalness: 1, envMapIntensity: 1.5 });
  const copperMap = copperTexture();
  const copper = new THREE.MeshStandardMaterial({
    map: copperMap, bumpMap: copperMap, bumpScale: 2.2,
    emissive: 0xffffff, emissiveMap: copperMap, emissiveIntensity: 0.3, // copper catches the LED light
    color: 0xffffff, roughness: 0.34, metalness: 0.85, envMapIntensity: 1.5,
  });
  const lensTex = lensTexture();
  const lensMat = new THREE.MeshBasicMaterial({ map: lensTex, color: new THREE.Color(LENS_I, LENS_I, LENS_I) });
  const glass = new THREE.MeshPhysicalMaterial({
    color: 0xaed8ff, transparent: true, opacity: 0.13, roughness: 0.03, metalness: 0,
    clearcoat: 1, clearcoatRoughness: 0.03, envMapIntensity: 2.2, depthWrite: false,
  });
  const dotMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(...DOT) });
  const pitMat = new THREE.MeshBasicMaterial({ color: 0x010203 });

  /* ---------- reactor body ---------- */
  const reactor = new THREE.Group();
  scene.add(reactor);

  // black machined housing (annulus with bevel)
  {
    const shape = new THREE.Shape();
    shape.absarc(0, 0, 1.0, 0, Math.PI * 2, false);
    const hole = new THREE.Path();
    hole.absarc(0, 0, 0.3, 0, Math.PI * 2, true);
    shape.holes.push(hole);
    const geo = new THREE.ExtrudeGeometry(shape, {
      depth: 0.16, bevelEnabled: true, bevelThickness: 0.016, bevelSize: 0.016, bevelSegments: 3, curveSegments: 128,
    });
    reactor.add(new THREE.Mesh(geo, plastic));
  }
  const TOP = 0.176; // housing front face

  // chrome rim + bezels
  const torus = (R, tube, z, mat = chrome) => {
    const m = new THREE.Mesh(new THREE.TorusGeometry(R, tube, 20, 160), mat);
    m.position.z = z;
    reactor.add(m);
    return m;
  };
  torus(0.99, 0.016, 0.09);
  torus(0.315, 0.022, TOP);
  torus(0.64, 0.01, TOP + 0.002);

  // 10 copper-wound coils alternating with 10 frosted LED blocks
  const N = 10, R = 0.8;
  const leds = [], spills = [];
  for (let i = 0; i < N; i++) {
    const th = (i / N) * Math.PI * 2;

    // coil (local +y = radial)
    const coil = new THREE.Group();
    coil.position.set(Math.cos(th) * R, Math.sin(th) * R, TOP + 0.13);
    coil.rotation.z = th - Math.PI / 2;
    const wound = new THREE.Mesh(new THREE.BoxGeometry(0.175, 0.22, 0.24), copper);
    // each coil gets its own UV scale so wire density stays consistent
    wound.material = copper;
    const flangeGeo = new THREE.BoxGeometry(0.21, 0.032, 0.285);
    const f1 = new THREE.Mesh(flangeGeo, plastic); f1.position.y = 0.126;
    const f2 = new THREE.Mesh(flangeGeo, plastic); f2.position.y = -0.126;
    coil.add(wound, f1, f2);
    reactor.add(coil);

    // LED block between coils
    const ta = th + Math.PI / N;
    const mat = new THREE.MeshStandardMaterial({
      color: 0x3f8fe0, emissive: 0x58b4ff, emissiveIntensity: LED_I, roughness: 0.5, metalness: 0,
    });
    const led = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.24, 0.2), mat);
    led.position.set(Math.cos(ta) * R, Math.sin(ta) * R, TOP + 0.1);
    led.rotation.z = ta - Math.PI / 2;
    reactor.add(led);
    leds.push(mat);

    // light spill from each LED onto the copper + housing
    if (innerWidth > 700) { // skip the 10 extra lights on phones
      const spill = new THREE.PointLight(0x58b0ff, SPILL_I, 0.95, 2);
      spill.position.set(Math.cos(ta) * (R - 0.02), Math.sin(ta) * (R - 0.02), TOP + 0.3);
      reactor.add(spill);
      spills.push(spill);
    }
  }

  // ring of lit vent holes
  {
    const M = 40, r = 0.495;
    const pits = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.027, 0.027, 0.006, 20), pitMat, M);
    const dots = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.017, 0.017, 0.012, 16), dotMat, M);
    const o = new THREE.Object3D();
    for (let i = 0; i < M; i++) {
      const a = (i / M) * Math.PI * 2;
      o.rotation.set(Math.PI / 2, 0, 0);
      o.position.set(Math.cos(a) * r, Math.sin(a) * r, TOP + 0.003);
      o.updateMatrix(); pits.setMatrixAt(i, o.matrix);
      o.position.z = TOP + 0.01;
      o.updateMatrix(); dots.setMatrixAt(i, o.matrix);
    }
    reactor.add(pits, dots);

    // small black retaining clips (as on the real prop)
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
      const clip = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.1, 0.05), plastic);
      clip.position.set(Math.cos(a) * 0.575, Math.sin(a) * 0.575, TOP + 0.025);
      clip.rotation.z = a - Math.PI / 2;
      reactor.add(clip);
    }
  }

  // lens, inner rings, glass dome
  const lens = new THREE.Mesh(new THREE.CircleGeometry(0.3, 96), lensMat);
  lens.position.z = 0.05;
  reactor.add(lens);
  torus(0.235, 0.007, 0.09);
  torus(0.15, 0.007, 0.09);
  {
    const geo = new THREE.SphereGeometry(0.3, 64, 24, 0, Math.PI * 2, 0, Math.PI / 2);
    geo.rotateX(Math.PI / 2);
    const dome = new THREE.Mesh(geo, glass);
    dome.scale.z = 0.38;
    dome.position.z = 0.1;
    reactor.add(dome);
  }

  /* ---------- lights ---------- */
  const key = new THREE.DirectionalLight(0xffd7ad, 0.9);
  key.position.set(-3, 3, 4);
  const rim = new THREE.DirectionalLight(0x6db8ff, 1.4);
  rim.position.set(3, 1.5, -2);
  const glow = new THREE.PointLight(0x62bcff, GLOW_I, 2.4, 2);
  glow.position.set(0, 0, 0.7);
  const fill = new THREE.PointLight(0x4aa8ff, FILL_I, 2.4, 2);
  fill.position.set(0, 0, 0.35);
  scene.add(key, rim, glow, fill);

  /* ---------- post-processing ---------- */
  const composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));
  const bloom = new UnrealBloomPass(new THREE.Vector2(512, 512), 0.3, 0.5, 0.92);
  composer.addPass(bloom);
  composer.addPass(new OutputPass());

  function resize() {
    const s = Math.max(200, Math.round(wrap.clientWidth));
    renderer.setSize(s, s, false);
    composer.setPixelRatio(renderer.getPixelRatio());
    composer.setSize(s, s);
    bloom.resolution.set(s, s);
  }
  resize();
  new ResizeObserver(resize).observe(wrap);

  /* ---------- interaction ---------- */
  let tx = 0, ty = 0, rx = 0, ry = 0;
  if (!reduce) {
    addEventListener("pointermove", (e) => {
      tx = (e.clientX / innerWidth - 0.5) * 2;
      ty = (e.clientY / innerHeight - 0.5) * 2;
    }, { passive: true });
  }

  /* ---------- power-on curve (matches the SVG fallback) ---------- */
  const POWER = [[0, 0], [0.04, 0.9], [0.1, 0.15], [0.22, 1], [0.3, 0.35], [0.46, 1], [0.54, 0.6], [0.66, 1], [1, 1]];
  const powerAt = (u) => {
    if (u >= 1) return 1;
    for (let i = 1; i < POWER.length; i++) {
      if (u <= POWER[i][0]) {
        const [u0, v0] = POWER[i - 1], [u1, v1] = POWER[i];
        return v0 + ((u - u0) / (u1 - u0)) * (v1 - v0);
      }
    }
    return 1;
  };

  /* ---------- loop ---------- */
  let visible = true, shown = false;
  new IntersectionObserver(([e]) => { visible = e.isIntersecting; }).observe(wrap);
  const t0 = performance.now();

  renderer.setAnimationLoop(() => {
    if (!visible || document.hidden) return;
    const t = performance.now() - t0;

    // shared irregular flicker from main.js (0.74–1.0), times power-on
    const lvl = (window.__reactorLevel ?? 1) * (reduce ? 1 : powerAt(t / 2200));

    leds.forEach((m, i) => {
      const n = 0.975 + 0.025 * Math.sin(t * 0.011 * (i + 3) + i * 1.7);
      m.emissiveIntensity = LED_I * lvl * n;
      if (spills[i]) spills[i].intensity = SPILL_I * lvl * n;
    });
    const dl = 0.5 + 0.5 * lvl;
    dotMat.color.setRGB(DOT[0] * dl, DOT[1] * dl, DOT[2] * dl);
    const lv = LENS_I * (0.55 + 0.45 * lvl);
    lensMat.color.setRGB(lv, lv, lv);
    glow.intensity = GLOW_I * lvl;
    fill.intensity = FILL_I * lvl;
    bloom.strength = 0.16 + 0.14 * lvl;

    // gentle idle drift + mouse parallax, viewed at a 3/4 angle like the product shots
    rx += ((0.22 + ty * 0.22 + Math.sin(t / 3400) * 0.03) - rx) * 0.06;
    ry += ((-0.46 + tx * 0.3 + Math.cos(t / 4100) * 0.03) - ry) * 0.06;
    reactor.rotation.set(rx, ry, 0);

    composer.render();
    if (!shown) { shown = true; wrap.classList.add("gl-ready"); }
  });
}
