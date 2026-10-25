import * as THREE from "three";

// A chunky little rocket with a flickering flame and an exhaust trail.
export function createRocket(scene) {
  const rocket = new THREE.Group();
  const hull = new THREE.MeshStandardMaterial({ color: 0xe9e6df, metalness: 0.2, roughness: 0.55 });
  const accent = new THREE.MeshStandardMaterial({ color: 0xc9a45c, metalness: 0.65, roughness: 0.35 }); // gold foil, like Apollo hardware
  const dark = new THREE.MeshStandardMaterial({ color: 0x1a1a1a, metalness: 0.6, roughness: 0.4 });

  const profile = [
    [0, -0.8], [0.28, -0.8], [0.34, -0.45], [0.36, 0.15], [0.32, 0.6], [0.2, 0.98], [0.07, 1.18], [0, 1.22],
  ].map(([x, y]) => new THREE.Vector2(x, y));
  rocket.add(new THREE.Mesh(new THREE.LatheGeometry(profile, 32), hull));

  const band = new THREE.Mesh(new THREE.CylinderGeometry(0.365, 0.362, 0.12, 32), accent);
  band.position.y = 0.05;
  const tip = new THREE.Mesh(new THREE.ConeGeometry(0.15, 0.3, 24), accent);
  tip.position.y = 1.12;
  const window_ = new THREE.Mesh(new THREE.SphereGeometry(0.12, 24, 16), new THREE.MeshStandardMaterial({ color: 0x20262e, metalness: 0.9, roughness: 0.1 }));
  window_.scale.z = 0.4;
  window_.position.set(0, 0.48, 0.31);
  const frame = new THREE.Mesh(new THREE.TorusGeometry(0.13, 0.025, 8, 24), dark);
  frame.position.copy(window_.position);
  frame.rotation.x = -0.12;
  rocket.add(band, tip, window_, frame);

  for (let i = 0; i < 3; i++) {
    const pivot = new THREE.Group();
    pivot.rotation.y = (i / 3) * Math.PI * 2;
    const fin = new THREE.Mesh(new THREE.BoxGeometry(0.045, 0.5, 0.34), accent);
    fin.position.set(0, -0.6, 0.42);
    fin.rotation.x = 0.2;
    pivot.add(fin);
    rocket.add(pivot);
  }
  const nozzle = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.24, 0.2, 24), dark);
  nozzle.position.y = -0.9;
  rocket.add(nozzle);

  // Flame: two additive cones pointing down
  const flameOuter = new THREE.Mesh(
    new THREE.ConeGeometry(0.22, 1.3, 20, 1, true),
    new THREE.MeshBasicMaterial({ color: 0xff7a29, transparent: true, opacity: 0.85, blending: THREE.AdditiveBlending, depthWrite: false })
  );
  const flameInner = new THREE.Mesh(
    new THREE.ConeGeometry(0.12, 0.8, 20, 1, true),
    new THREE.MeshBasicMaterial({ color: 0xfff1c1, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false })
  );
  for (const f of [flameOuter, flameInner]) {
    f.rotation.x = Math.PI;
    rocket.add(f);
  }
  const glow = new THREE.PointLight(0xff8a3d, 8, 10, 1.6);
  glow.position.y = -1.4;
  rocket.add(glow);

  rocket.scale.setScalar(0.9);
  scene.add(rocket);

  // Exhaust particles live in world space so they trail behind
  const MAX = 400;
  const positions = new Float32Array(MAX * 3);
  const colors = new Float32Array(MAX * 3);
  const parts = Array.from({ length: MAX }, () => ({ life: 0, v: new THREE.Vector3() }));
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geo.setAttribute("color", new THREE.BufferAttribute(colors, 3));
  const dot = document.createElement("canvas");
  dot.width = dot.height = 64;
  const g = dot.getContext("2d");
  const grad = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  grad.addColorStop(0, "rgba(255,255,255,1)");
  grad.addColorStop(0.4, "rgba(255,255,255,0.35)");
  grad.addColorStop(1, "rgba(255,255,255,0)");
  g.fillStyle = grad;
  g.fillRect(0, 0, 64, 64);
  const trail = new THREE.Points(
    geo,
    new THREE.PointsMaterial({
      size: 0.7,
      map: new THREE.CanvasTexture(dot),
      vertexColors: true,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    })
  );
  trail.frustumCulled = false;
  scene.add(trail);

  const hot = new THREE.Color(0xffd9a0), cool = new THREE.Color(0x3a2a20), tmp = new THREE.Color();
  const nozzleWorld = new THREE.Vector3(), down = new THREE.Vector3();
  let next = 0;

  return {
    object: rocket,
    update(t, dt, firing) {
      const flick = 0.85 + Math.random() * 0.3;
      flameOuter.scale.set(1, firing ? flick : 0.001, 1);
      flameInner.scale.set(1, firing ? flick * 0.9 : 0.001, 1);
      flameOuter.position.y = -0.9 - 0.65 * flameOuter.scale.y;
      flameInner.position.y = -0.9 - 0.4 * flameInner.scale.y;
      glow.intensity = firing ? 8 * flick : 0;

      if (firing && rocket.visible) {
        rocket.localToWorld(nozzleWorld.set(0, -1.1, 0));
        down.set(0, -1, 0).applyQuaternion(rocket.quaternion);
        for (let n = 0; n < 6; n++) {
          const p = parts[next];
          positions.set([nozzleWorld.x, nozzleWorld.y, nozzleWorld.z], next * 3);
          next = (next + 1) % MAX;
          p.life = 1;
          p.v.copy(down).multiplyScalar(4 + Math.random() * 3).add(new THREE.Vector3((Math.random() - 0.5) * 1.6, (Math.random() - 0.5) * 1.6, (Math.random() - 0.5) * 1.6));
        }
      }
      for (let i = 0; i < MAX; i++) {
        const p = parts[i];
        if (p.life <= 0) {
          colors.set([0, 0, 0], i * 3);
          continue;
        }
        p.life -= dt * 0.9;
        positions[i * 3] += p.v.x * dt;
        positions[i * 3 + 1] += p.v.y * dt;
        positions[i * 3 + 2] += p.v.z * dt;
        p.v.multiplyScalar(1 - dt * 1.5);
        tmp.copy(cool).lerp(hot, Math.max(0, p.life) ** 2).multiplyScalar(Math.max(0, p.life));
        colors.set([tmp.r, tmp.g, tmp.b], i * 3);
      }
      geo.attributes.position.needsUpdate = true;
      geo.attributes.color.needsUpdate = true;
    },
  };
}
