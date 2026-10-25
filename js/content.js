import { SATURN_MOONS } from "./planets.js";

// Renders data.js into the DOM. The 3D scene is purely decorative; all
// content lives here so it stays readable and crawlable.

const ICONS = {
  github:
    '<svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M12 .5a12 12 0 0 0-3.8 23.4c.6.1.8-.3.8-.6v-2.2c-3.3.7-4-1.4-4-1.4-.6-1.4-1.4-1.8-1.4-1.8-1-.7.1-.7.1-.7 1.2.1 1.8 1.2 1.8 1.2 1 1.8 2.8 1.3 3.5 1 .1-.8.4-1.3.7-1.6-2.7-.3-5.5-1.3-5.5-6 0-1.3.5-2.4 1.2-3.2-.1-.3-.5-1.5.1-3.2 0 0 1-.3 3.3 1.2a11.5 11.5 0 0 1 6 0C17.3 4.7 18.3 5 18.3 5c.7 1.7.2 2.9.1 3.2.8.8 1.2 1.9 1.2 3.2 0 4.6-2.8 5.6-5.5 5.9.4.4.8 1.1.8 2.2v3.3c0 .3.2.7.8.6A12 12 0 0 0 12 .5z"/></svg>',
  linkedin:
    '<svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M20.4 20.5h-3.6v-5.6c0-1.3 0-3-1.8-3s-2.1 1.4-2.1 2.9v5.7H9.3V9h3.4v1.6h.1c.5-.9 1.6-1.8 3.4-1.8 3.6 0 4.3 2.4 4.3 5.5v6.2zM5.3 7.4a2.1 2.1 0 1 1 0-4.2 2.1 2.1 0 0 1 0 4.2zM7.1 20.5H3.6V9h3.5v11.5zM22.2 0H1.8C.8 0 0 .8 0 1.7v20.6c0 .9.8 1.7 1.8 1.7h20.4c1 0 1.8-.8 1.8-1.7V1.7C24 .8 23.2 0 22.2 0z"/></svg>',
  twitter:
    '<svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M18.2 2.3h3.4l-7.4 8.4 8.7 11.5h-6.8l-5.3-7-6.1 7H1.3l7.9-9L.8 2.3h7l4.8 6.4 5.6-6.4zm-1.2 17.9h1.9L7 4.2H5l12 16z"/></svg>',
  email:
    '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 6-10 7L2 6"/></svg>',
  resume:
    '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6M8 13h8M8 17h5"/></svg>',
  external:
    '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6M15 3h6v6M10 14 21 3"/></svg>',
};

const $ = (id) => document.getElementById(id);
const esc = (s) =>
  String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
const moonName = (i) => (SATURN_MOONS[i]?.name ?? `Moon ${i + 1}`).toUpperCase();
const moonColor = (i) => "#" + (SATURN_MOONS[i % SATURN_MOONS.length].tint).toString(16).padStart(6, "0");
const tags = (items) => `<div class="tags">${items.map((t) => `<span class="tag">${esc(t)}</span>`).join("")}</div>`;

export function renderContent(data, { onProjectFocus } = {}) {
  const first = data.nickname || data.name.split(" ")[0];
  document.title = `${data.name} · Portfolio`;
  $("logo").innerHTML = `<span class="logo-dot"></span><span>${esc((data.callsign || first).toLowerCase())}<span class="dim">.dev</span></span>`;

  // Hero
  // The headline is the short call sign; the full name stays in the title, footer and screen readers
  const heroName = $("hero-name");
  heroName.textContent = data.callsign || data.name;
  if (data.callsign) {
    heroName.classList.add("is-callsign");
    heroName.setAttribute("aria-label", `${data.callsign}, ${data.name}`);
    heroName.title = data.name;
  }
  $("hero-role").textContent = data.role;
  $("hero-tagline").textContent = data.tagline;
  const cta = $("hero-cta");
  if (data.resumeUrl) cta.insertAdjacentHTML("beforeend", `<a href="${esc(data.resumeUrl)}" class="btn" target="_blank" rel="noopener">${ICONS.resume} Resume</a>`);
  if (data.socials.github)
    cta.insertAdjacentHTML("beforeend", `<a href="${esc(data.socials.github)}" class="btn" target="_blank" rel="noopener">${ICONS.github} GitHub</a>`);

  // About
  $("about-text").innerHTML = data.about.map((p) => `<p>${esc(p)}</p>`).join("");
  $("skills").innerHTML = Object.entries(data.skills)
    .map(([group, items]) => `<div class="skill-group"><h3>${esc(group)}</h3><p class="spec">${items.map((i) => `<span>${esc(i)}</span>`).join("")}</p></div>`)
    .join("");

  // Projects — each card maps to a moon
  $("project-grid").innerHTML = data.projects
    .map((p, i) => {
      const links = [
        // aria-labels name the project, since every card has the same "Live" / "Code" buttons
        p.live && `<a class="card-link live" href="${esc(p.live)}" target="_blank" rel="noopener" aria-label="Live: ${esc(p.name)}">Live <span aria-hidden="true">↗</span></a>`,
        p.github && `<a class="card-link" href="${esc(p.github)}" target="_blank" rel="noopener" aria-label="Code: ${esc(p.name)}">${ICONS.github} Code</a>`,
      ]
        .filter(Boolean)
        .join("");
      return `
        <article class="card glass" data-index="${i}" tabindex="0">
          <div class="card-top">
            <span class="moon-id mono"><span class="moon-dot" style="background:${moonColor(i)}"></span>${moonName(i)}${p.featured ? " · FEATURED" : ""}</span>
            ${p.live ? `<span class="live-badge mono"><span class="live-dot"></span>LIVE</span>` : ""}
          </div>
          <div class="card-title">
            <h3>${esc(p.name)}</h3>
            ${links ? `<div class="card-actions">${links}</div>` : ""}
          </div>
          <p>${esc(p.description)}</p>
          ${tags(p.stack)}
        </article>`;
    })
    .join("");
  if (onProjectFocus) {
    const grid = $("project-grid");
    const focus = (e) => {
      const card = e.target.closest(".card");
      onProjectFocus(card ? Number(card.dataset.index) : -1);
    };
    grid.addEventListener("pointerover", focus);
    grid.addEventListener("focusin", focus);
    grid.addEventListener("pointerleave", () => onProjectFocus(-1));
  }

  // Experience: levels, current first (see setupLevels)
  renderLevels(data);

  // Education
  $("education-list").innerHTML = (data.education || [])
    .map((e) => `<div class="job"><h3>${esc(e.degree)}</h3><p class="period mono">${esc(e.school)} · ${esc(e.period)}</p></div>`)
    .join("");

  // Interests
  $("interests-list").innerHTML = (data.interests || [])
    .map(
      (it, i) =>
        `<div class="interest"><span class="interest-num mono">${String(i + 1).padStart(2, "0")}</span><h3>${esc(it.name)}</h3>${it.note ? `<p>${esc(it.note)}</p>` : ""}</div>`
    )
    .join("");

  // Contact
  const links = [
    data.email && { href: `mailto:${data.email}`, label: "Send a transmission", icon: ICONS.email, primary: true },
    data.resumeUrl && { href: data.resumeUrl, label: "Resume", icon: ICONS.resume },
    data.socials.github && { href: data.socials.github, label: "GitHub", icon: ICONS.github },
    data.socials.linkedin && { href: data.socials.linkedin, label: "LinkedIn", icon: ICONS.linkedin },
    data.socials.twitter && { href: data.socials.twitter, label: "X / Twitter", icon: ICONS.twitter },
  ].filter(Boolean);
  $("contact-links").innerHTML = links
    .map((l) => `<a class="btn${l.primary ? " btn-primary" : ""}" href="${esc(l.href)}" target="_blank" rel="noopener">${l.icon} ${l.label}</a>`)
    .join("");
  $("footer-text").innerHTML = `© ${new Date().getFullYear()} ${esc(data.name)} · Built with three.js · Planet maps: <a href="https://www.solarsystemscope.com/textures/" target="_blank" rel="noopener">Solar System Scope</a> (CC BY 4.0), based on NASA imagery`;
}

// ---------- experience as levels ----------

const CHECK = '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.5"><path d="m5 12 5 5 9-10"/></svg>';

function renderLevels(data) {
  // Newest first: the current rank leads (highlighted), and scrolling walks back through the career
  const levels = [...new Set(data.experience.map((j) => j.level))].sort((a, b) => b - a);
  $("xp-levels").innerHTML = levels
    .map((lv, i) => {
      const main = data.experience.find((j) => j.level === lv && !j.sideQuest);
      const quests = data.experience.filter((j) => j.level === lv && j.sideQuest);
      const points = (j) => (j.points.length ? `<ul>${j.points.map((pt) => `<li>${esc(pt)}</li>`).join("")}</ul>` : "");
      return `
        <article class="lv${i === 0 ? " current" : ""}" data-lv="${lv}">
          <header class="lv-head">
            <span class="lv-num mono">LV ${lv}</span>
            <span class="lv-name">${esc(main.title)} <span>@ ${esc(main.company)}</span></span>
            <span class="lv-state mono">${i === 0 ? '<span class="current-badge">Current</span>' : CHECK}</span>
          </header>
          <div class="lv-body">
            <p class="period mono">${esc(main.period)}</p>
            ${points(main)}
            ${quests
              .map(
                (q) => `<div class="side-quest"><p class="mono sq-label">Side quest · ${esc(q.title)} @ ${esc(q.company)}</p><p class="period mono">${esc(q.period)}</p>${points(q)}</div>`
              )
              .join("")}
          </div>
        </article>`;
    })
    .join("");
  const ascending = [...levels].reverse();
  $("xp-ticks").innerHTML = ascending.map((lv, i) => `<span style="left:${(i / Math.max(1, ascending.length - 1)) * 100}%">LV${lv}</span>`).join("");
  setupLevels(data, levels);
}

function setupLevels(data, levels) {
  const section = $("experience");
  const panel = section.querySelector(".xp-panel");
  const cards = [...document.querySelectorAll(".lv")];
  const n = cards.length;
  // The rank, level and bar always show where the career is now
  $("xp-title").textContent = data.experience.find((j) => j.level === levels[0] && !j.sideQuest).title;
  $("xp-lv").textContent = `LV ${levels[0]} / ${levels[0]}`;
  $("xp-fill").style.width = "100%";
  let open = -1;

  const update = () => {
    const rect = section.getBoundingClientRect();
    // 0 when the panel pins (section padding-top minus the sticky offset), 1 when it unpins
    const pin = parseFloat(getComputedStyle(section).paddingTop) - 84;
    const span = Math.max(1, section.offsetHeight - innerHeight - pin);
    const p = Math.min(1, Math.max(0, (-rect.top - pin) / span));
    // Which card is expanded: the current role first, then each earlier one in turn
    const reached = Math.min(n - 1, Math.floor(p * n * 0.999 + 0.0001));
    if (reached !== open) {
      open = reached;
      cards.forEach((c, i) => c.classList.toggle("active", i === open));
      $("xp-hint").style.visibility = open < n - 1 ? "visible" : "hidden";
    }

    // Scroll the panel's text with the page: within each card's stretch of scroll, glide from the
    // top of that card to its last pointer, pausing briefly at both ends.
    const card = cards[open];
    const local = Math.min(1, Math.max(0, p * n - open));
    const f = Math.min(1, Math.max(0, (local - 0.12) / 0.7));
    const eased = f * f * (3 - 2 * f);
    const max = panel.scrollHeight - panel.clientHeight;
    const from = open === 0 ? 0 : Math.min(max, Math.max(0, card.offsetTop - 140));
    const to = Math.min(max, Math.max(from, card.offsetTop + card.offsetHeight - panel.clientHeight + 24));
    panel.scrollTop = from + (to - from) * eased;
  };
  addEventListener("scroll", update, { passive: true });
  addEventListener("resize", update);
  update();
}
