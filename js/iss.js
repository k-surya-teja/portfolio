import * as THREE from "three";

// A small procedural International Space Station that orbits the home Earth.
// Layout follows the real station: a long truss with four solar array pairs at the ends,
// white radiators near the middle, and a string of pressurised modules running along the
// direction of travel (the truss sits across it). Built at ~1 unit across, then scaled.

function arrayTexture() {
  const c = document.createElement("canvas");
  c.width = 64;
  c.height = 256;
  const g = c.getContext("2d");
  g.fillStyle = "#6b4520";
  g.fillRect(0, 0, 64, 256);
  // Cell grid with a slight per-cell tint, like the real copper-gold arrays
  for (let y = 0; y < 256; y += 8) {
    for (let x = 0; x < 64; x += 16) {
      const k = 0.85 + Math.random() * 0.3;
      g.fillStyle = `rgb(${Math.round(150 * k)}, ${Math.round(98 * k)}, ${Math.round(45 * k)})`;
      g.fillRect(x + 1, y + 1, 14, 6);
    }
  }
  g.fillStyle = "#2a1c10";
  g.fillRect(30, 0, 4, 256); // the mast running down the middle of each wing
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

function buildStation(envMap) {
  const root = new THREE.Group();
  const metal = new THREE.MeshStandardMaterial({ color: 0x9a9890, roughness: 0.45, metalness: 0.7, envMap, envMapIntensity: 0.6 });
  const white = new THREE.MeshStandardMaterial({ color: 0xe8e4da, roughness: 0.55, metalness: 0.15, envMap, envMapIntensity: 0.4 });
  const solar = new THREE.MeshStandardMaterial({
    map: arrayTexture(),
    roughness: 0.3,
    metalness: 0.55,
    envMap,
    envMapIntensity: 0.9,
    side: THREE.DoubleSide,
  });

  const box = (w, h, d, mat, x = 0, y = 0, z = 0) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
    m.position.set(x, y, z);
    root.add(m);
    return m;
  };
  const tube = (r, len, mat, x, y, z, axis = "z") => {
    const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, len, 16), mat);
    m.position.set(x, y, z);
    if (axis === "z") m.rotation.x = Math.PI / 2;
    if (axis === "x") m.rotation.z = Math.PI / 2;
    root.add(m);
    return m;
  };

  // Integrated truss (across the direction of travel = x)
  box(1.0, 0.035, 0.035, metal);
  // Solar array pairs: two at each end, wings reaching fore and aft
  for (const x of [-0.46, -0.36, 0.36, 0.46]) {
    box(0.03, 0.03, 0.05, metal, x, 0, 0); // rotary joint
    for (const side of [-1, 1]) {
      const wing = new THREE.Mesh(new THREE.PlaneGeometry(0.075, 0.32), solar);
      wing.rotation.x = -Math.PI / 2;
      wing.position.set(x, 0, side * 0.19);
      root.add(wing);
    }
  }
  // Radiators: pale panels hanging off the truss either side of the centre
  for (const x of [-0.17, 0.17]) {
    const r = box(0.1, 0.004, 0.13, white, x, -0.08, 0);
    r.rotation.z = 0.3 * Math.sign(x);
  }
  // Pressurised modules along the direction of travel, with a couple of side modules
  tube(0.028, 0.46, white, 0, -0.045, 0.02);
  tube(0.022, 0.12, white, 0, -0.045, 0.31);
  tube(0.024, 0.14, white, 0.08, -0.045, -0.12, "x");
  tube(0.024, 0.14, white, -0.08, -0.045, -0.12, "x");
  tube(0.02, 0.1, white, 0, -0.1, 0.08, "y");
  return root;
}

export function createISS({ envMap, earthRadius }) {
  const station = buildStation(envMap);
  station.scale.setScalar(0.55);
  // Invisible, slightly larger hit area so the small station is easy to hover
  station.add(new THREE.Mesh(new THREE.SphereGeometry(0.62, 12, 8), new THREE.MeshBasicMaterial({ visible: false })));
  const group = new THREE.Group();
  group.add(station);

  // Orbit tuned for the hero camera: nearly face-on and tipped back, so the top half of every
  // lap arcs across the sky (passing behind the astronaut) and the bottom half is below the frame
  const R = earthRadius * 1.95;
  const u = new THREE.Vector3(1, 0.2, 0.15).normalize();
  const v = new THREE.Vector3(0, 0.85, -0.5).projectOnPlane(u).normalize();
  const PERIOD = 40; // seconds per lap (the real ISS takes ~92 minutes)
  const pos = new THREE.Vector3(), ahead = new THREE.Vector3(), normal = new THREE.Vector3().crossVectors(u, v);

  const at = (a, out) => out.copy(u).multiplyScalar(Math.cos(a) * R).addScaledVector(v, Math.sin(a) * R);

  return {
    group,
    station,
    update(t) {
      // Linger on the visible top half and hurry round the hidden bottom (like a slightly eccentric orbit)
      const phase = (t / PERIOD) * Math.PI * 2 + 0.2;
      const a = phase + 0.6 * Math.sin(phase - Math.PI * 1.5);
      at(a, pos);
      at(a + 0.01, ahead);
      station.position.copy(pos);
      // Modules point along the orbit; the truss stays level with the orbit plane
      station.up.copy(normal);
      station.lookAt(ahead);
    },
  };
}

// Trivia shown beside the station while it's hovered (or tapped on phones), one fact per visit
const SPACECRAFT_FACTS = [
  "Voyager 1, launched in 1977, is the farthest human-made object: more than 24 billion km from Earth.",
  "Parker Solar Probe is the fastest object ever built, reaching about 690,000 km/h as it skims the Sun.",
  "The ISS laps Earth about every 92 minutes, so its crew sees around 16 sunrises a day.",
  "Both Voyagers carry a Golden Record with sounds and images of Earth, including greetings in 55 languages.",
  "The Webb telescope's sunshield is about the size of a tennis court and keeps its mirror near −233 °C.",
  "New Horizons flew 9.5 years and nearly 5 billion km to take the first close-up photos of Pluto in 2015.",
  "Hubble has been orbiting Earth since 1990 and was repaired by astronauts on five servicing missions.",
  "The Apollo Guidance Computer that landed people on the Moon had about 4 KB of working memory.",
];

export function createSpacecraftTip() {
  const el = document.createElement("div");
  el.className = "craft-tip";
  el.setAttribute("role", "status");
  el.innerHTML = `<div class="craft-tip-head"><span class="trivia-dot"></span>NASA trivia</div><p></p>`;
  document.body.appendChild(el);
  const text = el.querySelector("p");
  let idx = 0, shown = false;
  return {
    get shown() {
      return shown;
    },
    show(x, y) {
      if (!shown) text.textContent = SPACECRAFT_FACTS[idx++ % SPACECRAFT_FACTS.length];
      shown = true;
      el.classList.add("show");
      // Sit above the station, flipping below it near the top of the screen and clamped to the sides
      const w = el.offsetWidth, h = el.offsetHeight;
      const left = Math.min(innerWidth - w - 12, Math.max(12, x - w / 2));
      const above = y - h - 28 > 70;
      el.style.transform = `translate(${left}px, ${above ? y - h - 28 : y + 28}px)`;
    },
    hide() {
      shown = false;
      el.classList.remove("show");
    },
  };
}
