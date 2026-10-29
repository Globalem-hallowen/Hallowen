/* ---------- Ambiente: brasas que suben y murciélagos que cruzan la pantalla ---------- */
const calm = () => matchMedia("(prefers-reduced-motion: reduce)").matches;

export function startAmbient() {
  if (calm()) return;
  embers();
  setTimeout(bats, 2500);
}

// Brasas de calabaza: puntos naranjas que suben despacio y titilan.
function embers() {
  const cv = document.getElementById("embers"); if (!cv) return;
  const ctx = cv.getContext("2d");
  let w, h, dpr;
  const size = () => { dpr = Math.min(devicePixelRatio || 1, 2); w = innerWidth; h = innerHeight; cv.width = w * dpr; cv.height = h * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0); };
  size(); addEventListener("resize", size);
  const n = innerWidth < 600 ? 18 : 34;
  const spawn = (p, first) => Object.assign(p, {
    x: Math.random() * w, y: first ? Math.random() * h : h + 10,
    r: .6 + Math.random() * 1.8, vy: .15 + Math.random() * .45, sway: Math.random() * 6.28,
    life: 0, max: 500 + Math.random() * 700, hue: 22 + Math.random() * 22,
  });
  const ps = Array.from({ length: n }, () => spawn({}, true));
  const tick = () => {
    if (!document.hidden) {
      ctx.clearRect(0, 0, w, h);
      for (const p of ps) {
        p.life++; p.y -= p.vy; p.sway += .012; p.x += Math.sin(p.sway) * .25;
        const fade = Math.min(1, p.life / 80, (p.max - p.life) / 120) * (.55 + Math.random() * .45);
        if (p.y < -10 || p.life > p.max) spawn(p);
        ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, 6.283);
        ctx.fillStyle = `hsla(${p.hue},100%,60%,${(fade * .8).toFixed(3)})`;
        ctx.shadowColor = `hsla(${p.hue},100%,55%,.9)`; ctx.shadowBlur = 8;
        ctx.fill();
      }
    }
    requestAnimationFrame(tick);
  };
  tick();
}

// Cada tanto, 1 a 3 murciélagos cruzan la parte alta de la pantalla.
function bats() {
  if (!document.hidden) {
    const count = 1 + Math.floor(Math.random() * 3), ltr = Math.random() < .5;
    for (let i = 0; i < count; i++) {
      const b = document.createElement("div"); b.className = "bat";
      const s = 22 + Math.random() * 26; b.style.width = s + "px";
      b.innerHTML = `<svg viewBox="0 0 64 40" aria-hidden="true"><use href="#i-bat"/></svg>`;
      document.body.appendChild(b);
      const y0 = innerHeight * (.08 + Math.random() * .35), dy = (Math.random() - .5) * 160;
      const x0 = ltr ? -80 : innerWidth + 80, x1 = ltr ? innerWidth + 80 : -80;
      const wave = t => `translate(${x0 + (x1 - x0) * t}px,${y0 + dy * t + Math.sin(t * 9) * 26}px)`;
      const anim = b.animate([0, .2, .4, .6, .8, 1].map(t => ({ transform: wave(t) })),
        { duration: 5200 + Math.random() * 2600, delay: i * 260 + Math.random() * 200, easing: "linear", fill: "both" });
      anim.onfinish = () => b.remove();
    }
  }
  setTimeout(bats, 9000 + Math.random() * 9000);
}
