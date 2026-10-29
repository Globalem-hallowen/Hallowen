import { GRUPOS, ISLAS } from "../data.js";
import { S } from "../state.js";
import { $, esc, icon } from "../utils.js";
import { itemsOf, isDone, sumC, countC } from "../items.js";
import { render } from "../router.js";
import { pollNow } from "../sync.js";

/* ---------- Jurado: lista de islas y disfraces ---------- */
export function enterJudge(j, fromRestore) {
  S.judge = j; S.view = "judge"; S.mine = {}; S.v.mine = 0;
  if (!fromRestore) { window.scrollTo(0, 0); render(); }
  pollNow();
}

export function renderJudge() {
  const closed = !!S.state.closed;
  $("#app").innerHTML = `
  <div class="jhead"><div><div class="eyebrow">Hola, ${esc(S.judge)}</div><h2>Tu libro de votos</h2></div>
    <button class="btn ghost sm" data-act="logout">Salir</button></div>
  ${closed ? `<div class="banner"><b>La votación está cerrada.</b> Los fantasmas ya están contando. Puedes ver tus notas, pero no cambiarlas.</div>` : ""}
  <div class="tabs" role="tablist">
    <button role="tab" class="${S.tab === "deco" ? "on" : ""}" data-act="tab" data-t="deco">${icon("i-web")}Decoración</button>
    <button role="tab" class="${S.tab === "disf" ? "on" : ""}" data-act="tab" data-t="disf">${icon("i-mask")}Disfraces</button>
  </div>
  <div class="progress"><div class="bar"><i id="pbar"></i></div><span id="ptxt"></span></div>
  ${S.tab === "disf" ? `<div class="filters">
    <input class="search" id="q" type="search" placeholder="Buscar por nombre…" value="${esc(S.q)}" autocomplete="off" aria-label="Buscar participante">
    <div class="chips">${[0, 1, 2, 3, 4].map(g => `<button class="chip ${S.g === g ? "on" : ""}" data-act="grp" data-g="${g}">${g ? "Grupo " + g : "Todos"}</button>`).join("")}</div>
  </div>` : ""}
  <div id="items"></div>`;
  renderJudgeDynamic();
}
export function renderJudgeDynamic() {
  const box = $("#items"); if (!box) return;
  const kind = S.tab === "deco" ? "isla" : "disfraz";
  const all = itemsOf(kind);
  const n = all.filter(it => isDone(S.mine[it.key])).length;
  $("#pbar").style.width = (all.length ? n / all.length * 100 : 0) + "%";
  $("#ptxt").textContent = `${n} de ${all.length} calificad${kind === "isla" ? "as" : "os"}`;
  // Check solo cuando está guardado y completo; si no, cuántos criterios lleva (en vivo si la hoja está abierta).
  const markOf = (key, e) => {
    const d = S.draft && S.draft.key === key ? S.draft : null;
    if (isDone(e) && !(d && !isDone(d))) return e.excl ? `<span class="mark excl" title="Excluido">${icon("i-x")}</span>` : `<span class="mark done" title="Calificado y guardado">${icon("i-check")}</span>`;
    const n = countC(d || e);
    return `<span class="mark count ${n ? "some" : ""}" title="${n} de 4 criterios evaluados">${n}/4</span>`;
  };
  if (kind === "isla") {
    box.innerHTML = `<div class="islas">${ISLAS.map(it => { const e = S.mine[it.key]; const G = GRUPOS[it.group];
      return `<button class="isla" data-act="open" data-k="${it.key}">${markOf(it.key, e)}
        <div class="eyebrow">Grupo ${it.group}</div><h3>${it.name}</h3><p>${esc(G.tema)}${G.detalle ? " · " + esc(G.detalle) : ""}</p>
        <span class="pts">${isDone(e) ? "Tu nota: " + sumC(e) + " / 40" : "Pendiente de calificar"}</span></button>`; }).join("")}</div>`;
    return;
  }
  const q = S.q.trim().toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
  const list = all.filter(it => (!S.g || it.group === S.g) && (!q || it.name.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").includes(q)));
  if (!S.people.length) { box.innerHTML = `<div class="empty">Todavía no hay participantes. La organizadora los agrega desde el panel.</div>`; return; }
  if (!list.length) { box.innerHTML = `<div class="empty">Nadie con ese nombre en esta fiesta. Revisa la búsqueda o el grupo.</div>`; return; }
  box.innerHTML = `<div class="list">${list.map(it => { const e = S.mine[it.key];
    return `<button class="row" data-act="open" data-k="${it.key}">${markOf(it.key, e)}
      <span class="nm"><b>${esc(it.name)}</b><span>Grupo ${it.group} · ${esc(GRUPOS[it.group]?.tema || "")}</span></span>
      <span class="pts">${isDone(e) ? (e.excl ? "Excluido" : sumC(e) + " / 40") : ""}</span></button>`; }).join("")}</div>`;
}
