// "Did you know?" cards shown only while flying between planets, so the empty
// stretches of the trip have something to read. One list per leg of the route
// (leg 0 = Earth → Mars, ...). Figures are rounded from NASA's planetary fact sheets.

const LEGS = [
  [
    "Sunlight takes about 8 minutes 20 seconds to reach Earth, so you always see the Sun as it was 8 minutes ago.",
    "Mars is home to Olympus Mons, the tallest volcano in the solar system: about 22 km high, roughly 2.5 times Everest.",
    "Mars is red because its dust is rich in iron oxide. The whole planet is, quite literally, rusty.",
  ],
  [
    "The asteroid belt is mostly empty space. On average, neighbouring asteroids are hundreds of thousands of kilometres apart.",
    "Squash every asteroid in the belt together and you'd get only about 3% of the Moon's mass.",
    "Jupiter is more than twice as massive as all the other planets combined.",
    "Jupiter's Great Red Spot is a storm wider than Earth that has been raging for at least 150 years.",
  ],
  [
    "A day on Jupiter lasts under 10 hours, the shortest of any planet.",
    "Saturn is less dense than water. In a big enough bathtub, it would float.",
    "Saturn's rings stretch over 250,000 km across, yet in most places they're only about 10 metres thick.",
  ],
  [
    "Titan, Saturn's largest moon, is the only moon with a thick atmosphere, and it has lakes of liquid methane.",
    "Neptune was found with maths before telescopes: Le Verrier predicted where it was, and it was spotted there in 1846.",
    "Neptune has the fastest winds in the solar system, over 2,000 km/h.",
    "One year on Neptune is about 165 Earth years. It finished its first orbit since discovery in 2011.",
  ],
  [
    "Pluto was a planet from its discovery in 1930 until 2006, when it was reclassified as a dwarf planet.",
    "Pluto is smaller than Earth's Moon: about 2,377 km across.",
    "New Horizons flew past Pluto in 2015 and found a huge heart-shaped glacier of nitrogen ice, Tombaugh Regio.",
    "Sunlight takes about five and a half hours to reach Pluto.",
  ],
];

export function createTrivia() {
  const card = document.createElement("aside");
  card.className = "trivia";
  card.setAttribute("aria-live", "polite");
  card.innerHTML = `<div class="trivia-head"><span class="trivia-dot"></span>Did you know?</div><p class="trivia-text"></p>`;
  document.body.appendChild(card);
  const text = card.querySelector(".trivia-text");
  let shown = "";

  return {
    // `route` is the scroll position along the trip: whole numbers are planets, fractions are in flight
    update(route) {
      const leg = Math.floor(route);
      const p = route - leg;
      const facts = LEGS[leg];
      // Hide near take-off and landing, where the astronaut and flag are the focus
      const visible = !!facts && p > 0.12 && p < 0.88;
      card.classList.toggle("show", visible);
      if (!visible) return;
      const fact = facts[Math.min(facts.length - 1, Math.floor(((p - 0.12) / 0.76) * facts.length))];
      if (fact === shown) return;
      shown = fact;
      // Fade the old fact out before swapping in the new one
      card.classList.add("swap");
      setTimeout(() => {
        text.textContent = shown;
        card.classList.remove("swap");
      }, text.textContent ? 180 : 0);
    },
  };
}
