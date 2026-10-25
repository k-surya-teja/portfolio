import * as THREE from "three";

// Photo-based planet maps from Solar System Scope (CC BY 4.0), built on NASA imagery.
// See textures/CREDITS.md.

// Each file is fetched once and shared (the Moon map also covers Saturn's moons and the asteroids).
// `later` maps (the planets past Earth) stay empty until loadDeferredTextures(), so the first screen
// only waits for what it shows.
const loader = new THREE.ImageLoader();
const cache = new Map();
const deferred = [];
export function tex(name, { color = true, later = false } = {}) {
  if (cache.has(name)) return cache.get(name);
  const t = new THREE.Texture();
  if (color) t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  const load = () =>
    loader.load(`textures/${name}`, (img) => {
      t.image = img;
      t.needsUpdate = true;
    });
  if (later) deferred.push(load);
  else load();
  cache.set(name, t);
  return t;
}

export function loadDeferredTextures() {
  deferred.splice(0).forEach((load) => load());
}

// Atmospheric glow: an inside-out shell that is brightest at the planet's limb and fades to
// nothing at the shell's edge. Only the sunlit side glows. Kept subtle on purpose.
export function atmosphere(planetRadius, scale, color, intensity = 1) {
  const limb = Math.sqrt(1 - 1 / (scale * scale)); // |dot(N, V)| where the shell meets the planet's silhouette
  return new THREE.Mesh(
    new THREE.SphereGeometry(planetRadius * scale, 64, 32),
    new THREE.ShaderMaterial({
      uniforms: {
        color: { value: new THREE.Color(color) },
        limb: { value: limb },
        intensity: { value: intensity },
        sunDir: { value: new THREE.Vector3(1, 0.3, 0.8).normalize() },
      },
      vertexShader: /* glsl */ `
        varying vec3 vNormal; varying vec3 vView; varying vec3 vWorldNormal;
        void main() {
          vNormal = normalize(normalMatrix * normal);
          vWorldNormal = normalize(mat3(modelMatrix) * normal);
          vec4 mv = modelViewMatrix * vec4(position, 1.0);
          vView = normalize(-mv.xyz);
          gl_Position = projectionMatrix * mv;
        }`,
      fragmentShader: /* glsl */ `
        uniform vec3 color; uniform float limb; uniform float intensity; uniform vec3 sunDir;
        varying vec3 vNormal; varying vec3 vView; varying vec3 vWorldNormal;
        void main() {
          float d = clamp(-dot(vNormal, vView) / limb, 0.0, 1.0);
          float glow = pow(d, 3.0);
          float lit = smoothstep(-0.35, 0.5, dot(-vWorldNormal, sunDir) * -1.0);
          gl_FragColor = vec4(color * glow * lit * intensity, 1.0);
        }`,
      side: THREE.BackSide,
      transparent: true,
      blending: THREE.CustomBlending,
      blendSrc: THREE.OneFactor,
      blendDst: THREE.OneFactor,
      depthWrite: false,
    })
  );
}

function planetMesh(radius, material) {
  return new THREE.Mesh(new THREE.SphereGeometry(radius, 96, 48), material);
}

// ---------- the Moon, hanging in the hero sky ----------
export function createMoon(radius = 1.5) {
  const group = new THREE.Group();
  const map = tex("1k_moon.webp");
  const planet = planetMesh(radius, new THREE.MeshStandardMaterial({ map, bumpMap: map, bumpScale: 2.5, roughness: 1 }));
  group.add(planet);
  return {
    group,
    update(t) {
      planet.rotation.y = t * 0.003;
    },
  };
}

// ---------- Earth: home, where the astronaut starts ----------
export function createEarth(radius) {
  const group = new THREE.Group();
  const planet = planetMesh(
    radius,
    new THREE.MeshStandardMaterial({
      map: tex("2k_earth_daymap.webp"),
      emissiveMap: tex("2k_earth_nightmap.webp"),
      emissive: new THREE.Color(0xffc98a),
      emissiveIntensity: 0.35,
      roughness: 0.85,
      metalness: 0.05,
    })
  );
  const clouds = planetMesh(
    radius * 1.012,
    new THREE.MeshStandardMaterial({ alphaMap: tex("2k_earth_clouds.webp", { color: false }), color: 0xffffff, transparent: true, depthWrite: false })
  );
  const tilt = new THREE.Group();
  tilt.rotation.z = THREE.MathUtils.degToRad(23.4);
  tilt.add(planet, clouds);
  group.add(tilt, atmosphere(radius, 1.06, 0x7fb2ff, 1.3));
  return {
    group,
    update(t) {
      // Slow, so the astronaut standing on it doesn't visibly slide; the clouds drift a little faster
      planet.rotation.y = t * 0.002;
      clouds.rotation.y = t * 0.006;
    },
  };
}

export function createMars(radius) {
  const group = new THREE.Group();
  const map = tex("2k_mars.webp", { later: true });
  const planet = planetMesh(radius, new THREE.MeshStandardMaterial({ map, bumpMap: map, bumpScale: 1.5, roughness: 1 }));
  planet.rotation.z = THREE.MathUtils.degToRad(25.2);
  group.add(planet, atmosphere(radius, 1.025, 0xd8a27e, 0.45));
  return {
    group,
    update(t) {
      planet.rotation.y = t * 0.004;
    },
  };
}

// Real Jupiter moons, one per project, with roughly true relative sizes and tints.
// Real moons of Saturn, one per project, with roughly true relative sizes and tints.
export const SATURN_MOONS = [
  { name: "Titan", tint: 0xd9a25a, size: 1.5 },
  { name: "Rhea", tint: 0xbdb7ad, size: 0.9 },
  { name: "Iapetus", tint: 0x8a7a66, size: 0.85 },
  { name: "Dione", tint: 0xc9c4bb, size: 0.7 },
  { name: "Tethys", tint: 0xd6d2c8, size: 0.68 },
  { name: "Enceladus", tint: 0xf2f2f0, size: 0.48 },
  { name: "Mimas", tint: 0xb5afa6, size: 0.42 },
  { name: "Hyperion", tint: 0xa38f75, size: 0.38 },
];

function reticleSprite() {
  const c = document.createElement("canvas");
  c.width = c.height = 256;
  const g = c.getContext("2d");
  g.strokeStyle = "#e3c27a";
  g.lineWidth = 6;
  g.beginPath();
  g.arc(128, 128, 92, 0, Math.PI * 2);
  g.stroke();
  g.lineWidth = 8;
  for (const [x1, y1, x2, y2] of [[128, 8, 128, 44], [128, 212, 128, 248], [8, 128, 44, 128], [212, 128, 248, 128]]) {
    g.beginPath();
    g.moveTo(x1, y1);
    g.lineTo(x2, y2);
    g.stroke();
  }
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(c), depthTest: false, transparent: true, opacity: 0 }));
  s.renderOrder = 10;
  return s;
}

export function createJupiter(radius) {
  const group = new THREE.Group();
  const planet = planetMesh(radius, new THREE.MeshStandardMaterial({ map: tex("2k_jupiter.webp", { later: true }), roughness: 1 }));
  planet.rotation.z = THREE.MathUtils.degToRad(3.1);
  group.add(planet);
  return {
    group,
    update(t) {
      planet.rotation.y = t * 0.004;
    },
  };
}

// Saturn with its rings; each project is one of its moons, orbiting outside the rings.
export function createSaturn(radius, moonCount) {
  const group = new THREE.Group();
  const planet = planetMesh(radius, new THREE.MeshStandardMaterial({ map: tex("2k_saturn.webp", { later: true }), roughness: 1 }));

  const inner = radius * 1.24, outer = radius * 2.27;
  const geo = new THREE.RingGeometry(inner, outer, 160, 1);
  const pos = geo.attributes.position, uv = geo.attributes.uv, v = new THREE.Vector3();
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i);
    uv.setXY(i, (v.length() - inner) / (outer - inner), 0.5);
  }
  const ring = new THREE.Mesh(
    geo,
    new THREE.MeshStandardMaterial({ map: tex("2k_saturn_ring_alpha.webp", { later: true }), transparent: true, side: THREE.DoubleSide, depthWrite: false, roughness: 1 })
  );
  ring.rotation.x = -Math.PI / 2;

  const tilt = new THREE.Group();
  tilt.rotation.set(THREE.MathUtils.degToRad(26.7), 0, THREE.MathUtils.degToRad(-8));
  tilt.add(planet, ring);
  group.add(tilt);

  // Moons orbit in (roughly) the ring plane, starting just outside the rings
  const moonMap = tex("1k_moon.webp");
  const moons = [];
  for (let i = 0; i < moonCount; i++) {
    const info = SATURN_MOONS[i % SATURN_MOONS.length];
    const pivot = new THREE.Group();
    pivot.rotation.set((((i * 37) % 11) / 11 - 0.5) * 0.12, i * 2.4, (((i * 53) % 7) / 7 - 0.5) * 0.1);
    const moon = new THREE.Mesh(
      new THREE.SphereGeometry(radius * 0.085 * info.size, 32, 16),
      new THREE.MeshStandardMaterial({ map: moonMap, color: info.tint, roughness: 1 })
    );
    moon.position.x = radius * (2.55 + i * 0.26);
    pivot.add(moon);
    tilt.add(pivot);
    moons.push({ pivot, moon, speed: 0.12 / Math.sqrt(1 + i * 0.4), offset: i * 0.8, focus: 0 });
  }

  // Mission-control style targeting reticle for the hovered project's moon
  const reticle = reticleSprite();
  group.add(reticle);
  const tmp = new THREE.Vector3();

  let focused = -1;
  return {
    group,
    focus(i) {
      focused = i;
    },
    update(t, dt) {
      planet.rotation.y = t * 0.004;
      for (let i = 0; i < moons.length; i++) {
        const m = moons[i];
        m.focus += ((i === focused ? 1 : 0) - m.focus) * Math.min(1, dt * 6);
        m.pivot.rotation.y = m.offset + t * m.speed * (1 - m.focus * 0.9);
        m.moon.scale.setScalar(1 + m.focus * 0.6);
      }
      const target = moons[focused];
      reticle.material.opacity += ((target ? 1 : 0) - reticle.material.opacity) * Math.min(1, dt * 8);
      if (target) {
        target.moon.getWorldPosition(tmp);
        group.worldToLocal(tmp);
        reticle.position.copy(tmp);
        const r = target.moon.geometry.parameters.radius * target.moon.scale.x;
        reticle.scale.setScalar(r * 5 * (1 + Math.sin(t * 6) * 0.04));
      }
    },
  };
}

// Pluto: the Moon's cratered map tinted to Pluto's tan and cream, so it costs no extra download.
// No atmosphere glow: Pluto's is far too thin to see.
export function createPluto(radius) {
  const group = new THREE.Group();
  const map = tex("1k_moon.webp");
  const planet = planetMesh(radius, new THREE.MeshStandardMaterial({ map, bumpMap: map, bumpScale: 1.5, color: 0xf3c49a, roughness: 1 }));
  planet.rotation.z = THREE.MathUtils.degToRad(57); // Pluto's axis is steeply tilted
  group.add(planet);
  return {
    group,
    update(t) {
      planet.rotation.y = t * 0.003;
    },
  };
}

export function createNeptune(radius) {
  const group = new THREE.Group();
  const planet = planetMesh(radius, new THREE.MeshStandardMaterial({ map: tex("1k_neptune.webp", { later: true }), roughness: 1 }));
  planet.rotation.z = THREE.MathUtils.degToRad(28.3);
  group.add(planet, atmosphere(radius, 1.05, 0x7d9ae6, 0.8));
  return {
    group,
    update(t) {
      planet.rotation.y = t * 0.004;
    },
  };
}

// The Sun: far away, small and blinding, the scene's only real light source.
export function createSun(direction) {
  const c = document.createElement("canvas");
  c.width = c.height = 256;
  const g = c.getContext("2d");
  const grad = g.createRadialGradient(128, 128, 0, 128, 128, 128);
  grad.addColorStop(0, "rgba(255,255,255,1)");
  grad.addColorStop(0.08, "rgba(255,250,240,1)");
  grad.addColorStop(0.2, "rgba(255,236,210,0.35)");
  grad.addColorStop(1, "rgba(255,230,200,0)");
  g.fillStyle = grad;
  g.fillRect(0, 0, 256, 256);
  const sprite = new THREE.Sprite(
    new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(c), blending: THREE.AdditiveBlending, depthWrite: false, transparent: true })
  );
  sprite.position.copy(direction).multiplyScalar(1100);
  sprite.scale.setScalar(160);
  return sprite;
}
