import * as THREE from "three";

// The trip flies outward, away from the Sun, so it is almost always behind the camera.
// This marker sits on the screen edge in the Sun's direction (or on the Sun itself when it is
// in view), and clicking it says how long sunlight took to reach the astronaut.

const LIGHT_SECONDS_PER_AU = 499; // ~8 min 19 s

function lightTime(au) {
  const s = Math.round(au * LIGHT_SECONDS_PER_AU);
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60;
  if (h) return `${h} h ${m} min`;
  return `${m} min ${sec} s`;
}

export function createSunMarker(sunPosition) {
  const el = document.createElement("button");
  el.type = "button";
  el.className = "sun-marker";
  el.title = "Where is the Sun?"; // a tooltip, so the accessible name stays the visible "SUN x AU" text
  el.innerHTML = `<span class="sun-arrow"></span><span class="sun-icon"></span><span class="sun-label"><b>SUN</b> <span class="sun-au">1.00</span> AU</span>`;
  const note = document.createElement("div");
  note.className = "sun-note";
  note.setAttribute("role", "status");
  document.body.append(el, note);
  const arrow = el.querySelector(".sun-arrow");
  const auText = el.querySelector(".sun-au");

  // Text the marker must never sit on top of; it hides while overlapping any of these
  const blockers = [...document.querySelectorAll(".panel, .hero-copy, .site-footer, .trivia, .hud, .theme-note")];
  const overlaps = (a, b) => a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;
  let frame = 0;

  let au = 1, timer;
  el.addEventListener("click", () => {
    const behind = el.classList.contains("behind");
    note.textContent =
      `${behind ? "The Sun is behind us, " : "That's the Sun, "}${au.toFixed(2)} AU away. ` +
      `The light on these planets left it ${lightTime(au)} ago.`;
    note.classList.add("show");
    clearTimeout(timer);
    timer = setTimeout(() => note.classList.remove("show"), 4500);
  });

  const v = new THREE.Vector3();
  return {
    update(camera, distanceAu) {
      au = distanceAu;
      auText.textContent = au.toFixed(2);

      // Direction to the Sun in camera space: x right, y up, -z forward
      v.copy(sunPosition).applyMatrix4(camera.matrixWorldInverse);
      const inFront = v.z < 0;
      let x, y;
      if (inFront) {
        v.applyMatrix4(camera.projectionMatrix);
        x = v.x;
        y = v.y;
      } else {
        // Behind the camera: point the way you'd turn your head
        const len = Math.hypot(v.x, v.y) || 1;
        x = (v.x / len) * 10;
        y = (v.y / len) * 10;
      }
      const onScreen = inFront && Math.abs(x) < 0.92 && Math.abs(y) < 0.85;

      // Keep clear of the nav (top) and the HUD / trivia cards (bottom)
      const narrow = innerWidth < 820;
      const m = { l: narrow ? 30 : 40, r: narrow ? 30 : 40, t: 92, b: narrow ? 150 : 130 };
      const cx = (m.l + innerWidth - m.r) / 2, cy = (m.t + innerHeight - m.b) / 2;
      const hw = (innerWidth - m.l - m.r) / 2, hh = (innerHeight - m.t - m.b) / 2;
      let px = (x * innerWidth) / 2, py = (-y * innerHeight) / 2; // offset from screen centre in px
      if (onScreen) {
        el.style.transform = `translate(${innerWidth / 2 + px}px, ${innerHeight / 2 + py}px)`;
      } else {
        const k = Math.min(hw / Math.abs(px || 1e-6), hh / Math.abs(py || 1e-6));
        px *= k;
        py *= k;
        el.style.transform = `translate(${cx + px}px, ${cy + py}px)`;
      }
      el.classList.toggle("offscreen", !onScreen);
      el.classList.toggle("behind", !inFront);
      // Label sits on the inner side so it never runs off the edge
      el.classList.toggle("label-left", px > 0);
      arrow.style.transform = `rotate(${Math.atan2(py, px)}rad)`;

      // Layout reads are cheap but not free, so check for overlaps every few frames
      if (frame++ % 4 === 0) {
        const me = el.getBoundingClientRect();
        const label = el.querySelector(".sun-label").getBoundingClientRect();
        // The label is hidden on phones, so only count it when it has a size
        const box = label.width
          ? { left: Math.min(me.left, label.left), right: Math.max(me.right, label.right), top: me.top, bottom: me.bottom }
          : me;
        const covered = blockers.some((b) => {
          const r = b.getBoundingClientRect();
          return r.width && getComputedStyle(b).opacity !== "0" && overlaps(box, r);
        });
        el.classList.toggle("covered", covered);
      }
    },
  };
}
