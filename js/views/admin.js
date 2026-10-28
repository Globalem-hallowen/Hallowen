import { JUECES, GRUPOS, ISLAS, PREMIO } from "../data.js";
import { S } from "../state.js";
import { $, esc } from "../utils.js";
import { itemsOf, isDone } from "../items.js";
import { source, compute } from "../results.js";
import { render } from "../router.js";
import { pollNow } from "../sync.js";

/* ---------- Panel de administración (pantalla) ---------- */
export function enterAdmin(fromRestore) {
  S.view = "admin"; S.v.adm = 0;
  if (!fromRestore) { window.scrollTo(0, 0); render(); }
  pollNow();
}

export function renderAdmin() {
  if (S.view !== "admin") return;
  const st = S.state, M = source();
  const RI = compute("isla", M), RD = compute("disfraz", M);
  const alerts = [...RI.rows, ...RD.rows].filter(r => !r.excluded && r.missing.length);
  const T = S.adminTab;
  const html = `
  <div class="jhead"><div><div class="eyebrow">Panel de la organizadora</div><h2>Caldero de control</h2></div>
    <button class="btn ghost sm" data-act="logout">Salir</button></div>
  <div class="status">
    <span class="pill ${st.closed ? "closed" : "open"}">${st.closed ? "Votación cerrada" : "Votación abierta"}</span>
    <span class="pill ${st.revealed ? "rev" : ""}">${st.revealed ? "Resultados revelados" : "Resultados ocultos"}</span>
  </div>
  <div class="actions">
    ${st.closed ? `<button class="btn" data-act="ask" data-what="open">Reabrir votación</button>` : `<button class="btn red" data-act="ask" data-what="close">Cerrar votación</button>`}
    ${st.revealed ? `<button class="btn" data-act="ask" data-what="hide">Ocultar resultados</button>` : `<button class="btn pri" data-act="ask" data-what="reveal">Revelar resultados</button>`}
    <button class="btn" data-act="export" data-what="scores">Exportar calificaciones (CSV)</button>
    <button class="btn" data-act="export" data-what="results">Exportar resultados (CSV)</button>
    <button class="btn ghost" data-act="awards">Pantalla de premiación</button>
  </div>
  ${S.confirm ? `<div class="confirm"><span>${S.confirm.msg}</span><div><button class="btn ${S.confirm.danger ? "red" : "pri"}" data-act="doconfirm">${S.confirm.ok}</button><button class="btn ghost" data-act="cancelconfirm">Cancelar</button></div></div>` : ""}
  <div class="atabs" role="tablist">
    ${[["avance", "Avance"], ["resultados", "Resultados en vivo"], ["alertas", "Alertas"], ["participantes", "Participantes"], ["ajustes", "Ajustes"]].map(([k, l]) =>
      `<button class="${T === k ? "on" : ""}" data-act="atab" data-t="${k}">${l}${k === "alertas" && alerts.length ? ` <span class="badge">${alerts.length}</span>` : ""}</button>`).join("")}
  </div>
  <div id="atab">${T === "avance" ? avanceTab(M) : T === "resultados" ? resultsTab(RI, RD) : T === "alertas" ? alertsTab(alerts, RD) : T === "participantes" ? peopleTab() : settingsTab()}</div>`;
  const keep = document.activeElement && document.activeElement.id;
  const val = keep && document.activeElement.value;
  $("#app").innerHTML = html;
  if (keep && $("#" + keep)) { const el = $("#" + keep); if (val != null && el.value !== undefined) el.value = val; el.focus(); }
}

/* Pestañas */
function avanceTab(M) {
  const nI = ISLAS.length, nD = S.people.length;
  return `<div class="grid2">${JUECES.map(j => {
    const di = ISLAS.filter(it => isDone(M[j]?.[it.key])).length;
    const dd = itemsOf("disfraz").filter(it => isDone(M[j]?.[it.key])).length;
    const last = Math.max(0, ...Object.values(M[j] || {}).map(e => e.at || 0));
    return `<div class="panel"><h3>${j}</h3>
      <div class="kv"><div class="l"><span>Decoración</span><b>${di} de ${nI}</b></div><div class="bar"><i style="width:${di / nI * 100}%"></i></div></div>
      <div class="kv"><div class="l"><span>Disfraces</span><b>${dd} de ${nD}</b></div><div class="bar"><i style="width:${nD ? dd / nD * 100 : 0}%"></i></div></div>
      <span class="muted" style="font-size:13px">${last ? "Última nota: " + new Date(last).toLocaleTimeString("es-CO", { hour: "numeric", minute: "2-digit" }) : "Aún no ha calificado"}</span>
    </div>`; }).join("")}</div>`;
}
function resultsTable(R, kind) {
  const head = `<tr><th>#</th><th>${kind === "isla" ? "Isla" : "Participante"}</th><th>Grupo</th>${JUECES.map(j => `<th class="num">${j}</th>`).join("")}<th class="num">Total / 120</th><th class="num">Creatividad</th><th>Estado</th></tr>`;
  const body = [...R.ranked, ...R.excluded].map(r => `<tr class="${r.place === 1 && !r.excluded ? "top1" : ""}">
    <td>${r.excluded ? "–" : r.place + (r.tie ? "=" : "")}</td><td>${esc(r.name)}</td><td>${r.group}</td>
    ${JUECES.map(j => `<td class="num">${r.per[j] == null ? "–" : r.per[j]}</td>`).join("")}
    <td class="num tot">${r.excluded ? "–" : r.total}</td><td class="num">${r.excluded ? "–" : r.creat}</td>
    <td>${r.excluded ? `<span class="tag x">Excluido (${r.exclBy.join(", ")})</span>` : r.missing.length ? `<span class="tag w">Falta: ${r.missing.join(", ")}</span>` : `<span class="tag ok">Completo</span>`}${r.tieBreak ? ` <span class="tag w">Gana desempate</span>` : ""}${r.tie ? ` <span class="tag w">Empate total</span>` : ""}</td></tr>`).join("");
  return `<div class="tbl-wrap"><table><thead>${head}</thead><tbody>${body}</tbody></table></div>`;
}
function resultsTab(RI, RD) {
  return `<p class="muted" style="margin-top:0">Se actualiza en tiempo real. Puntaje = suma de los tres jurados; el empate lo rompe la suma en "Creatividad y originalidad". Solo tú ves esta tabla.</p>
  <div class="section-t"><h3>Isla mejor decorada</h3><span class="muted">Premio ${PREMIO.isla}</span></div>${resultsTable(RI, "isla")}
  <div class="section-t"><h3>Mejor disfraz individual</h3><span class="muted">Premio ${PREMIO.disfraz}</span></div>${resultsTable(RD, "disfraz")}`;
}
function alertsTab(alerts, RD) {
  return `<div class="list">${alerts.length ? alerts.map(r => `<div class="alert"><div><b>${esc(r.name)}</b><span>${r.kind === "isla" ? "Decoración" : "Disfraz"} · ${esc(r.sub)} · Falta la calificación de <b style="display:inline">${r.missing.join(", ")}</b></span></div></div>`).join("")
    : `<div class="empty">Sin alertas: nadie se quedó sin su nota. ¡Hechizo completo!</div>`}
  ${RD.excluded.length ? `<div class="section-t"><h3>Excluidos del premio</h3></div>` + RD.excluded.map(r => `<div class="alert x"><div><b>${esc(r.name)}</b><span>${esc(r.sub)} · Marcado como "No se disfrazó / no corresponde" por ${r.exclBy.join(", ")}</span></div></div>`).join("") : ""}</div>`;
}
function peopleTab() {
  const byG = [1, 2, 3, 4].map(g => ({ g, list: S.people.filter(p => p.group === g) }));
  return `<div class="panel"><h3>Agregar participante</h3>
    <div class="addform"><input class="inp" id="newName" placeholder="Nombre y apellido" autocomplete="off">
    <select class="inp" id="newGroup">${[1, 2, 3, 4].map(g => `<option value="${g}">Grupo ${g} · ${GRUPOS[g].tema}</option>`).join("")}</select>
    <button class="btn pri" data-act="addp">Agregar</button></div></div>
  <div class="grid2" style="margin-top:12px">${byG.map(({ g, list }) => `<div class="panel"><h3>Grupo ${g}</h3><span class="muted" style="font-size:13px">${GRUPOS[g].isla} · ${GRUPOS[g].tema} · ${list.length} personas</span>
    <div>${list.map(p => S.editId === p.id ? `<div class="prow">
        <input class="inp n" id="ed-name" value="${esc(p.name)}"><select class="inp" id="ed-group">${[1, 2, 3, 4].map(x => `<option value="${x}" ${x === p.group ? "selected" : ""}>G${x}</option>`).join("")}</select>
        <button class="btn sm pri" data-act="savep" data-id="${p.id}">Guardar</button><button class="btn sm ghost" data-act="cancelp">Cancelar</button></div>`
      : `<div class="prow"><span class="n">${esc(p.name)}</span><button class="btn sm ghost" data-act="editp" data-id="${p.id}">Editar</button><button class="btn sm ghost" data-act="ask" data-what="delp" data-id="${p.id}">Quitar</button></div>`).join("") || `<div class="muted">Sin participantes</div>`}</div></div>`).join("")}</div>`;
}
function settingsTab() {
  return `<div class="grid2">${[...JUECES, "admin"].map(w => `<div class="panel"><h3>${w === "admin" ? "PIN del panel" : "PIN de " + w}</h3>
    <span class="muted" style="font-size:13px">Escribe un PIN nuevo de 4 dígitos para reemplazar el actual.</span>
    <div class="addform"><input class="inp" id="pin-${w}" inputmode="numeric" maxlength="4" placeholder="4 dígitos" autocomplete="off"><button class="btn sm pri" data-act="setpin" data-who="${w}">Guardar PIN</button></div></div>`).join("")}</div>
    <p class="muted">Al cambiar un PIN, las sesiones abiertas siguen activas hasta que el jurado presione "Salir".</p>`;
}
