import { GRUPOS, CRIT, SAVED_MSGS, label } from "../data.js";
import { S } from "../state.js";
import { $, esc, icon, toast } from "../utils.js";
import { findItem, isDone, sumC, countC } from "../items.js";
import { saveScore } from "../scores.js";
import { renderJudgeDynamic } from "./judge.js";

/* ---------- Hoja de calificación ----------
   Las notas se editan en un borrador (S.draft) y solo se guardan con "Guardar", cuando los 4 criterios
   tienen nota (o el disfraz está excluido). Al cerrar: completo y con cambios → se guarda solo;
   incompleto y con cambios → se pide confirmar que se descartará. */
const EMPTY = () => ({ c: [null, null, null, null], excl: false });
const same = (a, b) => !!a.excl === !!b.excl && [0, 1, 2, 3].every(i => (a.c?.[i] || null) === (b.c?.[i] || null));
const saved = key => S.mine[key] || EMPTY();
const dirty = d => !same(d, saved(d.key));

export function openSheet(key) {
  const e = saved(key);
  S.sheet = key; S.draft = { key, c: [...(e.c || [null, null, null, null])], excl: !!e.excl, saving: false, ask: false };
  renderSheet();
}

// soft = repintar valores sin reconstruir la hoja (tiempo real).
export function renderSheet(soft) {
  const root = $("#sheetRoot");
  if (!S.sheet || S.view !== "judge") { S.sheet = null; S.draft = null; root.innerHTML = ""; document.body.style.overflow = ""; return; }
  const it = findItem(S.sheet); if (!it) { S.sheet = null; S.draft = null; root.innerHTML = ""; document.body.style.overflow = ""; return; }
  if (!S.draft || S.draft.key !== it.key) { openSheet(it.key); return; }
  if (soft && root.querySelector(".sheet")?.dataset.k === it.key) { paintSheet(it); return; }
  const G = GRUPOS[it.group] || {};
  const crit = CRIT[it.kind];
  root.innerHTML = `<div class="sheet-bg" data-act="bgclose"><div class="sheet" data-k="${it.key}" role="dialog" aria-modal="true" aria-label="Calificar ${esc(it.name)}">
    <div class="sh-head">
      <div class="t"><div class="eyebrow">${it.kind === "isla" ? "Isla mejor decorada" : "Mejor disfraz individual"}</div>
        <h2>${esc(it.name)}</h2><div class="sub">Grupo ${it.group} · ${esc(G.tema || "")}${G.detalle ? " (" + esc(G.detalle) + ")" : ""}</div></div>
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
      <button class="btn pri" data-act="save" id="shsave">Guardar</button></div>
    <div class="sh-ask" id="shask" hidden><div class="box" role="alertdialog" aria-labelledby="askT">
      <h3 id="askT">¿Cerrar sin guardar?</h3><p id="askP"></p>
      <div class="row2"><button class="btn ghost" data-act="keepedit">Seguir calificando</button><button class="btn red" data-act="discard">Cerrar sin guardar</button></div>
    </div></div>
  </div></div>`;
  document.body.style.overflow = "hidden";
  paintSheet(it);
}

function paintSheet(it) {
  const d = S.draft, closed = !!S.state.closed, excl = !!d.excl, lock = closed || d.saving;
  const cb = $("#excl"); if (cb) { cb.checked = excl; cb.disabled = lock; $("#exclBox").classList.toggle("on", excl); }
  for (let i = 0; i < 4; i++) {
    const v = d.c[i] || 0;
    const box = $("#crit" + i); box.classList.toggle("off", excl);
    box.querySelectorAll("button").forEach(b => { const on = +b.dataset.n === v; b.classList.toggle("on", on); b.setAttribute("aria-pressed", on); b.disabled = lock; });
    $("#lab" + i).textContent = v ? `${v} · ${label(v)}` : "";
  }
  const done = isDone(d), wasSaved = isDone(saved(it.key)), changed = dirty(d);
  $("#shst").textContent = closed ? "Votación cerrada" : d.saving ? "Guardando…"
    : excl ? (changed ? "Listo para guardar" : "Guardado ✓")
    : !done ? `${countC(d)} de 4 criterios evaluados` : changed ? "Listo para guardar" : "Guardado ✓";
  $("#shsum").textContent = excl ? "Excluido" : `${sumC(d)} / 40`;
  const btn = $("#shsave");
  btn.textContent = closed ? "Cerrar" : d.saving ? "Guardando…" : wasSaved ? "Actualizar" : "Guardar";
  btn.disabled = !closed && (d.saving || !done);
  btn.title = !closed && !done ? "Califica los 4 criterios para poder guardar" : "";
  const ask = $("#shask"); ask.hidden = !d.ask;
  if (d.ask) $("#askP").textContent = `Evaluaste ${countC(d)} de 4 criterios de ${it.name}. Si cierras ahora, estas notas no se guardarán.`;
}

function repaint() { renderJudgeDynamic(); const it = findItem(S.sheet); if (it) paintSheet(it); }

export function setDraftScore(i, n) {
  const d = S.draft; if (!d || d.saving || S.state.closed) return;
  d.c[i] = n; repaint();
}
export function setDraftExcl(v) {
  const d = S.draft; if (!d || d.saving || S.state.closed) return;
  d.excl = v; repaint();
}

function finish() { S.sheet = null; S.draft = null; renderSheet(); renderJudgeDynamic(); }

/* Guardar (botón) o guardado automático al cerrar con todo completo */
export async function saveDraft(auto) {
  const d = S.draft; if (!d || d.saving) return;
  if (S.state.closed) { finish(); return; }
  if (!isDone(d)) { toast("Califica los 4 criterios antes de guardar.", true); return; }
  if (!dirty(d)) { finish(); return; }
  d.saving = true; d.ask = false; repaint();
  try {
    await saveScore(d.key, d.c, d.excl);
    finish();
    toast(auto ? "Tenías todo calificado: se guardó automáticamente ✓" : SAVED_MSGS[Math.floor(Math.random() * SAVED_MSGS.length)]);
  } catch (err) {
    console.warn(err);
    if (S.draft === d) { d.saving = false; repaint(); }
    toast(err.status ? err.message : "No se pudo guardar. Revisa tu conexión e intenta de nuevo.", true);
  }
}

/* Cerrar con la X, el fondo o Escape */
export function requestClose() {
  const d = S.draft; if (!d) { finish(); return; }
  if (d.saving) return;
  if (d.ask) { keepEditing(); return; }
  if (S.state.closed || !dirty(d)) { finish(); return; }
  if (isDone(d)) { saveDraft(true); return; }
  d.ask = true; repaint();
}
export function keepEditing() { if (S.draft) { S.draft.ask = false; repaint(); } }
export function discardDraft() { finish(); toast("No se guardaron las notas."); }
