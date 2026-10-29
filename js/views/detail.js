import { JUECES, GRUPOS, CRIT, PREMIO } from "../data.js";
import { $, esc, icon } from "../utils.js";
import { api, CONFIG_OK } from "../api.js";
import { bigTitle } from "./home.js";

/* ---------- Detalle de resultados (página independiente: resultados.html) ----------
   Solo con la premiación terminada (hw_results_detail responde {locked:true} antes). Lista de islas y
   participantes por puesto; al tocar uno, un modal con el total de cada criterio (suma de los 3 jurados).
   Consulta el estado cada 2,5 s: si reabren la votación u ocultan resultados, la página se bloquea sola. */
const MAX_C = JUECES.length * 10; // máximo por criterio
const norm = s => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
const D = { v: 0, done: null, data: null, error: false, tab: "isla", q: "", g: 0, open: null };

export function startDetailPage() {
  if (!CONFIG_OK) { $("#app").innerHTML = `<div class="detail stage-lite"><h2>Falta configurar config.js</h2></div>`; return; }
  bind(); poll(); setInterval(poll, 2500);
}

async function poll() {
  try {
    const pub = await api.rpc("hw_public", { p_v: D.v });
    if (pub.unchanged && !D.error) return;
    D.v = pub.v ?? D.v; D.error = false;
    D.done = !!pub.state?.awardsDone;
    if (D.done) {
      const r = await api.rpc("hw_results_detail");
      D.data = r.locked ? null : r; if (r.locked) D.done = false;
    } else { D.data = null; D.open = null; }
    render();
  } catch (e) {
    console.warn(e);
    if (!D.error) { D.error = true; D.v = 0; if (!D.data) render(); }
  }
}

// Filas listas para pintar: nombre, subtítulo, puesto, totales por criterio.
function rows(kind) {
  const d = D.data || {};
  if (kind === "isla") return (d.islas || []).map(r => ({ ...r, key: "isla-" + r.group, name: GRUPOS[r.group]?.isla || "Isla " + r.group, sub: GRUPOS[r.group]?.tema || "" }));
  return (d.disfraces || []).map(r => ({ ...r, key: "p-" + r.id, sub: `Grupo ${r.group} · ${GRUPOS[r.group]?.tema || ""}` }));
}
const placeTxt = p => p === 1 ? "Ganador" : `${p}.º puesto`;
const badge = r => r.excl ? `<span class="pbadge x" title="Excluido">${icon("i-x")}</span>` : `<span class="pbadge ${r.place <= 3 ? "top" + r.place : ""}">${r.place}</span>`;
const head = () => `<section class="hero dhero">${bigTitle()}</section>`;
const back = `<a class="btn ghost sm" href="index.html">${icon("i-left")}Inicio</a>`;

function render() {
  const app = $("#app");
  if (!D.data) {
    const msg = D.error ? "No logro comunicarme con la base de datos. Se reintenta solo cada pocos segundos."
      : D.done === null ? "Abriendo el libro de resultados…"
      : "El detalle de resultados se abre cuando termine la premiación. Deja esta página abierta: cambiará sola.";
    app.innerHTML = `${head()}<div class="detail stage-lite"><h2>Detalle de resultados</h2><p class="muted">${msg}</p>${back}</div>`;
    renderModal(); return;
  }
  if (!app.querySelector("#dlist")) {
    app.innerHTML = `${head()}<div class="detail">
      <div class="jhead"><div><div class="eyebrow">Globalem · Halloween 2026</div><h2>Detalle de resultados</h2></div>${back}</div>
      <p class="muted dnote">Puntaje total = suma de los 3 jurados (máx. 120). En empate gana la mayor suma en Creatividad y originalidad. Toca una isla o persona para ver el total de cada criterio.</p>
      <div class="tabs" role="tablist" id="dtabs"></div><div id="dfilters"></div><div id="dlist"></div></div>`;
  }
  renderControls(); renderList(); renderModal();
}

function renderControls() {
  $("#dtabs").innerHTML = `
    <button role="tab" class="${D.tab === "isla" ? "on" : ""}" data-act="dtab" data-t="isla">${icon("i-web")}Decoración</button>
    <button role="tab" class="${D.tab === "disfraz" ? "on" : ""}" data-act="dtab" data-t="disfraz">${icon("i-mask")}Disfraces</button>`;
  const f = $("#dfilters");
  if (D.tab !== "disfraz") { f.innerHTML = ""; return; }
  if (!f.querySelector("#dq")) f.innerHTML = `<div class="filters">
      <input class="search" id="dq" type="search" placeholder="Buscar por nombre…" value="${esc(D.q)}" autocomplete="off" aria-label="Buscar participante">
      <div class="chips" id="dchips"></div></div>`;
  $("#dchips").innerHTML = [0, 1, 2, 3, 4].map(g => `<button class="chip ${D.g === g ? "on" : ""}" data-act="dgrp" data-g="${g}">${g ? "Grupo " + g : "Todos"}</button>`).join("");
}

function renderList() {
  const box = $("#dlist"); if (!box) return;
  const q = norm(D.q.trim());
  const list = rows(D.tab).filter(r => D.tab === "isla" || ((!D.g || r.group === D.g) && (!q || norm(r.name).includes(q))));
  if (!list.length) { box.innerHTML = `<div class="empty">${D.tab === "isla" ? "Sin islas para mostrar." : "Nadie con ese nombre en esta fiesta."}</div>`; return; }
  box.innerHTML = `<div class="list">${list.map(r => `<button class="row drow ${!r.excl && r.place <= 3 ? "podio" : ""}" data-act="dopen" data-k="${r.key}">${badge(r)}
      <span class="nm"><b>${esc(r.name)}</b><span>${esc(r.sub)}${r.excl ? "" : " · " + placeTxt(r.place)}</span></span>
      <span class="pts">${r.excl ? `<span class="tag x">Excluido</span>` : `<b>${r.total}</b> / 120`}</span></button>`).join("")}</div>`;
}

/* Modal con el resumen de un ítem (total por criterio, sin notas individuales) */
function renderModal() {
  const root = $("#detailRoot");
  const r = D.open ? [...rows("isla"), ...rows("disfraz")].find(x => x.key === D.open) : null;
  if (!r) { if (root.innerHTML) { root.innerHTML = ""; document.body.style.overflow = ""; } return; }
  const kind = r.key.startsWith("isla-") ? "isla" : "disfraz";
  const body = r.excl
    ? `<div class="banner">Quedó <b>fuera del premio</b>: al menos un jurado marcó "No se disfrazó / no corresponde a la temática".</div>`
    : CRIT[kind].map((c, i) => `<div class="dcrit"><div class="crit-h"><b>${i + 1}. ${c.t}</b><span class="lab">${r.c[i]} / ${MAX_C}</span></div>
        <div class="bar"><i style="width:${Math.round(r.c[i] / MAX_C * 100)}%"></i></div></div>`).join("");
  root.innerHTML = `<div class="sheet-bg" data-act="dbg"><div class="sheet dsheet" role="dialog" aria-modal="true" aria-label="Resultado de ${esc(r.name)}">
    <div class="sh-head"><div class="t"><div class="eyebrow">${kind === "isla" ? "Isla mejor decorada" : "Mejor disfraz individual"}</div>
      <h2>${esc(r.name)}</h2><div class="sub">${esc(r.sub)}</div></div>
      <button class="icon-btn" data-act="dclose" aria-label="Cerrar">${icon("i-x")}</button></div>
    <div class="sh-body">
      ${r.excl ? "" : `<div class="dplace">${badge(r)}<span><b>${placeTxt(r.place)}</b>${r.place === 1 ? ` · Premio ${PREMIO[kind]}` : ""}</span></div>`}
      ${body}
    </div>
    <div class="sh-foot"><span class="st">Suma de los 3 jurados por criterio</span><span class="sum">${r.excl ? "Excluido" : `${r.total} / 120`}</span>
      <button class="btn pri" data-act="dclose">Cerrar</button></div>
  </div></div>`;
  document.body.style.overflow = "hidden";
}

function bind() {
  document.addEventListener("click", ev => {
    const el = ev.target.closest("[data-act]"); if (!el) return;
    const a = el.dataset.act;
    if (a === "dbg") { if (ev.target === el) { D.open = null; renderModal(); } return; }
    if (a === "dtab") { D.tab = el.dataset.t; renderControls(); renderList(); }
    else if (a === "dgrp") { D.g = +el.dataset.g; renderControls(); renderList(); }
    else if (a === "dopen") { D.open = el.dataset.k; renderModal(); }
    else if (a === "dclose") { D.open = null; renderModal(); }
  });
  document.addEventListener("input", ev => { if (ev.target.id === "dq") { D.q = ev.target.value; renderList(); } });
  document.addEventListener("keydown", ev => { if (ev.key === "Escape" && D.open) { D.open = null; renderModal(); } });
}
