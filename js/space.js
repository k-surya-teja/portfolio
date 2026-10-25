import * as THREE from "three";
import { rng, makeNoise3, fbm } from "./noise.js";
import { tex } from "./planets.js";

// Twinkling, coloured stars on a huge shell around the whole scene.
export function createStarfield(count) {
  const r = rng(1);
  const positions = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3);
  const sizes = new Float32Array(count);
  const phases = new Float32Array(count);
  // Real star colours: mostly white, some warm (K/M) and some blue-white (B/A)
  const palette = [0xffffff, 0xffffff, 0xfff4e8, 0xffe2c4, 0xdfe8ff, 0xffd2a8].map((c) => new THREE.Color(c));
  for (let i = 0; i < count; i++) {
    const u = r() * 2 - 1, a = r() * Math.PI * 2, s = Math.sqrt(1 - u * u);
    const d = 350 + r() * 450;
    positions.set([s * Math.cos(a) * d, u * d, s * Math.sin(a) * d - 100], i * 3);
    const c = palette[Math.floor(r() * palette.length)];
    colors.set([c.r, c.g, c.b], i * 3);
    sizes[i] = r() < 0.02 ? 2.6 + r() * 1.6 : 0.6 + r() * 1.2;
    phases[i] = r() * 100;
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geo.setAttribute("color", new THREE.BufferAttribute(colors, 3));
  geo.setAttribute("size", new THREE.BufferAttribute(sizes, 1));
  geo.setAttribute("phase", new THREE.BufferAttribute(phases, 1));

  const material = new THREE.ShaderMaterial({
    uniforms: { time: { value: 0 }, pixelRatio: { value: Math.min(devicePixelRatio, 2) } },
    vertexShader: /* glsl */ `
      attribute float size; attribute float phase; attribute vec3 color;
      uniform float time; uniform float pixelRatio;
      varying vec3 vColor; varying float vAlpha;
      void main() {
        vColor = color;
        vAlpha = 0.75 + 0.25 * sin(time * (0.4 + fract(phase) * 1.5) + phase);
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        gl_PointSize = size * pixelRatio * 1.6;
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: /* glsl */ `
      varying vec3 vColor; varying float vAlpha;
      void main() {
        float d = length(gl_PointCoord - 0.5);
        float a = smoothstep(0.5, 0.0, d);
        gl_FragColor = vec4(vColor, a * a * vAlpha);
      }`,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  const points = new THREE.Points(geo, material);
  return { object: points, update: (t) => (material.uniforms.time.value = t) };
}

// The real Milky Way panorama on a huge inverted sphere, dimmed so it sits behind everything.
export function createMilkyWay() {
  const map = tex("2k_stars_milky_way.webp");
  const sky = new THREE.Mesh(
    new THREE.SphereGeometry(1500, 64, 32),
    new THREE.MeshBasicMaterial({ map, side: THREE.BackSide, color: 0x8a8a8a, depthWrite: false })
  );
  sky.rotation.set(0.5, 0, 1.1); // tilt the galactic band diagonally across the view
  return sky;
}

// ---------- asteroids ----------

// One lumpy, cratered rock shape. Real asteroids are irregular "potatoes", not polyhedra.
function asteroidGeometry(seed) {
  const r = rng(seed);
  const noise = makeNoise3(seed);
  const geo = new THREE.IcosahedronGeometry(1, 5);
  const pos = geo.attributes.position, v = new THREE.Vector3();
  const craters = Array.from({ length: 6 + Math.floor(r() * 6) }, () => ({
    c: new THREE.Vector3(r() - 0.5, r() - 0.5, r() - 0.5).normalize(),
    size: 0.15 + r() * 0.35,
    depth: 0.05 + r() * 0.08,
  }));
  const stretch = new THREE.Vector3(1, 0.6 + r() * 0.25, 0.5 + r() * 0.3);
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i).normalize();
    let h = 1 + (fbm(noise, v.x * 1.3 + 7, v.y * 1.3, v.z * 1.3, 5) - 0.5) * 0.9;
    for (const k of craters) {
      const d = Math.acos(Math.min(1, v.dot(k.c))) / k.size;
      if (d < 1.3) h += d < 1 ? -k.depth * (1 - d * d) : k.depth * 0.6 * Math.sin((d - 1) / 0.3 * Math.PI);
    }
    v.multiplyScalar(h).multiply(stretch);
    pos.setXYZ(i, v.x, v.y, v.z);
  }
  geo.computeVertexNormals();
  return geo;
}

// Real compositional types: dark carbon-rich (C), tan stony (S) and grey metallic (M).
const ROCK_TINTS = [0x4f4a45, 0x5a544d, 0x8a7962, 0x9a8a72, 0x7d7a77];

// The main asteroid belt, between Mars and Jupiter, kept clear of the camera's flight path.
export function createAsteroids(count, from, to, avoid = []) {
  const r = rng(5);
  const map = tex("1k_moon.webp"); // same file as the Moon, downloaded once
  // Always transparent (with depth writes) so fading in never swaps shader programs mid-flight
  const material = new THREE.MeshStandardMaterial({ map, bumpMap: map, bumpScale: 3, roughness: 1, metalness: 0.05, transparent: true });
  const SHAPES = 6;
  const group = new THREE.Group();
  const meshes = Array.from({ length: SHAPES }, (_, i) => {
    const m = new THREE.InstancedMesh(asteroidGeometry(100 + i), material, Math.ceil(count / SHAPES));
    m.count = 0;
    group.add(m);
    return m;
  });

  const items = [];
  const color = new THREE.Color();
  let tries = 0;
  while (items.length < count && tries++ < count * 20) {
    const pos = from.clone().lerp(to, 0.15 + r() * 0.6);
    pos.add(new THREE.Vector3((r() - 0.5) * 80, (r() - 0.5) * 30, (r() - 0.5) * 60));
    if (avoid.some((a) => a.distanceTo(pos) < 6)) continue;
    // Power-law sizes: lots of small rocks, a few big ones
    const scale = 0.15 + Math.pow(r(), 4) * 3.5;
    const mesh = meshes[items.length % SHAPES];
    const idx = mesh.count++;
    color.setHex(ROCK_TINTS[Math.floor(r() * ROCK_TINTS.length)]).multiplyScalar(1.6);
    mesh.setColorAt(idx, color);
    items.push({
      mesh,
      idx,
      pos,
      rot: new THREE.Euler(r() * 6, r() * 6, r() * 6),
      spin: new THREE.Vector3(r() - 0.5, r() - 0.5, r() - 0.5).multiplyScalar(0.4 / (0.5 + scale)),
      scale,
    });
  }

  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), sc = new THREE.Vector3();
  return {
    object: group,
    // 0 = hidden, 1 = solid
    setFade(a) {
      group.visible = a > 0.001;
      material.opacity = a;
    },
    update(t) {
      for (const it of items) {
        e.set(it.rot.x + t * it.spin.x, it.rot.y + t * it.spin.y, it.rot.z + t * it.spin.z);
        q.setFromEuler(e);
        sc.setScalar(it.scale);
        m4.compose(it.pos, q, sc);
        it.mesh.setMatrixAt(it.idx, m4);
      }
      meshes.forEach((m) => (m.instanceMatrix.needsUpdate = true));
    },
  };
}

// ---------- meteoroid dust + motion blur ----------

// Fine meteoroid dust that always surrounds the camera. When the camera is still the
// grains are faint specks; when it moves, each grain is stretched along the camera's
// real velocity, so near grains streak long and far ones short, like a camera shutter.
export function createDust(scene, count) {
  const BOX = 45;
  const r = Math.random;
  const pts = new Float32Array(count * 3);
  for (let i = 0; i < count * 3; i++) pts[i] = (r() - 0.5) * 2 * BOX;

  const specksGeo = new THREE.BufferGeometry();
  specksGeo.setAttribute("position", new THREE.BufferAttribute(pts, 3));
  const specks = new THREE.Points(
    specksGeo,
    new THREE.PointsMaterial({ color: 0xd9d2c5, size: 0.09, map: roundDot(), alphaTest: 0.05, transparent: true, opacity: 0.55, depthWrite: false })
  );

  const linePos = new Float32Array(count * 6);
  const lineCol = new Float32Array(count * 6);
  const lineGeo = new THREE.BufferGeometry();
  lineGeo.setAttribute("position", new THREE.BufferAttribute(linePos, 3));
  lineGeo.setAttribute("color", new THREE.BufferAttribute(lineCol, 3));
  const streaks = new THREE.LineSegments(
    lineGeo,
    new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false })
  );
  specks.frustumCulled = streaks.frustumCulled = false;
  scene.add(specks, streaks);

  const vel = new THREE.Vector3(), prev = new THREE.Vector3(), started = { v: false };
  return {
    update(dt, camera, enabled = true) {
      if (!started.v) {
        prev.copy(camera.position);
        started.v = true;
      }
      const raw = camera.position.clone().sub(prev).divideScalar(Math.max(dt, 1e-3));
      prev.copy(camera.position);
      vel.lerp(raw, Math.min(1, dt * 8));
      const speed = vel.length();
      const blur = enabled ? 0.6 * Math.min(1, Math.max(0, (speed - 8) / 50)) : 0;
      const shutter = Math.min(0.05, 9 / Math.max(speed, 1)); // cap streak length at ~9 units
      const c = camera.position;

      for (let i = 0; i < count; i++) {
        const k = i * 3;
        // Wrap grains around the camera so the field never runs out
        for (let a = 0; a < 3; a++) {
          const d = pts[k + a] - c.getComponent(a);
          if (d > BOX) pts[k + a] -= 2 * BOX;
          else if (d < -BOX) pts[k + a] += 2 * BOX;
        }
        const j = i * 6;
        linePos[j] = pts[k];
        linePos[j + 1] = pts[k + 1];
        linePos[j + 2] = pts[k + 2];
        linePos[j + 3] = pts[k] - vel.x * shutter;
        linePos[j + 4] = pts[k + 1] - vel.y * shutter;
        linePos[j + 5] = pts[k + 2] - vel.z * shutter;
        // Bright head, fading tail; dimmer with distance
        const dx = pts[k] - c.x, dy = pts[k + 1] - c.y, dz = pts[k + 2] - c.z;
        const near = 1 - Math.min(1, Math.sqrt(dx * dx + dy * dy + dz * dz) / BOX);
        const b = blur * near * near;
        lineCol[j] = 0.93 * b;
        lineCol[j + 1] = 0.9 * b;
        lineCol[j + 2] = 0.84 * b;
        lineCol[j + 3] = lineCol[j + 4] = lineCol[j + 5] = 0;
      }
      specksGeo.attributes.position.needsUpdate = true;
      lineGeo.attributes.position.needsUpdate = true;
      lineGeo.attributes.color.needsUpdate = true;
      streaks.visible = blur > 0.01;
      specks.material.opacity = 0.55 * (1 - blur);
    },
  };
}

// ---------- meteors ----------

// Every few seconds a meteoroid crosses the view, trailing a tapered, fading glow.
export function createMeteors(scene) {
  const TRAIL = 140;
  const STEP = 0.12;
  const rock = new THREE.Mesh(asteroidGeometry(7), new THREE.MeshStandardMaterial({ color: 0x6d655c, roughness: 1 }));
  rock.scale.setScalar(0.35);
  const trailPos = new Float32Array(TRAIL * 3);
  const trailSize = new Float32Array(TRAIL);
  const trailAlpha = new Float32Array(TRAIL);
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.BufferAttribute(trailPos, 3));
  geo.setAttribute("size", new THREE.BufferAttribute(trailSize, 1));
  geo.setAttribute("alpha", new THREE.BufferAttribute(trailAlpha, 1));
  const trail = new THREE.Points(
    geo,
    new THREE.ShaderMaterial({
      uniforms: { color: { value: new THREE.Color(0xffe2b8) }, scale: { value: innerHeight * Math.min(devicePixelRatio, 2) * 0.5 } },
      vertexShader: /* glsl */ `
        attribute float size; attribute float alpha; uniform float scale; varying float vAlpha;
        void main() {
          vAlpha = alpha;
          vec4 mv = modelViewMatrix * vec4(position, 1.0);
          gl_PointSize = size * scale / -mv.z;
          gl_Position = projectionMatrix * mv;
        }`,
      fragmentShader: /* glsl */ `
        uniform vec3 color; varying float vAlpha;
        void main() {
          float d = length(gl_PointCoord - 0.5);
          float a = smoothstep(0.5, 0.0, d);
          gl_FragColor = vec4(color * a * a * vAlpha, 1.0);
        }`,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    })
  );
  trail.frustumCulled = false;
  const group = new THREE.Group();
  group.add(rock, trail);
  group.visible = false;
  scene.add(group);

  const vel = new THREE.Vector3();
  const history = [];
  let alive = 0, nextAt = 3;
  const fwd = new THREE.Vector3(), right = new THREE.Vector3(), up = new THREE.Vector3();

  return {
    update(t, dt, camera) {
      if (!group.visible) {
        if (t < nextAt) return;
        // Spawn ahead of the camera, off to one side, heading across and down the view
        camera.getWorldDirection(fwd);
        right.crossVectors(fwd, camera.up).normalize();
        up.crossVectors(right, fwd).normalize();
        const side = Math.random() < 0.5 ? -1 : 1;
        rock.position
          .copy(camera.position)
          .addScaledVector(fwd, 50 + Math.random() * 30)
          .addScaledVector(right, side * (35 + Math.random() * 15))
          .addScaledVector(up, 12 + Math.random() * 14);
        vel.copy(right).multiplyScalar(-side).addScaledVector(up, -0.35 - Math.random() * 0.3).addScaledVector(fwd, -0.2).normalize().multiplyScalar(30 + Math.random() * 15);
        history.length = 0;
        alive = 0;
        group.visible = true;
      }
      alive += dt;
      rock.position.addScaledVector(vel, dt);
      rock.rotation.x += dt * 3;
      rock.rotation.y += dt * 2;
      // Fill the path at a fixed spacing, however far the rock moved this frame, so the trail is continuous
      if (!history.length) history.unshift(rock.position.clone());
      const last = history[0].clone();
      const gap = last.distanceTo(rock.position);
      for (let d = STEP; d <= gap; d += STEP) history.unshift(last.clone().lerp(rock.position, d / gap));
      while (history.length > TRAIL) history.pop();
      const fade = Math.min(1, alive * 3) * Math.min(1, Math.max(0, 3 - alive));
      for (let i = 0; i < TRAIL; i++) {
        const p = history[Math.min(i, history.length - 1)] || rock.position;
        trailPos.set([p.x, p.y, p.z], i * 3);
        const k = 1 - i / TRAIL;
        trailSize[i] = i === 0 ? 2.8 : 1.5 * Math.pow(k, 1.1) + 0.15;
        trailAlpha[i] = (i === 0 ? 1 : 0.22 * Math.pow(k, 1.6)) * fade * (i < history.length ? 1 : 0);
      }
      geo.attributes.position.needsUpdate = true;
      geo.attributes.size.needsUpdate = true;
      geo.attributes.alpha.needsUpdate = true;
      if (alive > 3) {
        group.visible = false;
        nextAt = t + 5 + Math.random() * 6;
      }
    },
  };
}

function roundDot() {
  const c = document.createElement("canvas");
  c.width = c.height = 32;
  const g = c.getContext("2d");
  const grad = g.createRadialGradient(16, 16, 0, 16, 16, 16);
  grad.addColorStop(0, "rgba(255,255,255,1)");
  grad.addColorStop(1, "rgba(255,255,255,0)");
  g.fillStyle = grad;
  g.fillRect(0, 0, 32, 32);
  return new THREE.CanvasTexture(c);
}
