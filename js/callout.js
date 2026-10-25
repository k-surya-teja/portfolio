import * as THREE from "three";

// A highlighted name tag that points at the planet the astronaut just landed on: a pulsing
// dot on the planet's edge, a leader line that draws itself out, and the name in a gold box.

const TAGS = {
  MARS: "The Red Planet",
  JUPITER: "The Gas Giant",
  SATURN: "The Ringed Planet",
  NEPTUNE: "The Ice Giant",
  PLUTO: "The Dwarf Planet",
};

export function createPlanetCallout() {
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.classList.add("callout-svg");
  svg.setAttribute("aria-hidden", "true");
  svg.innerHTML = `<polyline class="callout-line" pathLength="1" fill="none" />`;
  const line = svg.querySelector("polyline");
  const dot = document.createElement("div");
  dot.className = "callout-dot";
  const label = document.createElement("div");
  label.className = "planet-callout";
  label.innerHTML = `<span class="callout-name"></span><span class="callout-tag"></span>`;
  document.body.append(svg, dot, label);
  const nameEl = label.querySelector(".callout-name"), tagEl = label.querySelector(".callout-tag");

  const blockers = [...document.querySelectorAll(".panel, .site-footer, .hud, .trivia")];
  const overlaps = (a, b) => a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;
  const centre = new THREE.Vector3(), edge = new THREE.Vector3(), right = new THREE.Vector3();
  let current = null, side = 1, visible = false;

  const toScreen = (v) => ({ x: (v.x * 0.5 + 0.5) * innerWidth, y: (-v.y * 0.5 + 0.5) * innerHeight });

  function place(camera, pos, radius, dir) {
    // Planet centre and radius on screen
    centre.copy(pos).project(camera);
    right.setFromMatrixColumn(camera.matrixWorld, 0);
    edge.copy(pos).addScaledVector(right, radius).project(camera);
    const c = toScreen(centre), e = toScreen(edge);
    const rPx = Math.hypot(e.x - c.x, e.y - c.y);
    // Anchor just inside the limb, above the equator on the open side
    const narrow = innerWidth < 820;
    const ang = THREE.MathUtils.degToRad(narrow ? 62 : 18);
    const ax = c.x + dir * Math.cos(ang) * rPx * 0.92, ay = c.y - Math.sin(ang) * rPx * 0.92;
    const w = label.offsetWidth, h = label.offsetHeight;
    let bx, lx, ly;
    if (narrow) {
      // Phones: the open space is the sky above the planet, so the leader climbs to a tag up there
      ly = Math.max(72, ay - 70 - h);
      lx = Math.min(innerWidth - w - 14, Math.max(14, ax + dir * 26 - (dir > 0 ? 0 : w)));
      bx = dir > 0 ? Math.min(ax + 14, lx - 8) : Math.max(ax - 14, lx + w + 8);
    } else {
      // Desktop: out at 45°, then level to the label
      bx = ax + dir * 46;
      lx = dir > 0 ? bx + 30 : bx - 30 - w;
      lx = Math.min(innerWidth - w - 12, Math.max(12, lx));
      ly = Math.min(innerHeight - h - 12, Math.max(72, ay - 46 - h / 2));
    }
    const ex = dir > 0 ? lx : lx + w; // the line ends at the label's near edge
    const ey = ly + h / 2;
    line.setAttribute("points", `${ax},${ay} ${bx},${ey} ${ex},${ey}`);
    dot.style.transform = `translate(${ax}px, ${ay}px)`;
    label.style.transform = `translate(${lx}px, ${ly}px)`;
    return { left: lx, right: lx + w, top: ly, bottom: ly + h };
  }

  return {
    // `stop` is the landed stop ({ name, pos, r }) or null while flying; `preferSide` is +1 (right) / -1 (left)
    update(camera, stop, preferSide) {
      if (!stop) {
        if (visible) {
          visible = false;
          document.body.classList.remove("callout-on");
        }
        return;
      }
      if (stop !== current) {
        current = stop;
        const name = stop.name.split(" · ")[0];
        nameEl.textContent = name;
        tagEl.textContent = TAGS[name] || "";
        side = preferSide;
      }
      let box = place(camera, stop.pos, stop.r, side);
      // If it would sit on a panel, try the other side of the planet (desktop; phones keep the sky side)
      if (innerWidth >= 820 && blockers.some((b) => overlaps(box, b.getBoundingClientRect()))) {
        const other = place(camera, stop.pos, stop.r, -side);
        if (!blockers.some((b) => overlaps(other, b.getBoundingClientRect()))) {
          side = -side;
          box = other;
        } else place(camera, stop.pos, stop.r, side);
      }
      if (!visible) {
        visible = true;
        document.body.classList.add("callout-on");
      }
    },
  };
}
