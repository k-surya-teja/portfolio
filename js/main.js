import * as THREE from "three";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";
import { OutputPass } from "three/addons/postprocessing/OutputPass.js";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import { Astronaut, createFlag, createDustPuff, createExhaustTrail } from "./astronaut.js";
import { createHologram } from "./hologram.js";
import { createMoon, createEarth, createMars, createJupiter, createSaturn, createNeptune, createPluto, createSun, loadDeferredTextures } from "./planets.js";
import { createStarfield, createMilkyWay, createAsteroids, createDust, createMeteors } from "./space.js";
import { createRocket } from "./rocket.js";
import { SpaceAudio } from "./audio.js";
import { renderContent } from "./content.js";
import { createTrivia } from "./trivia.js";
import { createSunMarker } from "./sunmarker.js";
import { createISS, createSpacecraftTip } from "./iss.js";
import { createPlanetCallout } from "./callout.js";

const data = await loadContent();
const V =(x, y, z) => new THREE.Vector3(x, y, z);
const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
let saturn;

renderContent(data, { onProjectFocus: (i) => saturn?.focus(i) });

const navLinks = [...document.querySelectorAll("[data-nav]")];
const hudSector = document.getElementById("hud-sector");
const hudDist = document.getElementById("hud-dist");
const hudClock = document.getElementById("hud-clock");
const bubble = document.getElementById("bubble");
const loader = document.getElementById("loader");
const audio = new SpaceAudio();
const trivia = createTrivia();

setupMenu();
setupSound();
setupLightMode();

// Let the browser paint the loader and the page text before the heavy 3D setup takes over the main thread
await new Promise((resolve) => requestAnimationFrame(() => setTimeout(resolve)));

try {
  init();
} catch (err) {
  console.error(err);
  document.body.classList.add("no-webgl");
  hideLoader();
}

// Content can live in a remote JSON file (data.js → contentUrl, e.g. a GitHub Gist) so edits go live
// without a redeploy. index.html starts that request early (window.remoteContent); data.js stays the
// fallback for any field the remote file lacks, or the whole thing if it's unset, slow or unreachable.
async function loadContent() {
  const local = window.PORTFOLIO;
  if (!window.remoteContent) return local;
  const giveUp = new Promise((resolve) => setTimeout(() => resolve(null), 2000));
  const remote = await Promise.race([window.remoteContent, giveUp]);
  if (!remote) console.warn("Remote content unavailable or slow, using data.js");
  return { ...local, ...remote };
}

function hideLoader() {
  loader.classList.add("done");
  setTimeout(() => loader.remove(), 900);
}

function setupMenu() {
  const menu = document.getElementById("nav-links");
  const btn = document.getElementById("menu-toggle");
  btn.addEventListener("click", () => btn.setAttribute("aria-expanded", menu.classList.toggle("open")));
  menu.addEventListener("click", (e) => {
    if (e.target.tagName === "A") {
      menu.classList.remove("open");
      btn.setAttribute("aria-expanded", "false");
    }
  });
}

function setupSound() {
  const btn = document.getElementById("sound-toggle");
  const hint = document.getElementById("sound-hint");
  const set = (on) => {
    btn.setAttribute("aria-pressed", on);
    btn.classList.toggle("on", on);
    try {
      localStorage.setItem("sound", on ? "on" : "off");
    } catch {}
  };
  // Sound is on by default; only an explicit mute is remembered across visits
  let saved = null;
  try {
    saved = localStorage.getItem("sound");
  } catch {}
  if (saved === "off") {
    set(false);
    btn.addEventListener("click", () => set(audio.toggle()));
    return;
  }

  // Try to start right away. Browsers usually block audio until the visitor clicks, taps or presses
  // a key (scrolling doesn't count); until then the button shows a "waiting" state instead of "on".
  audio.toggle(true);
  let waiting = true;
  const gestures = ["pointerdown", "mousedown", "click", "keydown", "touchend"];
  const started = () => {
    if (!waiting) return;
    waiting = false;
    gestures.forEach((g) => removeEventListener(g, resume, true));
    btn.classList.remove("waiting");
    hint.classList.remove("show");
    set(true);
  };
  const resume = (e) => {
    if (e.target.closest?.("#sound-toggle")) return; // the button's own click handles it
    audio.ctx.resume().then(started);
  };
  if (audio.ctx.state === "running") started();
  else {
    btn.classList.add("waiting");
    btn.setAttribute("aria-pressed", false);
    if (matchMedia("(pointer: coarse)").matches) hint.textContent = "🔊 Tap anywhere to turn on sound";
    hint.classList.add("show");
    gestures.forEach((g) => addEventListener(g, resume, true));
    audio.ctx.addEventListener("statechange", () => audio.ctx.state === "running" && started());
    // The hint is a nudge, not a banner: it fades after a while even if nobody clicks
    setTimeout(() => hint.classList.remove("show"), 14000);
  }

  btn.addEventListener("click", () => {
    // While waiting, the first click on the button starts the sound rather than muting it
    if (waiting) audio.ctx.resume().then(started);
    else set(audio.toggle());
  });
}

// There is no light mode: the button just gets a reply from the astronaut
function setupLightMode() {
  const btn = document.getElementById("theme-toggle");
  const note = document.getElementById("theme-note");
  const lines = [
    "Light mode? Out here the only light switch is the Sun, and it's 1 AU away ☀️",
    "Space is dark by design. I'm just keeping it authentic 🌌",
    "Turning the lights on would hide all the stars ✨",
    "Mission control says no: light attracts bugs, and I've fixed enough of those 🐛",
    "My eyes adjusted to the dark years ago. Yours will too 🔭",
  ];
  let idx = 0, timer;
  btn.addEventListener("click", () => {
    note.textContent = lines[idx++ % lines.length];
    note.classList.add("show");
    dispatchEvent(new Event("lightmode"));
    clearTimeout(timer);
    timer = setTimeout(() => note.classList.remove("show"), 3800);
  });
}

function init() {
  const canvas = document.getElementById("space");
  // Phones get a lower render resolution and lighter edge smoothing: their screens are dense enough
  // that it's hard to see, and it keeps scrolling smooth on mid-range GPUs
  const isSmall = innerWidth < 820;
  // No canvas antialiasing: everything is drawn through the composer, whose target is multisampled below
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: "high-performance" });
  renderer.setPixelRatio(Math.min(devicePixelRatio, isSmall ? 1.5 : 1.75));
  renderer.setSize(innerWidth, innerHeight);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.0;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x000000);
  const camera = new THREE.PerspectiveCamera(50, innerWidth / innerHeight, 0.1, 2000);
  const UP = V(0, 1, 0);
  // +1 while flying outward (scrolling down), -1 while flying back (scrolling up), eased between
  let heading = 1;
  scene.add(camera);

  // Lights: one hard white Sun, almost no ambient (space has no sky to bounce light),
  // a faint cool bounce from the sky, and a soft fill on the home scene.
  const SUN_DIR = V(1, 0.3, 0.8).normalize();
  scene.add(new THREE.AmbientLight(0xffffff, 0.08));
  const sun = new THREE.DirectionalLight(0xfff8ee, 3);
  sun.position.copy(SUN_DIR).multiplyScalar(50);
  const callout = createPlanetCallout();
  const sunGlow = createSun(SUN_DIR);
  scene.add(sun, sunGlow);
  const sunMarker = createSunMarker(sunGlow.position);
  const earthshine = new THREE.DirectionalLight(0x9db8e8, 0.7);
  earthshine.position.set(-4, 6, -10);
  scene.add(earthshine);
  const fill = new THREE.PointLight(0xffe6d2, 7, 10, 1.6);
  fill.position.set(2.4, 4.0, 3.0);
  scene.add(fill);

  // Backdrop
  const stars = createStarfield(isSmall ? 2500 : 5000);
  scene.add(stars.object, createMilkyWay());

    const hero = new THREE.Group();
  // Home is Earth: the astronaut starts here, with the Moon hanging in the sky behind
  const home = createEarth(1.5);
  hero.add(home.group);
  const moon = createMoon(3.2);
  moon.group.position.set(9, 12, -48);
  scene.add(moon.group);
  // Studio reflections for the gold visor and metal fittings; the planets stay lit by the Sun alone
  const envMap = new THREE.PMREMGenerator(renderer).fromScene(new RoomEnvironment(), 0.04).texture;
  const me = new Astronaut({ envMap });
  scene.add(me.root);
  // The ISS circles the home Earth; hovering (or tapping) it pauses the orbit and shows NASA trivia
  const iss = createISS({ envMap, earthRadius: 1.5 });
  hero.add(iss.group);
  const craftTip = createSpacecraftTip();
  let issT = 0, issPinnedUntil = 0;
  const issScreen = new THREE.Vector3();
  // True only when the station is the nearest thing under the ray, not hidden behind the astronaut or Earth
  const isOnTop = (obj) => {
    const hit = raycaster.intersectObjects([iss.station, me.root, home.group], true)[0];
    for (let o = hit?.object; o; o = o.parent) if (o === obj) return true;
    return false;
  };
  const holo = createHologram([
    `const ${(data.nickname || data.name.split(" ")[0]).toLowerCase()} = {`,
    `  role: "${data.role.split(" · ")[0]}",`,
    `  solves: "problems",`,
    `  stack: ["Angular", "Ionic", "Next.js"],`,
    `  loves: "space",`,
    `  shipping: true,`,
    `};`,
  ]);
  holo.mesh.position.set(-1.75, 3.55, -0.5);
  hero.add(holo.mesh);
  scene.add(hero);

  // One planet per section, travelling outward from the Moon. `au` is the real distance from the Sun.
  saturn = createSaturn(6.5, data.projects.length);
  const stops = [
    { name: "EARTH · HOME", au: 1.0, pos: V(0, 0, 0), r: 1.5 },
    // `aim` (default 1.35) sets how far the desktop camera aims beside the planet: lower sits it further
    // from the screen edge. Mars is framed closest, so it needs the room for its right-side flag.
    { name: "MARS · ABOUT", au: 1.52, pos: V(-45, -6, -110), r: 6, body: createMars(6), dist: 3.1, aim: 0.95, title: "About me" },
    { name: "JUPITER · EXPERIENCE", au: 5.2, pos: V(55, -10, -220), r: 9, body: createJupiter(9), dist: 4.6, title: "Experience" },
    { name: "SATURN · PROJECTS", au: 9.58, pos: V(-50, -16, -330), r: 6.5, body: saturn, dist: 5.6, title: "Projects" },
    { name: "NEPTUNE · EDUCATION", au: 30.07, pos: V(30, 8, -440), r: 5.5, body: createNeptune(5.5), dist: 3.4, title: "Education" },
    { name: "PLUTO · INTERESTS", au: 39.48, pos: V(-35, -2, -550), r: 4, body: createPluto(4), dist: 3.6, title: "Interests" },
  ];
  for (const s of stops) {
    if (!s.body) continue;
    s.body.group.position.copy(s.pos);
    scene.add(s.body.group);
    // Each section's title lives on a flag the astronaut plants on landing
    // On desktop the flag goes on the same side of the screen as the planet (shot(): odd stops sit on the
    // right). Phones centre every planet and keep the right-hand sky for the name callout, so flags stay left.
    const narrow = innerWidth / innerHeight < 0.9 || innerWidth < 820;
    s.flagSide = !narrow && stops.indexOf(s) % 2 ? 1 : -1;
    s.flag = createFlag(s.title, s.flagSide);
    s.flag.group.visible = false;
    s.puff = createDustPuff();
    s.body.group.add(s.flag.group, s.puff.object);
    s.planted = false;
  }

  // Asteroid belt between Mars and Jupiter, with a corridor left open along the camera's flight
  const corridor = [];
  for (let f = 0; f <= 1.0001; f += 0.02) {
    const a = shot(1).pos, b = shot(2).pos;
    corridor.push(a.clone().lerp(b, f).add(V(0, Math.sin(Math.PI * f) * 14, 0)));
    corridor.push(flightAt(1, f).P, chaseAt(1, f, 1).pos, chaseAt(1, f, -1).pos);
  }
  // ...and keep the view of each planted flag at Mars and Jupiter clear of rocks
  for (const i of [1, 2]) {
    const L = landing(i), cam = shot(i).pos, S = L.H * flagBoost(stops[i], L);
    const across = V(stops[i].flagSide, 0, 0).applyQuaternion(L.q); // the way the cloth flies from the pole
    for (const up of [0.6, 1.5, 2.4]) for (const side of [0, 1.1, 2.2]) {
      const target = flagBase(stops[i], L).addScaledVector(L.n, up * S).addScaledVector(across, side * S);
      for (let f = 0; f <= 1.0001; f += 0.05) corridor.push(cam.clone().lerp(target, f));
    }
  }
  const asteroids = createAsteroids(isSmall ? 110 : 220, stops[1].pos, stops[2].pos, corridor);
  scene.add(asteroids.object);
  const dust = createDust(scene, isSmall ? 450 : 800);
  const meteors = createMeteors(scene);

  // Launch intro: a rocket lifts off from below and the camera chases it past your planet
  const rocket = createRocket(scene);
  // It roars up past the planet's right side, close enough for you to wave at it
  const flight = new THREE.CatmullRomCurve3([V(4.5, -30, 3), V(3.8, -8, 2.6), V(3.4, 3, 1.6), V(4.5, 14, -3), V(10, 40, -30), V(20, 80, -90)]);
  const wideShot = { pos: V(4.5, 1.2, 11.5), look: V(0.8, 2.4, 0) };
  let wavedAtRocket = false;
  let introSeen = false;
  try {
    introSeen = sessionStorage.getItem("introSeen") === "1";
  } catch {}
  // A link to a section (#projects…) skips it too: the browser hasn't jumped to the section yet at this point
  const atTop = scrollY < 10 && (!location.hash || location.hash === "#home");
  const intro = { active: !reducedMotion && atTop && !introSeen, start: Infinity, dur: 5.6 };
  if (intro.active) document.body.classList.add("intro");
  else rocket.object.visible = false;
  function endIntro() {
    if (!intro.active) return;
    intro.active = false;
    document.body.classList.remove("intro");
    try {
      sessionStorage.setItem("introSeen", "1");
    } catch {}
  }
  document.getElementById("skip-intro").addEventListener("click", endIntro);
  for (const ev of ["wheel", "touchmove", "keydown"]) addEventListener(ev, endIntro, { passive: true });

  // Camera framing for each stop: planet sits beside the text on desktop, above it on mobile
  function shot(i) {
    const mobile = innerWidth / innerHeight < 0.9 || innerWidth < 820;
    if (i === 0) {
      return mobile ? { pos: V(0, 3.4, 9.6), look: V(0, 1.2, 0) } : { pos: V(0.8, 3.35, 5.3), look: V(-1.95, 2.6, 0) };
    }
    const { pos: p, r, dist, aim = 1.35 } = stops[i];
    return mobile
      ? { pos: p.clone().add(V(0, r * 0.5, r * (dist + 2.5))), look: p.clone().add(V(-r * 0.25, r * 0.3, 0)) }
      : (() => {
          // Alternate sides: odd stops put the planet on the right (text left), even stops on the left
          const side = i % 2 ? 1 : -1;
          // Aim a little above the planet so it sits lower in frame, leaving headroom for the flag under the nav
          return { pos: p.clone().add(V(side * r * 0.7, r * 0.35, r * dist)), look: p.clone().add(V(-side * r * aim, r * 0.88, 0)) };
        })();
  }

  // Where the astronaut stands at each stop: on the top of the planet, tipped a little toward
  // the camera so the visor faces the viewer. Height scales with the planet.
  function landing(i) {
    const s = stops[i];
    const toCam = shot(i).pos.clone().sub(s.pos).normalize();
    const n = UP.clone().addScaledVector(toCam, i === 0 ? 0.15 : 0.6).normalize();
    const fwd = toCam.clone().addScaledVector(n, -toCam.dot(n)).normalize();
    const q = new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(new THREE.Vector3().crossVectors(n, fwd), n, fwd));
    return { pos: s.pos.clone().addScaledVector(n, s.r), n, q, H: i === 0 ? 1.55 : s.r * 0.3 };
  }

  // Compile every shader up front, including the planets you can't see yet, so arriving at one never
  // stalls. compileAsync lets the GPU driver compile them in the background where the browser supports it.
  function compileAll() {
    const hidden = [];
    scene.traverse((o) => {
      if (!o.visible) {
        hidden.push(o);
        o.visible = true;
      }
    });
    const ready = renderer.compileAsync(scene, camera); // collects the materials synchronously
    hidden.forEach((o) => (o.visible = false));
    return ready;
  }
  // Textures are sent to the GPU one per frame (in the render loop) rather than all in one long block.
  // This fires once the first screen's textures are in, and again after the deferred planet maps arrive.
  const uploads = new Set();
  THREE.DefaultLoadingManager.onLoad = () => {
    loadDeferredTextures();
    scene.traverse((o) => {
      for (const m of [].concat(o.material || [])) for (const v of Object.values(m)) if (v && v.isTexture && v.image) uploads.add(v);
    });
  };

  // Post-processing: bloom makes the emissive bits glow; multisampled target keeps edges smooth
  const composer = new EffectComposer(
    renderer,
    new THREE.WebGLRenderTarget(innerWidth * renderer.getPixelRatio(), innerHeight * renderer.getPixelRatio(), { samples: isSmall ? 2 : 4, type: THREE.HalfFloatType })
  );
  composer.addPass(new RenderPass(scene, camera));
  const bloom = new UnrealBloomPass(new THREE.Vector2(innerWidth, innerHeight), 0.45, 0.4, 0.85);
  composer.addPass(bloom);
  composer.addPass(new OutputPass());

  // Scroll → position along the route (0 = hero, 1 = about, ...)
  let route = 0;
  // Sections are the planets (route = 0, 1, 2…); the empty travel strips between them are the
  // flights, so scrolling through a strip moves the astronaut along proportionally (route = i + 0…1).
  const segments = [...document.querySelectorAll("[data-stop], [data-travel]")];
  function readScroll() {
    const mid = scrollY + innerHeight * 0.5;
    let stop = 0;
    for (const el of segments) {
      const top = el.offsetTop, h = el.offsetHeight;
      if (el.hasAttribute("data-stop")) {
        if (mid < top + h) return void (route = stop);
        stop++;
      } else if (mid < top + h) {
        return void (route = stop - 1 + Math.min(1, Math.max(0, (mid - top) / h)));
      }
    }
    route = stop - 1;
  }
  addEventListener("scroll", readScroll, { passive: true });
  readScroll();

  // Pointer: head tracking, parallax, click-to-wave
  const pointer = { x: 0, y: 0, nx: 0, ny: 0, last: -10, inside: false };
  const coarsePointer = matchMedia("(pointer: coarse)").matches;
  // Leaving the window shouldn't leave the ISS "hovered"
  document.addEventListener("pointerleave", () => (pointer.last = -10));
  const raycaster = new THREE.Raycaster();
  const headWorld = new THREE.Vector3();
  addEventListener("pointermove", (e) => {
    pointer.x = e.clientX;
    pointer.y = e.clientY;
    pointer.nx = (e.clientX / innerWidth) * 2 - 1;
    pointer.ny = -(e.clientY / innerHeight) * 2 + 1;
    pointer.last = clock.elapsedTime;
  });
  const lines = [
    `Hi, I'm ${(data.nickname || data.name.split(" ")[0])}! 👋`,
    "Welcome aboard 🚀",
    "Scroll down to explore my galaxy",
    "Currently debugging the universe…",
    "Home sweet home 🌍 Next stop: Mars",
  ];
  let lineIdx = 0, bubbleUntil = 0;
  function say(t, text, hold = 2.6) {
    if (me.plant >= 0 || !grounded) return;
    me.wave(t);
    bubble.textContent = text;
    audio.blip();
    bubbleUntil = t + hold;
  }
  const sayHi = (t) => say(t, lines[lineIdx++ % lines.length]);
  canvas.addEventListener("click", (e) => {
    const ndc = new THREE.Vector2((e.clientX / innerWidth) * 2 - 1, -(e.clientY / innerHeight) * 2 + 1);
    raycaster.setFromCamera(ndc, camera);
    if (raycaster.intersectObject(me.root, true).length) sayHi(clock.elapsedTime);
    else if (route < 0.5 && isOnTop(iss.station)) {
      // Touch screens can't hover, so a tap pins the station and its fact for a few seconds
      if (craftTip.shown) craftTip.hide();
      issPinnedUntil = clock.elapsedTime + 5;
      audio.blip();
    }
  });
  document.getElementById("say-hi")?.addEventListener("click", () => sayHi(clock.elapsedTime));
  // Light mode "request": the astronaut waves it off
  addEventListener("lightmode", () => {
    audio.blip();
    if (grounded && me.plant < 0) me.wave(clock.elapsedTime);
  });

  addEventListener("resize", () => {
    camera.aspect = innerWidth / innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(innerWidth, innerHeight);
    composer.setSize(innerWidth, innerHeight);
    readScroll();
  });

  // Start the camera at the hero, slightly pulled back for an intro dolly
  const start = shot(0);
  camera.position.copy(start.pos).add(V(0, 1.5, 6));
  const look = start.look.clone();
  const clock = new THREE.Clock();
  let firstFrame = true, lastHover = false, activeStop = -1;
  let wasTransit = false;
  const rocketPos = new THREE.Vector3(), chase = new THREE.Vector3();

  // The astronaut's journey follows a smoothed copy of the scroll route
  let routeS = route, routeV = 0, grounded = true, groundedFor = 0, planting = null;
  const bootPuff = createDustPuff();
  scene.add(bootPuff.object);
  const trail = createExhaustTrail(scene);
  const flightQ = new THREE.Quaternion(), backQ = new THREE.Quaternion();
  const tmpQ = new THREE.Quaternion(), tmpV = new THREE.Vector3(), hand = new THREE.Vector3();
  // Smootherstep: zero velocity and acceleration at both ends
  function smoother(x) {
    const c = Math.min(1, Math.max(0, x));
    return c * c * c * (c * (c * 6 - 15) + 10);
  }
  const ce_ = (r) => r - Math.min(Math.floor(r), stops.length - 2);
  function smooth01(x) {
    const c = Math.min(1, Math.max(0, x));
    return c * c * (3 - 2 * c);
  }
  function bez(a, b, c, d, e) {
    const u = 1 - e;
    return a.clone().multiplyScalar(u * u * u).addScaledVector(b, 3 * u * u * e).addScaledVector(c, 3 * u * e * e).addScaledVector(d, e * e * e);
  }

  // The astronaut's flight between stop i and i+1 at progress e: a curve that lifts off along
  // the planet's normal and comes down along the next one's.
  function flightAt(i, e) {
    e = smoother(e); // starts and ends at rest instead of being flung off the surface
    const A = landing(i), B = landing(i + 1);
    const reach = A.pos.distanceTo(B.pos) * 0.35;
    const c1 = A.pos.clone().addScaledVector(A.n, reach), c2 = B.pos.clone().addScaledVector(B.n, reach);
    const P = bez(A.pos, c1, c2, B.pos, e);
    const vel = bez(A.pos, c1, c2, B.pos, Math.min(1, e + 0.01)).sub(bez(A.pos, c1, c2, B.pos, Math.max(0, e - 0.01))).normalize();
    return { A, B, P, vel, H: A.H + (B.H - A.H) * e, e };
  }

  // Chase camera: after lift-off the camera swings out beside the astronaut and follows it
  // through space, looking ahead along its path; it hands back to the planet framing before landing.
  function chaseAt(i, e, dir = heading) {
    const { A, B, P, H } = flightAt(i, e);
    // Use the overall direction of the hop (not the instantaneous velocity, which points
    // straight up at lift-off) so the camera stays on one steady side of the astronaut.
    const vel = B.pos.clone().sub(A.pos).normalize();
    const side = new THREE.Vector3().crossVectors(vel, UP).normalize();
    if (side.z < 0) side.negate(); // stay on the viewer's side of the solar system
    // Portrait screens are narrow, so pull back further and keep the astronaut centred
    const narrow = innerWidth / innerHeight < 0.9;
    const d = Math.max(H, 1.6) * (narrow ? 2.1 : 1);
    return {
      pos: P.clone().addScaledVector(side, 4.2 * d).addScaledVector(UP, 1.1 * d).addScaledVector(vel, -2.6 * d * dir),
      look: P.clone().addScaledVector(vel, (narrow ? 0.2 : 1.2) * d * dir),
      w: smoother(e / 0.28) * smoother((1 - e) / 0.3),
    };
  }

  function flagBase(s, L) {
    // Planted beside the astronaut on the flag's side (see flagSide), a little in front
    const local = V(s.flagSide * 0.55 * L.H, 0, 0.15 * L.H).applyQuaternion(L.q);
    return L.pos.clone().add(local);
  }
  // The camera stands further back from the big planets, so their flags are scaled up to read
  // about as large on screen as the one on Mars
  function flagBoost(s, L) {
    const mobile = innerWidth / innerHeight < 0.9 || innerWidth < 820;
    const camDist = shot(stops.indexOf(s)).pos.distanceTo(L.pos);
    return Math.min(1.8, Math.max(1, ((mobile ? 0.055 : 0.1) * camDist) / L.H));
  }
  function setFlag(s, L, worldBase, unfurl) {
    s.flag.group.visible = true;
    s.flag.group.position.copy(worldBase).sub(s.pos);
    s.flag.group.quaternion.copy(L.q);
    s.flag.group.scale.setScalar(L.H * flagBoost(s, L));
    s.flag.unfurl(unfurl);
  }
  function finishPlant() {
    if (!planting) return;
    const s = stops[planting.stop], L = landing(planting.stop);
    setFlag(s, L, flagBase(s, L).addScaledVector(L.n, -0.1 * L.H), 1);
    s.planted = true;
    planting = null;
    me.plant = -1;
  }

  function updateAstronaut(t, dt, k) {
    const nearest = Math.round(routeS);
    const offset = Math.abs(routeS - nearest);
    const nowGrounded = grounded ? offset < 0.02 : offset < 0.006;

    if (nowGrounded) {
      const L = landing(nearest);
      me.root.position.copy(L.pos);
      me.root.quaternion.copy(L.q);
      me.setHeight(L.H);
      if (!grounded) {
        me.land();
        bootPuff.object.position.copy(L.pos);
        bootPuff.object.quaternion.copy(L.q);
        bootPuff.object.scale.setScalar(L.H);
        bootPuff.fire(t);
        groundedFor = 0;
      }
      groundedFor += dt;
    } else {
      finishPlant();
      const i = Math.min(Math.floor(routeS), stops.length - 2);
      const { A, B, P, vel, H, e } = flightAt(i, routeS - i);
      me.root.position.copy(P);
      me.setHeight(H);
      // Mid-flight the body leans hard into the direction of travel and faces where it's going;
      // near the planets it straightens up and turns back toward the viewer.
      tmpQ.slerpQuaternions(A.q, B.q, e);
      const up = UP.clone().applyQuaternion(tmpQ);
      const cruise = smooth01(Math.min(e, 1 - e) / 0.2);
      // Build the cruising pose for each direction of travel, then blend by the scroll heading,
      // so scrolling back up turns the astronaut around (through a smooth rotation) mid-air.
      const poseFor = (dir, out) => {
        const travel = vel.clone().multiplyScalar(dir);
        const bodyUp = up.clone().lerp(travel, 0.75 * cruise).normalize();
        const toCam = camera.position.clone().sub(P).normalize();
        const ahead = travel.addScaledVector(bodyUp, -travel.dot(bodyUp));
        const facing = toCam.addScaledVector(bodyUp, -toCam.dot(bodyUp)).normalize().lerp(ahead.normalize().lerp(toCam, 0.35), cruise);
        const fwd = facing.addScaledVector(bodyUp, -facing.dot(bodyUp)).normalize();
        return out.setFromRotationMatrix(new THREE.Matrix4().makeBasis(new THREE.Vector3().crossVectors(bodyUp, fwd), bodyUp, fwd));
      };
      poseFor(1, flightQ).slerp(poseFor(-1, backQ), (1 - heading) / 2);
      // Ease out of the standing pose after lift-off and back into it before touchdown
      const settle = smoother(Math.min(e, 1 - e) / 0.12);
      me.root.quaternion.copy(e < 0.5 ? A.q : B.q).slerp(flightQ, settle);
      groundedFor = 0;
    }
    grounded = nowGrounded;
    // Pose follows the flight: upright with legs under the body near the planets, leaning and
    // trailing only while cruising. Thrust stays on for the whole flight, then fades after touchdown.
    const fi = Math.min(Math.floor(routeS), stops.length - 2), fe = smoother(routeS - fi);
    const poseTarget = grounded ? 0 : smoother(Math.min(fe, 1 - fe) / 0.2);
    me.fly += (poseTarget - me.fly) * Math.min(1, dt * 8);
    me.thrust += ((grounded ? 0 : 1) - me.thrust) * Math.min(1, dt * (grounded ? 2.5 : 8));

    // Plant the flag once the astronaut has settled on a planet that doesn't have one yet
    const s = stops[nearest];
    if (grounded && nearest > 0 && !s.planted && !planting && groundedFor > 0.15 && Math.abs(route - routeS) < 0.01) {
      planting = { stop: nearest, p: 0, puffed: false };
      me.plantSide = s.flagSide;
    }
    if (planting) {
      const s = stops[planting.stop], L = landing(planting.stop);
      planting.p = Math.min(1, planting.p + dt / 1.7);
      me.plant = planting.p;
      const p = planting.p;
      const ground = flagBase(s, L).addScaledVector(L.n, -0.1 * L.H);
      if (p < 0.3) {
        // Carried in the glove on the flag's side, gripped a third of the way up the pole
        me.handWorld(hand);
        setFlag(s, L, hand.clone().addScaledVector(L.n, -0.75 * L.H), 0.001);
      } else {
        const d = Math.min(1, (p - 0.3) / 0.12);
        me.handWorld(hand);
        const held = hand.clone().addScaledVector(L.n, -0.75 * L.H);
        const dd = d * d;
        const unfurl = Math.min(1, Math.max(0.001, (p - 0.45) / 0.3));
        setFlag(s, L, held.lerp(ground, dd), unfurl * unfurl * (3 - 2 * unfurl));
        if (d >= 1 && !planting.puffed) {
          planting.puffed = true;
          s.puff.object.position.copy(ground).sub(s.pos);
          s.puff.object.quaternion.copy(L.q);
          s.puff.object.scale.setScalar(L.H);
          s.puff.fire(t);
          audio.blip();
        }
      }
      if (p >= 1) {
        s.planted = true;
        planting = null;
        me.plant = -1;
      }
    }
    for (const st of stops) {
      if (!st.flag) continue;
      if (st.flag.group.visible) st.flag.update(t);
      st.puff.update(t);
    }
    bootPuff.update(t);
    me.update(t, dt);
    trail.update(dt, me, me.thrust > 0.3);
  }

  compileAll().then(() => renderer.setAnimationLoop(() => {
    const dt = Math.min(clock.getDelta(), 0.05);
    const t = clock.elapsedTime;
    for (const texture of uploads) {
      renderer.initTexture(texture);
      uploads.delete(texture);
      break;
    }

    // Desired camera from the route
    const i = Math.min(Math.floor(route), stops.length - 2);
    const f = route - i;
    const a = shot(i), b = shot(i + 1);
    const arc = Math.sin(Math.PI * ce_(routeS));
    // Critically damped spring toward the scroll position: wheel notches arrive in jumps,
    // but the astronaut's speed builds and fades smoothly between them.
    const W = 9;
    routeV += (W * W * (route - routeS) - 2 * W * routeV) * dt;
    routeS += routeV * dt;
    if (Math.abs(routeV) > 0.03) heading += (Math.sign(routeV) - heading) * Math.min(1, dt * 6);
    if (Math.abs(route - routeS) < 1e-4 && Math.abs(routeV) < 1e-3) {
      routeS = route;
      routeV = 0;
    }
    const ci = Math.min(Math.floor(routeS), stops.length - 2), ce = routeS - ci;
    // The camera rides the same eased timeline as the astronaut: framed on the departure planet,
    // handed to the chase shot (fully by mid-flight), then framed on the arrival planet.
    const base = ce < 0.5 ? shot(ci) : shot(ci + 1);
    const want = base.pos.clone(), wantLook = base.look.clone();
    if (ce > 0.001 && ce < 0.999) {
      if (reducedMotion) {
        want.copy(a.pos).lerp(b.pos, f);
        wantLook.copy(a.look).lerp(b.look, f);
      } else {
        const ch = chaseAt(ci, ce);
        want.lerp(ch.pos, ch.w);
        wantLook.lerp(ch.look, ch.w);
      }
    }
    if (route < 0.5) want.add(V(pointer.nx * 0.35, pointer.ny * 0.2, 0));

    const k = 1 - Math.pow(0.02, dt);

    // Rocket keeps flying on its own schedule, even if the intro is skipped
    const rt = (t - intro.start) / 5.2;
    if (rocket.object.visible) {
      const e = Math.pow(Math.min(1, Math.max(0, rt)), 1.5);
      rocketPos.copy(flight.getPointAt(e));
      rocket.object.position.copy(rocketPos);
      rocket.object.quaternion.setFromUnitVectors(UP, flight.getTangentAt(e));
      if (rt > 1) rocket.object.visible = false;
    }
    rocket.update(t, dt, rocket.object.visible && rt >= 0);

    if (intro.active) {
      // Wide shot of the planet, tilt to follow the rocket a little, then glide into the hero framing
      const ct = Math.max(0, (t - intro.start) / intro.dur);
      const blend = Math.min(1, Math.max(0, (ct - 0.55) / 0.45));
      const b2 = blend * blend * (3 - 2 * blend);
      const ws = innerWidth / innerHeight < 0.9 ? { pos: V(1.5, 2.5, 19), look: V(1.2, 3.2, 0) } : wideShot;
      chase.copy(ws.pos).add(V(0, ct * 2, 0));
      camera.position.copy(chase).lerp(want, b2);
      const follow = rt > 0 && rt < 1 ? 0.12 : 0;
      look.copy(ws.look).lerp(rocketPos, follow * (1 - b2)).lerp(wantLook, b2);
      if (!wavedAtRocket && rt > 0.38) {
        wavedAtRocket = true;
        me.wave(t);
      }
      if (ct >= 1) endIntro();
    } else {
      // Targets are already eased via routeS, so only a light extra smoothing is needed
      const kc = 1 - Math.pow(0.0008, dt);
      camera.position.lerp(want, kc);
      look.lerp(wantLook, kc);
    }
    camera.lookAt(look);

    // Meteoroid dust: faint specks at rest, motion-blurred along the real flight direction when moving
    dust.update(dt, camera, !reducedMotion);
    if (!reducedMotion) meteors.update(t, dt, camera);

    const transit = f > 0.04 && f < 0.96;
    if (transit && !wasTransit) audio.whoosh();
    wasTransit = transit;
    const fov = 50 + (reducedMotion ? 0 : arc * 10);
    if (Math.abs(camera.fov - fov) > 0.01) {
      camera.fov += (fov - camera.fov) * k;
      camera.updateProjectionMatrix();
    }

    me.head.getWorldPosition(headWorld);
    const headScreen = headWorld.clone().project(camera);
    const hx = (headScreen.x + 1) / 2 * innerWidth, hy = (1 - headScreen.y) / 2 * innerHeight;
    me.look.active = t - pointer.last < 2.5 && route < 0.5;
    me.look.x = Math.max(-1, Math.min(1, (pointer.x - hx) / (innerWidth * 0.4)));
    me.look.y = Math.max(-1, Math.min(1, (pointer.y - hy) / (innerHeight * 0.4)));
    updateAstronaut(t, dt, k);
    holo.update(t);
    const narrow = innerWidth / innerHeight < 0.9 || innerWidth < 820;
    holo.mesh.visible = !narrow; // no room for it beside the astronaut on phones
    holo.mesh.position.y = 3.55 + Math.sin(t * 1.1) * 0.06;
    holo.mesh.lookAt(camera.position.x, holo.mesh.position.y, camera.position.z);

    // Speech bubble follows the head
    const showBubble = t < bubbleUntil && route < 0.4;
    bubble.classList.toggle("show", showBubble);
    if (showBubble) bubble.style.transform = `translate(${hx}px, ${hy - innerHeight * 0.13}px) translate(-50%, -100%)`;

    // Hover: the station can drift under a still cursor, so it's checked every frame on the hero
    let issHover = false;
    if (route < 0.5 && pointer.last > 0 && !coarsePointer) {
      raycaster.setFromCamera(new THREE.Vector2(pointer.nx, pointer.ny), camera);
      issHover = isOnTop(iss.station);
    }
    if (t - pointer.last < 0.1 || issHover !== lastHover) {
      raycaster.setFromCamera(new THREE.Vector2(pointer.nx, pointer.ny), camera);
      const hover = issHover || raycaster.intersectObject(me.root, true).length > 0;
      if (hover !== lastHover) canvas.style.cursor = (lastHover = hover) ? "pointer" : "";
    }

    home.update(t);
    if (route < 1) {
      // The orbit runs on its own clock so it can stop while someone reads the trivia
      const paused = route < 0.5 && (issHover || t < issPinnedUntil);
      if (!paused) issT += dt;
      iss.update(issT);
      if (paused) {
        iss.station.getWorldPosition(issScreen).project(camera);
        craftTip.show((issScreen.x * 0.5 + 0.5) * innerWidth, (-issScreen.y * 0.5 + 0.5) * innerHeight);
      } else if (craftTip.shown) craftTip.hide();
    } else if (craftTip.shown) craftTip.hide();
    // Only draw a planet while we're at it or flying to/from it, so the hero sky shows just Earth
    stops.forEach((s, idx) => {
      if (!s.body) return;
      s.body.group.visible = Math.abs(route - idx) < 1;
      if (s.body.group.visible) s.body.update(t, dt);
    });
    // Fade the belt in as soon as we leave Earth so it's already in the distance before we reach it
    // Don't wait for the hero textures if the visitor is already heading for the planets
    if (route > 0.05) loadDeferredTextures();
    const fadeIn = THREE.MathUtils.smoothstep(route, 0.02, 0.35);
    const fadeOut = 1 - THREE.MathUtils.smoothstep(route, 2.4, 2.9);
    asteroids.setFade(Math.min(fadeIn, fadeOut));
    stars.update(t);
    if (asteroids.object.visible) asteroids.update(t);
    moon.update(t);

    // HUD
    const nearest = Math.round(route);
    if (nearest !== activeStop) {
      activeStop = nearest;
      hudSector.textContent = stops[nearest].name;
      // On stops where the text sits on the right, the HUD moves to the left corner
      document.body.classList.toggle("text-right", nearest > 0 && nearest % 2 === 0);
      document.body.classList.toggle("at-end", nearest === stops.length - 1);
      navLinks.forEach((l) => l.classList.toggle("active", Number(l.dataset.nav) === nearest));
    }
    const from = stops[Math.floor(route)], to = stops[Math.min(stops.length - 1, Math.ceil(route))];
    const au = from.au + (to.au - from.au) * (route % 1);
    hudDist.textContent = au.toFixed(2);
    sunMarker.update(camera, au);

    // Planet name callout: appears once the flag is in the ground, on the side away from the text
    const landed = Math.round(routeS);
    const flagDown = stops[landed].planted || (planting && planting.stop === landed && planting.p > 0.45);
    const showCallout = landed > 0 && grounded && Math.abs(routeS - landed) < 0.02 && flagDown;
    const narrowView = innerWidth / innerHeight < 0.9 || innerWidth < 820;
    callout.update(camera, showCallout ? stops[landed] : null, narrowView || landed % 2 ? 1 : -1);
    const secs = Math.floor(t);
    trivia.update(route);
    hudClock.textContent = [secs / 3600, (secs / 60) % 60, secs % 60].map((n) => String(Math.floor(n)).padStart(2, "0")).join(":");

    composer.render();
    if (firstFrame) {
      firstFrame = false;
      setTimeout(hideLoader, 500);
      intro.start = t + 0.9;
    }
  }));
}
