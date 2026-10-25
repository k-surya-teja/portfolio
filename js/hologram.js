import * as THREE from "three";

// Floating holographic code panel that types itself out on a loop.
export function createHologram(lines) {
  const W = 640, H = 400;
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d");
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;

  const material = new THREE.MeshBasicMaterial({ map: texture, transparent: true, depthWrite: false, side: THREE.DoubleSide });
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(1.9, 1.19), material);

  const total = lines.join("\n").length;
  let shown = -1;
  const TOKEN = /("[^"]*"|\bconst\b|\btrue\b|[{}[\],:;=])/;

  function draw(n) {
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = "rgba(7,7,7,0.78)";
    ctx.fillRect(0, 0, W, H);
    ctx.strokeStyle = "rgba(236,230,217,0.35)";
    ctx.lineWidth = 2;
    ctx.strokeRect(1, 1, W - 2, H - 2);
    // corner brackets in the accent colour
    ctx.strokeStyle = "#e3c27a";
    ctx.lineWidth = 4;
    for (const [x, y, dx, dy] of [[2, 2, 1, 1], [W - 2, 2, -1, 1], [2, H - 2, 1, -1], [W - 2, H - 2, -1, -1]]) {
      ctx.beginPath();
      ctx.moveTo(x + dx * 28, y);
      ctx.lineTo(x, y);
      ctx.lineTo(x, y + dy * 28);
      ctx.stroke();
    }

    ctx.font = "400 21px 'Martian Mono', monospace";
    ctx.textBaseline = "top";
    ctx.fillStyle = "#e3c27a";
    ctx.fillText("●", 26, 24);
    ctx.fillStyle = "rgba(236,230,217,0.55)";
    ctx.fillText("LIVE  ~/portfolio/me.ts", 52, 24);
    ctx.fillStyle = "rgba(236,230,217,0.15)";
    ctx.fillRect(26, 62, W - 52, 1);

    let left = n;
    let y = 74;
    for (const line of lines) {
      if (left <= 0) break;
      const visible = line.slice(0, left);
      left -= line.length + 1;
      let x = 26;
      for (const part of visible.split(TOKEN)) {
        if (!part) continue;
        ctx.fillStyle = part.startsWith('"')
          ? "#e8c9a4"
          : part === "const" || part === "true"
          ? "#efd49a"
          : /^[{}[\],:;=]$/.test(part)
          ? "#8a857b"
          : "#ece6d9";
        ctx.fillText(part, x, y);
        x += ctx.measureText(part).width;
      }
      if (left <= 0 && Math.floor(performance.now() / 400) % 2 === 0) {
        ctx.fillStyle = "#e3c27a";
        ctx.fillRect(x + 2, y, 13, 27);
      }
      y += 36;
    }
    texture.needsUpdate = true;
  }

  return {
    mesh,
    update(t) {
      const cycle = total / 22 + 4; // type at ~22 chars/sec, then hold for 4s
      const n = Math.min(total, Math.floor((t % cycle) * 22));
      const blinkFrame = Math.floor(t * 2.5);
      if (n !== shown || blinkFrame !== this._blink) {
        shown = n;
        this._blink = blinkFrame;
        draw(n);
      }
      material.opacity = 0.95;
    },
  };
}
