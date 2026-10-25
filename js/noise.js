// Small seeded RNG and noise, so the asteroids look the same on every visit.

export function rng(seed) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// 3D value noise + fractal sum, used to sculpt the asteroids.
export function makeNoise3(seed) {
  const r = rng(seed);
  const perm = [...Array(256).keys()];
  for (let i = 255; i > 0; i--) {
    const j = Math.floor(r() * (i + 1));
    [perm[i], perm[j]] = [perm[j], perm[i]];
  }
  const p = new Uint8Array(512);
  for (let i = 0; i < 512; i++) p[i] = perm[i & 255];
  const vals = Float32Array.from({ length: 256 }, () => r());
  const fade = (t) => t * t * (3 - 2 * t);
  const lerp = (a, b, t) => a + (b - a) * t;
  const h = (x, y, z) => vals[p[p[p[x & 255] + (y & 255)] + (z & 255)]];
  return (x, y, z) => {
    const xi = Math.floor(x), yi = Math.floor(y), zi = Math.floor(z);
    const fx = fade(x - xi), fy = fade(y - yi), fz = fade(z - zi);
    const x0 = lerp(h(xi, yi, zi), h(xi + 1, yi, zi), fx);
    const x1 = lerp(h(xi, yi + 1, zi), h(xi + 1, yi + 1, zi), fx);
    const x2 = lerp(h(xi, yi, zi + 1), h(xi + 1, yi, zi + 1), fx);
    const x3 = lerp(h(xi, yi + 1, zi + 1), h(xi + 1, yi + 1, zi + 1), fx);
    return lerp(lerp(x0, x1, fy), lerp(x2, x3, fy), fz);
  };
}

export function fbm(noise, x, y, z, octaves = 5) {
  let sum = 0, amp = 0.5, freq = 1, norm = 0;
  for (let i = 0; i < octaves; i++) {
    sum += noise(x * freq, y * freq, z * freq) * amp;
    norm += amp;
    amp *= 0.5;
    freq *= 2.03;
  }
  return sum / norm;
}
