# Portfolio: a tour of the solar system

This portfolio is a 3D scene built with [three.js](https://threejs.org). An astronaut stands on Earth with the Moon hanging in the sky. Between every two sections there's a stretch of open space. Scrolling through it *is* the flight: the astronaut lifts off on its jetpack and moves in step with your scroll, trailing exhaust. Stop scrolling and it hovers mid-trip; keep going and it carries on. Mid-flight the camera swings out beside it and chases it through space, then hands back to the planet view for the landing. On each one the astronaut drives in a flag carrying that section's title, then salutes. Flags stay planted when you scroll back. The astronaut always flies head-first in the direction you're scrolling: scroll back up and it turns around mid-air.

| Section | Stop |
|---|---|
| Hero | **Earth**, home, with the Moon in the sky and the astronaut waiting |
| About | **Mars** |
| Experience | **Jupiter**. The panel stays pinned while you scroll. Roles show as levels with the current one first and highlighted (LV3 Software Engineer 1), and scrolling walks back through LV2 Software Engineer and LV1 SDE Intern. The mentoring role shows as a side quest |
| Projects | **Saturn**. Each project is one of its real moons (Titan, Rhea, Iapetus, …), and hovering a card puts a targeting reticle on that moon |
| Education | **Neptune** |
| Interests | **Pluto**, the dwarf planet (the Moon's map tinted tan, so no extra download), followed by the footer with contact links |

The planets use photographic texture maps based on NASA imagery (see `textures/CREDITS.md`). The lighting is a single hard sun with almost no ambient light, plus a faint blue earthshine. The UI follows NASA's 1975 Graphics Standards Manual: Helvetica throughout, a strict grid, sections presented as off-white mission documents with a "SECTION 01 — MARS / 1.52 AU" header, skills as a spec table, and one red (#FC3D21) used sparingly. The flags, HUD data plate and hologram use the same system. It borrows the style only, with no NASA logos or insignia.

Between Mars and Jupiter the camera flies through an asteroid belt of cratered rocks in real compositional types. Meteoroid dust motion-blurs along the actual flight direction, and the occasional meteor streaks past.

Extras:
- **Launch intro:** a rocket blasts off past the planet, the astronaut waves at it, and the camera glides into the hero view. It plays once per browser tab and can be skipped by scrolling, pressing any key or clicking "Skip intro".
- **Motion blur:** meteoroid dust streaks along the real direction of travel while the camera flies, and meteors cross the sky now and then.
- **Sound** (off by default; speaker button in the nav): an ambient pad with twinkling notes, a whoosh on each flight and a blip when the astronaut waves or plants a flag. It's all synthesized with Web Audio, so there are no audio files.
- Click the astronaut, or the "Say hi" button, to make it wave and talk. Its helmet follows your cursor.
- If the visitor has "reduce motion" turned on, the intro, motion blur and meteors are skipped.

There is no build step. three.js loads from a CDN through an import map, and the only assets are the texture maps in `textures/`.

### Load speed

- Textures are WebP (about 0.94 MB in all). Only Earth, the Moon and the Milky Way load up front; Mars, Jupiter, Saturn and Neptune load right after (`later: true` in `js/planets.js`), so the first screen isn't waiting for planets you can't see yet. `tex()` also makes sure each file downloads once.
- `index.html` preloads the whole module graph and the first-screen textures. If you add an import or change a first-screen texture, update those `<link>` tags too.
- To add a texture, convert it with `cwebp -q 80 -m 6 in.jpg -o textures/out.webp` (add `-resize 1024 512` for anything small on screen).

## Run locally

ES modules need an HTTP server; opening the file directly won't work:

```bash
npx serve .
# or
python3 -m http.server 8000
```

## Edit content

All text lives in **`data.js`**. Search it for `TODO` to find fields that still need filling in. The number of moons always matches the number of projects.

### Edit live, without redeploying

The content can also live in a GitHub Gist, so you change it in the browser and the site picks it up on the next page load:

1. Create a gist at https://gist.github.com with one file named `content.json`, and paste in the contents of `content.json` from this repo. It's the same data as `data.js`, written as JSON. A public gist is fine, since it's the same text the site shows.
2. Open the file, click **Raw** and copy the URL. Then **remove the commit hash** from it so it always points at the latest version: `https://gist.githubusercontent.com/<user>/<gist-id>/raw/content.json`
3. Paste that URL into `contentUrl` at the top of `data.js` and deploy once.

From then on, edit the gist and save. Changes go live within about 5 minutes (GitHub caches raw files briefly). JSON is stricter than JS: keys and strings need double quotes, there are no comments, and there's no trailing comma after the last item. If the gist is ever invalid or unreachable, the site quietly falls back to `data.js`, and any field missing from the gist also falls back to its `data.js` value.

## Code map

| File | What it does |
|---|---|
| `js/main.js` | Renderer, bloom, scroll-to-camera flight path, the astronaut's flight/landing/flag sequence, interactions, HUD |
| `js/astronaut.js` | The astronaut (suit, gold visor, jetpack, poses), the waving flags and dust puffs |
| `js/hologram.js` | The typing code hologram in the hero |
| `js/planets.js` | Earth, Moon, Mars, Jupiter (with moons), Saturn, Neptune, Pluto, atmospheres and the Sun |
| `js/space.js` | Starfield, Milky Way, asteroid belt, meteoroid dust (motion blur) and meteors |
| `js/rocket.js` | Intro rocket with flame and exhaust trail |
| `js/audio.js` | Synthesized ambient music and sound effects |
| `js/content.js` | Renders `data.js` into the HTML |
| `js/noise.js` | Seeded random numbers and noise for the asteroid shapes |

## Deploy

It's a static site, so you can upload the folder anywhere: `npx vercel`, Netlify Drop or GitHub Pages.
