import * as THREE from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";

// An astronaut in an EVA suit: white fabric suit, gold reflective visor, life-support
// backpack with jet thrusters, bellows joints, boots. Built at ~1.36 units tall with feet
// at the origin, facing +z; `setHeight` scales it.

const BASE_HEIGHT = 1.36;
const ease = (x) => x * x * (3 - 2 * x);
const clamp01 = (x) => Math.min(1, Math.max(0, x));
const seg = (p, a, b) => clamp01((p - a) / (b - a));

function fabricTexture() {
  const c = document.createElement("canvas");
  c.width = c.height = 256;
  const g = c.getContext("2d");
  g.fillStyle = "#eeebe4";
  g.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 2600; i++) {
    g.fillStyle = Math.random() < 0.5 ? "rgba(120,110,95,0.06)" : "rgba(255,255,255,0.08)";
    g.fillRect(Math.random() * 256, Math.random() * 256, 2, 2);
  }
  // faint quilting seams
  g.strokeStyle = "rgba(120,110,95,0.12)";
  g.lineWidth = 2;
  for (let y = 0; y < 256; y += 64) {
    g.beginPath();
    g.moveTo(0, y);
    g.lineTo(256, y);
    g.stroke();
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}

function capsule(r, len, mat) {
  return new THREE.Mesh(new THREE.CapsuleGeometry(r, len, 8, 20), mat);
}

// Place a mesh at x, y, z and return it
const at = (m, x, y, z) => (m.position.set(x, y, z), m);

function ring(r, tube, mat) {
  const m = new THREE.Mesh(new THREE.TorusGeometry(r, tube, 10, 32), mat);
  m.rotation.x = Math.PI / 2;
  return m;
}

function flame() {
  const outer = new THREE.Mesh(
    new THREE.ConeGeometry(0.045, 0.28, 16, 1, true),
    new THREE.MeshBasicMaterial({ color: 0xffb36b, transparent: true, opacity: 0.8, blending: THREE.AdditiveBlending, depthWrite: false })
  );
  const inner = new THREE.Mesh(
    new THREE.ConeGeometry(0.022, 0.16, 12, 1, true),
    new THREE.MeshBasicMaterial({ color: 0xfff4dc, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false })
  );
  const g = new THREE.Group();
  outer.rotation.x = inner.rotation.x = Math.PI;
  outer.position.y = -0.14;
  inner.position.y = -0.08;
  g.add(outer, inner);
  return g;
}

export class Astronaut {
  constructor({ envMap } = {}) {
    const fabric = fabricTexture();
    const M = {
      suit: new THREE.MeshStandardMaterial({ map: fabric, color: 0xffffff, roughness: 0.92 }),
      joint: new THREE.MeshStandardMaterial({ color: 0xd8d3c8, roughness: 0.85 }),
      metal: new THREE.MeshStandardMaterial({ color: 0x9a978f, metalness: 0.7, roughness: 0.35, envMap }),
      dark: new THREE.MeshStandardMaterial({ color: 0x2a2a2c, roughness: 0.7 }),
      glove: new THREE.MeshStandardMaterial({ color: 0xdcd7cc, roughness: 0.8 }),
      helmet: new THREE.MeshPhysicalMaterial({ color: 0xf4f2ec, roughness: 0.35, clearcoat: 1, clearcoatRoughness: 0.15, envMap, envMapIntensity: 0.6 }),
      visor: new THREE.MeshPhysicalMaterial({
        color: 0xb88a3a,
        metalness: 1,
        roughness: 0.14,
        clearcoat: 1,
        clearcoatRoughness: 0.1,
        envMap,
        envMapIntensity: 0.75,
      }),
    };

    const root = (this.root = new THREE.Group());
    const model = (this.model = new THREE.Group());
    root.add(model);

    // ---------- hips + torso ----------
    const hips = (this.hips = new THREE.Group());
    hips.position.y = 0.56;
    model.add(hips);
    const pelvis = capsule(0.13, 0.16, M.suit);
    pelvis.rotation.z = Math.PI / 2;
    pelvis.scale.set(1, 1, 0.85);
    hips.add(pelvis);
    hips.add(at(ring(0.17, 0.022, M.metal), 0, 0.06, 0)); // waist ring

    const torso = (this.torso = new THREE.Group());
    hips.add(torso);
    const chest = capsule(0.19, 0.16, M.suit);
    chest.position.y = 0.24;
    chest.scale.set(1.18, 1, 0.86);
    torso.add(chest);

    // Display & control module on the chest
    const dcm = new THREE.Mesh(new RoundedBoxGeometry(0.2, 0.11, 0.06, 3, 0.015), M.joint);
    dcm.position.set(0, 0.22, 0.165);
    torso.add(dcm);
    [0xe3c27a, 0xb0473a, 0x5f7a8c, 0x2a2a2c].forEach((c, i) => {
      const b = new THREE.Mesh(new THREE.CylinderGeometry(0.013, 0.013, 0.012, 12), new THREE.MeshStandardMaterial({ color: c, roughness: 0.5 }));
      b.rotation.x = Math.PI / 2;
      b.position.set(-0.06 + i * 0.04, 0.23, 0.198);
      torso.add(b);
    });
    // Mission stripe on the left arm area of the chest
    const patch = new THREE.Mesh(new RoundedBoxGeometry(0.07, 0.045, 0.01, 2, 0.004), new THREE.MeshStandardMaterial({ color: 0x8a857b, roughness: 0.6 }));
    patch.position.set(0.12, 0.33, 0.15);
    patch.rotation.y = 0.35;
    torso.add(patch);

    // Life-support backpack with two thrusters
    const pack = new THREE.Mesh(new RoundedBoxGeometry(0.38, 0.44, 0.17, 4, 0.05), M.suit);
    pack.position.set(0, 0.26, -0.22);
    torso.add(pack);
    const packTop = new THREE.Mesh(new RoundedBoxGeometry(0.3, 0.06, 0.12, 3, 0.02), M.joint);
    packTop.position.set(0, 0.5, -0.22);
    torso.add(packTop);
    this.flames = [];
    for (const s of [-1, 1]) {
      const nozzle = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.045, 0.06, 16), M.metal);
      nozzle.position.set(s * 0.11, 0.02, -0.24);
      torso.add(nozzle);
      const f = flame();
      f.position.set(s * 0.11, -0.01, -0.24);
      torso.add(f);
      this.flames.push(f);
    }
    this.thrustLight = new THREE.PointLight(0xffb36b, 0, 3, 2);
    this.thrustLight.position.set(0, -0.15, -0.3);
    torso.add(this.thrustLight);

    // Neck ring + helmet
    torso.add(at(ring(0.13, 0.03, M.metal), 0, 0.43, 0.01));
    const head = (this.head = new THREE.Group());
    head.position.y = 0.47;
    torso.add(head);
    const shell = new THREE.Mesh(new THREE.SphereGeometry(0.205, 48, 32), M.helmet);
    shell.position.y = 0.13;
    head.add(shell);
    const visor = new THREE.Mesh(new THREE.SphereGeometry(0.212, 48, 32, Math.PI / 2 - 1.05, 2.1, 0.62, 1.25), M.visor);
    visor.position.y = 0.13;
    head.add(visor);
    // Visor frame (the hard edge around the gold glass)
    const frame = new THREE.Mesh(new THREE.TorusGeometry(0.19, 0.018, 10, 48, Math.PI * 1.15), M.helmet);
    frame.position.set(0, 0.12, 0.075);
    frame.rotation.set(-0.38, 0, Math.PI * 0.5 - (Math.PI * 1.15) / 2 + Math.PI);
    frame.scale.set(1, 1.05, 1);
    head.add(frame);
    // Helmet lights on each side
    for (const s of [-1, 1]) {
      const lamp = new THREE.Mesh(new THREE.CylinderGeometry(0.028, 0.028, 0.05, 16), M.joint);
      lamp.rotation.x = Math.PI / 2;
      lamp.position.set(s * 0.175, 0.25, 0.06);
      const lens = new THREE.Mesh(new THREE.CircleGeometry(0.02, 16), new THREE.MeshBasicMaterial({ color: 0xbdb6a6 }));
      lens.position.set(s * 0.175, 0.25, 0.086);
      head.add(lamp, lens);
    }

    // ---------- arms ----------
    const arm = (side) => {
      const shoulder = new THREE.Group();
      shoulder.position.set(side * 0.255, 0.34, 0);
      shoulder.add(new THREE.Mesh(new THREE.SphereGeometry(0.09, 24, 16), M.suit));
      const upper = capsule(0.072, 0.13, M.suit);
      upper.position.y = -0.12;
      shoulder.add(upper);
      const elbow = new THREE.Group();
      elbow.position.y = -0.25;
      shoulder.add(elbow);
      for (let i = 0; i < 2; i++) elbow.add(at(ring(0.066, 0.016, M.joint), 0, 0.015 - i * 0.03, 0));
      const fore = capsule(0.066, 0.11, M.suit);
      fore.position.y = -0.1;
      elbow.add(fore);
      elbow.add(at(ring(0.06, 0.018, M.metal), 0, -0.19, 0)); // wrist ring
      const hand = new THREE.Group();
      hand.position.y = -0.25;
      elbow.add(hand);
      const glove = new THREE.Mesh(new THREE.SphereGeometry(0.068, 20, 14), M.glove);
      glove.scale.set(0.95, 1.1, 0.8);
      hand.add(glove);
      const thumb = capsule(0.022, 0.03, M.glove);
      thumb.position.set(-side * 0.05, 0.01, 0.03);
      thumb.rotation.z = side * 0.6;
      hand.add(thumb);
      torso.add(shoulder);
      return { shoulder, elbow, hand, side };
    };
    // side -1 = the astronaut's right (viewer's left when facing the camera)
    this.armR = arm(-1);
    this.armL = arm(1);

    // ---------- legs ----------
    const leg = (side) => {
      const hip = new THREE.Group();
      hip.position.set(side * 0.1, -0.02, 0);
      const thigh = capsule(0.088, 0.15, M.suit);
      thigh.position.y = -0.12;
      hip.add(thigh);
      const knee = new THREE.Group();
      knee.position.y = -0.26;
      hip.add(knee);
      for (let i = 0; i < 2; i++) knee.add(at(ring(0.08, 0.017, M.joint), 0, 0.015 - i * 0.03, 0));
      const shin = capsule(0.082, 0.12, M.suit);
      shin.position.y = -0.1;
      knee.add(shin);
      const boot = new THREE.Mesh(new RoundedBoxGeometry(0.15, 0.1, 0.23, 4, 0.04), M.suit);
      boot.position.set(0, -0.25, 0.03);
      const sole = new THREE.Mesh(new RoundedBoxGeometry(0.155, 0.03, 0.24, 3, 0.01), M.dark);
      sole.position.set(0, -0.295, 0.03);
      knee.add(boot, sole);
      hips.add(hip);
      return { hip, knee };
    };
    this.legR = leg(-1);
    this.legL = leg(1);

    root.traverse((o) => {
      if (o.isMesh) o.castShadow = false;
    });

    // ---------- state ----------
    this.height = BASE_HEIGHT;
    this.fly = 0; // body pose: 0 standing, 1 cruising (leaning, legs trailing)
    this.thrust = 0; // jetpack output, separate so it can keep firing on the final approach
    this.crouch = 0;
    this.waveUntil = 0;
    this.plant = -1; // 0..1 while planting a flag, -1 otherwise
    this.plantSide = -1; // which side the flag goes: -1 right glove (viewer's left), 1 left glove (viewer's right)
    this.look = { x: 0, y: 0, active: false };
  }

  setHeight(h) {
    this.height = h;
    this.root.scale.setScalar(h / BASE_HEIGHT);
  }

  wave(t) {
    this.waveUntil = t + 2.4;
  }

  land() {
    this.crouch = 1;
  }

  // World position of the glove holding the flag pole (see plantSide)
  handWorld(out) {
    return (this.plantSide > 0 ? this.armL : this.armR).hand.getWorldPosition(out);
  }

  update(t, dt) {
    const k = 1 - Math.pow(0.0005, dt);
    const lerpRot = (o, x, y, z) => {
      o.rotation.x += (x - o.rotation.x) * k;
      o.rotation.y += (y - o.rotation.y) * k;
      o.rotation.z += (z - o.rotation.z) * k;
    };
    const fly = this.fly;
    this.crouch = Math.max(0, this.crouch - dt * 1.3);
    // 1 → 0 over ~0.75s: a quick soft compress, then a slow rise back to standing
    const u = 1 - this.crouch;
    const c = this.crouch > 0 ? Math.min(1, u / 0.25) * Math.pow(1 - Math.max(0, (u - 0.25) / 0.75), 2) * 0.55 : 0;

    // Body: breathing on the ground, a gentle bob while flying, a dip on touchdown
    const breathe = Math.sin(t * 1.6) * 0.006;
    this.hips.position.y = 0.56 - c * 0.12 + breathe + fly * Math.sin(t * 2.2) * 0.02;
    this.torso.rotation.x = c * 0.25 + fly * 0.15;

    // Legs: straight when standing, trailing back when flying, bent on landing
    for (const [leg, s] of [[this.legR, -1], [this.legL, 1]]) {
      const hx = -c * 0.75 + fly * (0.25 + s * 0.1);
      const kx = c * 1.25 + fly * (0.55 - s * 0.15);
      lerpRot(leg.hip, hx, 0, s * (0.04 + fly * 0.06));
      lerpRot(leg.knee, kx, 0, 0);
    }

    // Arms
    const waving = t < this.waveUntil && this.plant < 0 && fly < 0.2;
    const idle = (arm) => [fly * 0.5 - c * 0.3, 0, arm.side * (0.18 + fly * 0.35), -0.25 - fly * 0.2];
    let R = idle(this.armR);
    let L = idle(this.armL);
    let elbowZR = 0;
    if (waving) {
      R = [0, 0, -2.6, -0.1];
      elbowZR = Math.sin(t * 13) * 0.45;
    }
    if (this.plant >= 0) {
      const p = this.plant;
      // raise the flag high, drive it down beside the boot, let go, then salute
      const raise = ease(seg(p, 0, 0.28));
      const drive = ease(seg(p, 0.3, 0.42));
      const release = ease(seg(p, 0.48, 0.62));
      const salute = ease(seg(p, 0.66, 0.78)) * (1 - ease(seg(p, 0.93, 1)));
      const sz = -0.2 - 2.0 * raise + 1.35 * drive + 0.65 * release;
      const sx = -0.35 * raise + 0.1 * drive;
      const hold = [sx, 0, sz, -0.3 * (1 - release) - 0.25 * release];
      // The arm on the flag's side plants it (mirrored for the left arm); the salute is always right-handed
      if (this.plantSide > 0) L = [hold[0], 0, -hold[2], hold[3]];
      else R = hold;
      if (salute > 0) R = [R[0] * (1 - salute) - 0.5 * salute, 0, R[2] * (1 - salute) - 1.25 * salute, R[3] * (1 - salute) - 2.35 * salute];
    }
    lerpRot(this.armR.shoulder, R[0], R[1], R[2]);
    lerpRot(this.armR.elbow, R[3], 0, elbowZR);
    lerpRot(this.armL.shoulder, L[0], L[1], L[2]);
    lerpRot(this.armL.elbow, L[3], 0, 0);

    // Helmet turns toward the visitor's cursor, otherwise looks around a little
    const lx = this.look.active ? this.look.x * 0.5 : Math.sin(t * 0.35) * 0.18;
    const ly = this.look.active ? -this.look.y * 0.3 : Math.sin(t * 0.27) * 0.05;
    lerpRot(this.head, ly - fly * 0.2, lx * (1 - fly), 0);

    // Thrusters
    const flick = 0.85 + Math.random() * 0.3;
    const thrust = this.thrust;
    for (const f of this.flames) {
      f.visible = thrust > 0.02;
      f.scale.set(1, thrust * flick * 1.4, 1);
    }
    this.thrustLight.intensity = thrust * 2 * flick;
  }
}

// ---------- flags ----------

// `poleLeft`: the pole (and its hem) sits on the cloth's left edge, for flags that fly to the right
function flagTexture(title, poleLeft = false) {
  const W = 1024, H = 620;
  const c = document.createElement("canvas");
  c.width = W;
  c.height = H;
  const g = c.getContext("2d");
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  const draw = () => {
    g.fillStyle = "#ece6d9";
    g.fillRect(0, 0, W, H);
    // sewn hem along the pole side and a gold band
    g.fillStyle = "#d9d1c1";
    g.fillRect(poleLeft ? 0 : W - 46, 0, 46, H);
    g.fillStyle = "#e3c27a";
    g.fillRect(poleLeft ? 46 : 0, H - 58, W - 46, 20);
    // The section title, as big as fits, centred in the cloth above the band
    const text = title.toUpperCase(), room = W - 46 - 120;
    let size = 150;
    g.font = `400 ${size}px Michroma, sans-serif`;
    while (g.measureText(text).width > room && size > 40) g.font = `400 ${(size -= 4)}px Michroma, sans-serif`;
    g.fillStyle = "#14130f";
    g.textBaseline = "middle";
    g.fillText(text, poleLeft ? 46 + 60 : 60, (H - 58) / 2);
    tex.needsUpdate = true;
  };
  draw();
  // Redraw once the web font has arrived
  document.fonts.load("400 150px Michroma").then(draw, () => {});
  return tex;
}

// A flag on a pole, base at the origin, pole along +y, cloth hanging off toward -x and facing +z.
// `side`: which way the cloth flies from the pole, -1 (left, the default) or 1 (right)
export function createFlag(title, side = -1) {
  const group = new THREE.Group();
  const POLE = 2.45, CW = 2.3, CH = 1.39;
  const pole = new THREE.Mesh(
    new THREE.CylinderGeometry(0.018, 0.018, POLE, 12),
    new THREE.MeshStandardMaterial({ color: 0xcfccc4, metalness: 0.8, roughness: 0.3 })
  );
  pole.position.y = POLE / 2;
  const tip = new THREE.Mesh(new THREE.SphereGeometry(0.04, 16, 12), new THREE.MeshStandardMaterial({ color: 0xe3c27a, metalness: 0.8, roughness: 0.3 }));
  tip.position.y = POLE + 0.02;
  // Horizontal rod along the top edge, like the Apollo flags, so the cloth stays spread out
  const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, CW, 8), pole.material);
  rod.rotation.z = Math.PI / 2;

  const geo = new THREE.PlaneGeometry(CW, CH, 32, 12);
  geo.translate((side * CW) / 2, -CH / 2, 0);
  const base = Float32Array.from(geo.attributes.position.array);
  // The cloth glows faintly with its own texture so the lettering stays readable on a planet's night side
  const map = flagTexture(title, side > 0);
  const cloth = new THREE.Mesh(
    geo,
    new THREE.MeshStandardMaterial({ map, emissiveMap: map, emissive: 0xffffff, emissiveIntensity: 0.22, side: THREE.DoubleSide, roughness: 0.9 })
  );
  const clothPivot = new THREE.Group();
  clothPivot.position.y = POLE - 0.04;
  clothPivot.add(cloth);
  group.add(pole, tip, clothPivot);
  clothPivot.add(rod);
  rod.position.set((side * CW) / 2, 0, 0);

  return {
    group,
    unfurl(u) {
      clothPivot.scale.x = Math.max(0.001, u);
    },
    update(t) {
      // A slow ripple travelling away from the pole, stronger at the free edge
      const pos = geo.attributes.position;
      for (let i = 0; i < pos.count; i++) {
        const x = base[i * 3], y = base[i * 3 + 1];
        const d = (side * x) / CW;
        const z = Math.sin(d * 7 - t * 2.4 + y * 1.2) * 0.07 * d + Math.sin(d * 3 - t * 1.3) * 0.04 * d;
        pos.setZ(i, z);
      }
      pos.needsUpdate = true;
      geo.computeVertexNormals();
    },
  };
}

// A little ring of regolith dust kicked up when the pole goes in or the boots touch down.
export function createDustPuff(color = 0xbdb6aa) {
  const N = 28;
  const pos = new Float32Array(N * 3);
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  const mat = new THREE.PointsMaterial({ color, size: 0.08, transparent: true, opacity: 0, depthWrite: false });
  const points = new THREE.Points(geo, mat);
  const dirs = Array.from({ length: N }, () => {
    const a = Math.random() * Math.PI * 2;
    return new THREE.Vector3(Math.cos(a), 0.3 + Math.random() * 0.6, Math.sin(a)).multiplyScalar(0.4 + Math.random() * 0.6);
  });
  let start = -1;
  return {
    object: points,
    fire(t) {
      start = t;
    },
    update(t) {
      const age = t - start;
      if (start < 0 || age > 1.2) {
        mat.opacity = 0;
        return;
      }
      for (let i = 0; i < N; i++) {
        const d = dirs[i];
        pos.set([d.x * age, d.y * age - 0.5 * age * age * 0.6, d.z * age], i * 3);
      }
      geo.attributes.position.needsUpdate = true;
      mat.opacity = 0.8 * (1 - age / 1.2);
    },
  };
}

// Glowing exhaust left behind by the jetpack while flying, in world space so it streams out behind.
export function createExhaustTrail(scene) {
  const MAX = 500;
  const pos = new Float32Array(MAX * 3);
  const col = new Float32Array(MAX * 3);
  const parts = Array.from({ length: MAX }, () => ({ life: 0, v: new THREE.Vector3() }));
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  geo.setAttribute("color", new THREE.BufferAttribute(col, 3));
  const dot = document.createElement("canvas");
  dot.width = dot.height = 64;
  const g = dot.getContext("2d");
  const grad = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  grad.addColorStop(0, "rgba(255,255,255,1)");
  grad.addColorStop(0.4, "rgba(255,255,255,0.3)");
  grad.addColorStop(1, "rgba(255,255,255,0)");
  g.fillStyle = grad;
  g.fillRect(0, 0, 64, 64);
  const points = new THREE.Points(
    geo,
    new THREE.PointsMaterial({ size: 0.35, map: new THREE.CanvasTexture(dot), vertexColors: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending })
  );
  points.frustumCulled = false;
  scene.add(points);
  const hot = new THREE.Color(0xffd9a0), cool = new THREE.Color(0x40362c), tmp = new THREE.Color();
  const nozzle = new THREE.Vector3(), down = new THREE.Vector3();
  let next = 0;
  return {
    update(dt, astronaut, emitting) {
      if (emitting) {
        const scale = astronaut.root.scale.x;
        points.material.size = 0.35 * scale;
        for (const f of astronaut.flames) {
          f.getWorldPosition(nozzle);
          down.set(0, -1, 0).applyQuaternion(f.getWorldQuaternion(new THREE.Quaternion()));
          for (let n = 0; n < 3; n++) {
            const p = parts[next];
            nozzle.toArray(pos, next * 3);
            p.life = 1;
            p.v.copy(down).multiplyScalar((2 + Math.random() * 2) * scale).add(new THREE.Vector3(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5).multiplyScalar(0.6 * scale));
            next = (next + 1) % MAX;
          }
        }
      }
      for (let i = 0; i < MAX; i++) {
        const p = parts[i];
        if (p.life <= 0) {
          col[i * 3] = col[i * 3 + 1] = col[i * 3 + 2] = 0;
          continue;
        }
        p.life -= dt * 1.1;
        pos[i * 3] += p.v.x * dt;
        pos[i * 3 + 1] += p.v.y * dt;
        pos[i * 3 + 2] += p.v.z * dt;
        p.v.multiplyScalar(1 - dt * 2);
        const l = Math.max(0, p.life);
        tmp.copy(cool).lerp(hot, l * l).multiplyScalar(l);
        tmp.toArray(col, i * 3);
      }
      geo.attributes.position.needsUpdate = true;
      geo.attributes.color.needsUpdate = true;
    },
  };
}
