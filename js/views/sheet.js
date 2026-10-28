import { GRUPOS, ISLAS, CRIT, label } from "../data.js";
import { S } from "../state.js";
import { $, esc, icon, toast } from "../utils.js";
import { itemsOf, findItem, isDone, sumC } from "../items.js";
import { pend } from "../scores.js";

/* ---------- Hoja de calificación ---------- */
// soft = repintar valores sin reconstruir la hoja (tiempo real y guardado).
export function renderSheet(soft) {
  const root = $("#sheetRoot");
  if (!S.sheet || S.view !== "judge") { root.innerHTML = ""; document.body.style.overflow = ""; return; }
  const it = findItem(S.sheet); if (!it) { S.sheet = null; root.innerHTML = ""; document.body.style.overflow = ""; return; }
  const e = S.mine[it.key] || { c: [null, null, null, null], excl: false };
  const closed = !!S.state.closed;
  if (soft && root.querySelector(".sheet")?.dataset.k === it.key) { paintSheet(it, e, closed); return; }
  const G = GRUPOS[it.group] || {};
  const crit = CRIT[it.kind];
  root.innerHTML = `<div class="sheet-bg" data-act="bgclose"><div class="sheet" data-k="${it.key}" role="dialog" aria-modal="true" aria-label="Calificar ${esc(it.name)}">
    <div class="sh-head">
      <button class="icon-btn" data-act="nav" data-d="-1" aria-label="Anterior">${icon("i-left")}</button>
      <div class="t"><div class="eyebrow">${it.kind === "isla" ? "Isla mejor decorada" : "Mejor disfraz individual"}</div>
        <h2>${esc(it.name)}</h2><div class="sub">Grupo ${it.group} · ${esc(G.tema || "")}${G.detalle ? " (" + esc(G.detalle) + ")" : ""}</div></div>
      <button class="icon-btn" data-act="nav" data-d="1" aria-label="Siguiente">${icon("i-right")}</button>
      <button class="icon-btn" data-act="close" aria-label="Cerrar">${icon("i-x")}</button>
    </div>
    <div class="sh-body">
      <div class="scale"><span><b>1-2</b> Deficiente</span><span><b>3-4</b> Regular</span><span><b>5-6</b> Bueno</span><span><b>7-8</b> Muy bueno</span><span><b>9-10</b> Excelente</span></div>
      ${it.kind === "disfraz" ? `<label class="excl" id="exclBox"><input type="checkbox" id="excl" data-act="excl"><span><b>No se disfrazó / no corresponde a la temática</b><br><span class="muted" style="font-size:13px">Lo excluye del premio. No hace falta calificar los criterios.</span></span></label>` : ""}
      ${crit.map((c, i) => `<div class="crit" id="crit${i}">
        <div class="crit-h"><b>${i + 1}. ${c.t}</b><span class="lab" id="lab${i}"></span></div>
        <p>${c.d}</p>
        <div class="nums">${[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(n => `<button data-act="score" data-i="${i}" data-n="${n}" aria-label="${c.t}: ${n}">${n}</button>`).join("")}</div>
      </div>`).join("")}
    </div>
    <div class="sh-foot"><span class="st" id="shst"></span><span class="sum" id="shsum"></span>
      <button class="btn pri" data-act="nextpend">Siguiente pendiente</button></div>
  </div></div>`;
  document.body.style.overflow = "hidden";
  paintSheet(it, e, closed);
}
function paintSheet(it, e, closed) {
  const excl = !!e.excl;
  const cb = $("#excl"); if (cb) { cb.checked = excl; cb.disabled = closed; $("#exclBox").classList.toggle("on", excl); }
  for (let i = 0; i < 4; i++) {
    const v = e.c?.[i] || 0;
    const box = $("#crit" + i); box.classList.toggle("off", excl);
    box.querySelectorAll("button").forEach(b => { const on = +b.dataset.n === v; b.classList.toggle("on", on); b.setAttribute("aria-pressed", on); b.disabled = closed; });
    $("#lab" + i).textContent = v ? `${v} · ${label(v)}` : "";
  }
  const st = $("#shst"), p = pend[it.key];
  st.textContent = closed ? "Votación cerrada" : (p && (p.t || p.n)) ? "Guardando…" : isDone(e) ? "Guardado ✓" : excl ? "" : "Faltan criterios por calificar";
  $("#shsum").textContent = excl ? "Excluido" : `${sumC(e)} / 40`;
}
export function closeSheet() { S.sheet = null; renderSheet(); }

/* Navegación entre islas o participantes, respetando la búsqueda y el filtro de grupo */
export function sheetNav(d) {
  const it = findItem(S.sheet); if (!it) return;
  const list = navList(it.kind);
  const i = list.findIndex(x => x.key === it.key);
  const next = list[(i + d + list.length) % list.length];
  if (next) { S.sheet = next.key; renderSheet(); }
}
function navList(kind) {
  if (kind === "isla") return ISLAS;
  const q = S.q.trim().toLowerCase();
  const l = itemsOf("disfraz").filter(it => (!S.g || it.group === S.g) && (!q || it.name.toLowerCase().includes(q)));
  return l.length ? l : itemsOf("disfraz");
}
export function nextPending() {
  const it = findItem(S.sheet); if (!it) return;
  const list = navList(it.kind); const i = list.findIndex(x => x.key === it.key);
  for (let k = 1; k <= list.length; k++) { const c = list[(i + k) % list.length]; if (!isDone(S.mine[c.key])) { S.sheet = c.key; renderSheet(); return; } }
  S.sheet = null; renderSheet(); toast(it.kind === "isla" ? "¡Todas las islas calificadas! 🎃" : "¡Ya calificaste a todos! Los murciélagos aplauden.");
}
