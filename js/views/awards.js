import { PREMIO } from "../data.js";
import { S } from "../state.js";
import { $, esc, icon, toast } from "../utils.js";
import { api } from "../api.js";

/* ---------- Pantalla de premiación ---------- */
const STEPS = ["intro", "isla-t", "isla-3", "isla-2", "isla-1", "disfraz-t", "disfraz-3", "disfraz-2", "disfraz-1", "fin"];

// Al terminar la premiación se marca en la base (estado_concurso.premiacion_terminada): desde cualquier
// dispositivo se muestran directo los ganadores. Ocultar o volver a revelar resultados la reinicia.
function markDone() {
  if (S.state.awardsDone) return;
  S.state.awardsDone = true;
  api.call("hw_admin_state", { p_patch: { awardsDone: true } })
    .catch(e => { console.warn(e); S.state.awardsDone = false; toast("No se pudo marcar la premiación como terminada. Revisa la conexión.", true); });
}

const placeLbl = pl => pl === 1 ? "Ganador" : pl + ".º puesto";
// shown = cuántos puestos se ven (0-3); isNew = puesto que se acaba de revelar (anima)
function podium(kind, shown, isNew) {
  const res = S.state.results[kind] || [];
  const slot = pl => {
    const r = res[pl - 1];
    if (!r) return `<div class="pcard hid p${pl}"><span class="place">${pl}.º puesto</span><span class="meta">Sin participante</span></div>`;
    if (pl <= 3 - shown) return `<div class="pcard hid p${pl}"><span class="q">?</span><span class="place">${placeLbl(pl)}</span></div>`;
    return `<div class="pcard p${pl} ${isNew === pl ? "new" : ""}"><span class="place">${placeLbl(pl)}</span>
      <span class="who2">${esc(r.name)}</span><span class="meta">${esc(r.sub)}</span><span class="score">${r.total} / 120</span>
      ${pl === 1 ? `<span class="money">${PREMIO[kind]}</span>` : ""}</div>`;
  };
  return `<div class="podium">${slot(2)}${slot(1)}${slot(3)}</div>`;
}
const catTitle = kind => kind === "isla" ? "Isla mejor decorada" : "Mejor disfraz individual";

export function renderAwards() {
  const st = S.state, app = $("#app");
  if (!st.revealed || !st.results) {
    S.award.step = 0; S.award.summary = null;
    app.innerHTML = `<div class="stage"><img class="float-pk" src="img/calabaza-centro.webp" alt="">
      <h1>Los resultados duermen…</h1><p class="muted" style="max-width:46ch">Esta pantalla despierta cuando la organizadora presione "Revelar resultados". Déjala abierta: cambiará sola.</p>
      <button class="btn ghost" data-act="awexit">Volver</button></div>`;
    return;
  }
  if (S.award.summary == null) S.award.summary = !!st.awardsDone;
  if (S.award.summary) { renderWinners(); return; }
  const step = STEPS[S.award.step];
  const fresh = S.award.last !== S.award.step; S.award.last = S.award.step;
  let body;
  if (step === "intro") body = `<img class="float-pk" src="img/calabaza-centro.webp" alt=""><div class="cat">Globalem · Halloween 2026</div><h1>¡Llegó la premiación!</h1>`;
  else if (step === "fin") { markDone(); body = `<div class="cat">Gracias por asustarnos tan bonito</div><h1>¡Feliz Halloween, Globalem!</h1>`; }
  else {
    const [kind, part] = step.split("-");
    const shown = part === "t" ? 0 : 4 - (+part);
    body = `<div class="cat">${kind === "isla" ? "Categoría 1" : "Categoría 2"}</div>
      <h1>${catTitle(kind)}</h1>${podium(kind, shown, fresh && part !== "t" ? +part : 0)}`;
    if (fresh && part === "1") setTimeout(bats, 300);
  }
  const nextLbl = { intro: "Empezar", "isla-t": "Revelar 3.er puesto", "isla-3": "Revelar 2.º puesto", "isla-2": "Revelar ganador", "isla-1": "Siguiente categoría", "disfraz-t": "Revelar 3.er puesto", "disfraz-3": "Revelar 2.º puesto", "disfraz-2": "Revelar ganador", "disfraz-1": "Terminar", fin: "" }[step];
  app.innerHTML = `<div class="stage">${body}
    <div class="stage-ctl">${S.award.step > 0 ? `<button class="btn ghost" data-act="aw" data-d="-1">${icon("i-left")}Atrás</button>` : `<button class="btn ghost" data-act="awexit">Salir</button>`}
    ${nextLbl ? `<button class="btn pri" data-act="aw" data-d="1">${nextLbl}</button>` : `<button class="btn pri" data-act="awsummary">Ver ganadores</button>`}
    <button class="btn ghost" data-act="fs">Pantalla completa</button></div>
    <span class="muted" style="font-size:13px">También puedes avanzar con la barra espaciadora o las flechas.</span></div>`;
}

/* Ganadores de las dos categorías, ya revelados */
function renderWinners() {
  $("#app").innerHTML = `<div class="stage winners">
    <div class="cat">Globalem · Halloween 2026</div><h1>Ganadores</h1>
    ${["isla", "disfraz"].map((k, i) => `<section class="wcat"><div class="cat">Categoría ${i + 1}</div><h2>${catTitle(k)}</h2>${podium(k, 3, 0)}</section>`).join("")}
    <div class="stage-ctl"><button class="btn ghost" data-act="awexit">Salir</button>
      <a class="btn pri" href="resultados.html">Detalle de resultados</a>
      <button class="btn" data-act="awreplay">Ver la premiación de nuevo</button>
      <button class="btn ghost" data-act="fs">Pantalla completa</button></div></div>`;
}
export function showWinners() { S.award.summary = true; renderAwards(); }
export function replayAwards() { S.award.summary = false; S.award.step = 0; S.award.last = -1; renderAwards(); }
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
