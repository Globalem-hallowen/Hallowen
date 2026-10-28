import { PREMIO } from "../data.js";
import { S } from "../state.js";
import { $, esc, icon } from "../utils.js";

/* ---------- Pantalla de premiación ---------- */
const STEPS = ["intro", "isla-t", "isla-3", "isla-2", "isla-1", "disfraz-t", "disfraz-3", "disfraz-2", "disfraz-1", "fin"];

export function renderAwards() {
  const st = S.state, app = $("#app");
  if (!st.revealed || !st.results) {
    S.award.step = 0;
    app.innerHTML = `<div class="stage"><svg class="float-pk" viewBox="0 0 64 64"><use href="#i-pumpkin"/></svg>
      <h1>Los resultados duermen…</h1><p class="muted" style="max-width:46ch">Esta pantalla despierta cuando la organizadora presione "Revelar resultados". Déjala abierta: cambiará sola.</p>
      <button class="btn ghost" data-act="home">Volver</button></div>`;
    return;
  }
  const step = STEPS[S.award.step];
  const fresh = S.award.last !== S.award.step; S.award.last = S.award.step;
  let body;
  if (step === "intro") body = `<svg class="float-pk" viewBox="0 0 64 64"><use href="#i-pumpkin"/></svg><div class="cat">Globalem · Halloween 2026</div><h1>¡Llegó la premiación!</h1>`;
  else if (step === "fin") body = `<div class="cat">Gracias por asustarnos tan bonito</div><h1>¡Feliz Halloween, Globalem!</h1>`;
  else {
    const [kind, part] = step.split("-");
    const res = st.results[kind] || [];
    const shown = part === "t" ? 0 : 4 - (+part); // cuántos puestos se ven
    const slot = pl => {
      const r = res[pl - 1]; const vis = pl > 3 - shown;
      if (!r) return `<div class="pcard hid p${pl}"><span class="place">${pl}.º puesto</span><span class="meta">Sin participante</span></div>`;
      if (!vis) return `<div class="pcard hid p${pl}"><span class="q">?</span><span class="place">${pl === 1 ? "Ganador" : pl + ".º puesto"}</span></div>`;
      const isNew = fresh && part !== "t" && +part === pl;
      return `<div class="pcard p${pl} ${isNew ? "new" : ""}"><span class="place">${pl === 1 ? "Ganador" : pl + ".º puesto"}</span>
        <span class="who2">${esc(r.name)}</span><span class="meta">${esc(r.sub)}</span><span class="score">${r.total} / 120</span>
        ${pl === 1 ? `<span class="money">${PREMIO[kind]}</span>` : ""}</div>`;
    };
    body = `<div class="cat">${kind === "isla" ? "Categoría 1" : "Categoría 2"}</div>
      <h1>${kind === "isla" ? "Isla mejor decorada" : "Mejor disfraz individual"}</h1>
      <div class="podium">${slot(2)}${slot(1)}${slot(3)}</div>`;
    if (fresh && part === "1") setTimeout(bats, 300);
  }
  const nextLbl = { intro: "Empezar", "isla-t": "Revelar 3.er puesto", "isla-3": "Revelar 2.º puesto", "isla-2": "Revelar ganador", "isla-1": "Siguiente categoría", "disfraz-t": "Revelar 3.er puesto", "disfraz-3": "Revelar 2.º puesto", "disfraz-2": "Revelar ganador", "disfraz-1": "Terminar", fin: "" }[step];
  app.innerHTML = `<div class="stage">${body}
    <div class="stage-ctl">${S.award.step > 0 ? `<button class="btn ghost" data-act="aw" data-d="-1">${icon("i-left")}Atrás</button>` : `<button class="btn ghost" data-act="home">Salir</button>`}
    ${nextLbl ? `<button class="btn pri" data-act="aw" data-d="1">${nextLbl}</button>` : `<button class="btn ghost" data-act="aw" data-d="-99">Ver de nuevo</button>`}
    <button class="btn ghost" data-act="fs">Pantalla completa</button></div>
    <span class="muted" style="font-size:13px">También puedes avanzar con la barra espaciadora o las flechas.</span></div>`;
}
export function awardStep(d) { S.award.step = Math.max(0, Math.min(STEPS.length - 1, S.award.step + d)); if (d < 0) S.award.last = S.award.step; renderAwards(); }
export function toggleFullscreen() { const r = document.documentElement; (document.fullscreenElement ? document.exitFullscreen() : r.requestFullscreen?.())?.catch?.(() => {}); }

// Murciélagos que salen volando al revelar un ganador.
function bats() {
  if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  for (let i = 0; i < 14; i++) {
    const b = document.createElement("div"); b.className = "flyer";
    b.innerHTML = `<svg viewBox="0 0 64 40" style="color:${i % 3 ? "#8fa6b8" : "#F2A33A"}"><use href="#i-bat"/></svg>`;
    b.style.left = (Math.random() * 90 + 5) + "vw"; b.style.top = "100vh"; b.style.setProperty("--dx", (Math.random() * 200 - 100) + "px");
    b.style.animationDelay = (Math.random() * .8) + "s";
    document.body.appendChild(b); setTimeout(() => b.remove(), 3800);
  }
}
