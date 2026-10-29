import { S } from "./state.js";
import { $, esc, toast } from "./utils.js";
import { api } from "./api.js";
import { source, compute } from "./results.js";
import { pollNow } from "./sync.js";
import { renderAdmin } from "./views/admin.js";

/* ---------- Acciones de administración ---------- */
async function writeState(patch) {
  try { await api.call("hw_admin_state", { p_patch: patch }); await pollNow(); return true; }
  catch (e) { console.warn(e); toast(e.status ? e.message : "No se pudo guardar el cambio. Revisa la conexión.", true); return false; }
}

/* Confirmación antes de acciones delicadas */
export function ask(what, id) {
  if (what === "reveal" && !S.state.closed) { toast("Primero cierra la votación para poder revelar los resultados.", true); return; }
  const M = { close: { msg: "¿Cerrar la votación? Las notas se congelan y ningún jurado podrá cambiarlas.", ok: "Sí, cerrar", danger: true },
    open: { msg: S.state.revealed
      ? "¿Reabrir la votación? Los jurados podrán volver a cambiar notas y los resultados se reiniciarán: se ocultan de la pantalla de premiación y habrá que cerrar y revelar de nuevo."
      : "¿Reabrir la votación? Los jurados podrán volver a cambiar notas.", ok: "Reabrir", danger: !!S.state.revealed },
    reveal: { msg: "¿Revelar resultados? Se activará la pantalla de premiación con el top 3 de cada categoría.", ok: "Revelar resultados" },
    hide: { msg: "¿Ocultar los resultados de la pantalla de premiación?", ok: "Ocultar" },
    delp: { msg: `¿Quitar a ${esc(S.people.find(p => p.id === id)?.name || "")} del concurso?`, ok: "Quitar", danger: true } }[what];
  S.confirm = { ...M, what, id }; renderAdmin(); window.scrollTo({ top: 0, behavior: "smooth" });
}
export function cancelConfirm() { S.confirm = null; renderAdmin(); }
export async function doConfirm() {
  const c = S.confirm; S.confirm = null; renderAdmin();
  if (c.what === "close") {
    if (await writeState({ closed: true })) toast("Votación cerrada. ¡Que hablen los fantasmas!");
  } else if (c.what === "open") {
    // El servidor reinicia los resultados al reabrir; revealed:false lo deja explícito.
    const had = S.state.revealed;
    if (await writeState({ closed: false, revealed: false })) toast(had ? "Votación abierta de nuevo. Los resultados se reiniciaron." : "Votación abierta de nuevo.");
  } else if (c.what === "reveal") {
    const M = source(); const top = R => R.ranked.slice(0, 3).map(r => ({ place: r.place, name: r.name, sub: r.sub, total: r.total }));
    const results = { isla: top(compute("isla", M)), disfraz: top(compute("disfraz", M)), at: Date.now() };
    if (await writeState({ revealed: true, results })) toast("¡Resultados revelados! Abre la pantalla de premiación.");
  } else if (c.what === "hide") {
    if (await writeState({ revealed: false })) toast("Resultados ocultos.");
  } else if (c.what === "delp") {
    try { await api.call("hw_admin_remove_person", { p_id: +c.id }); await pollNow(); toast("Participante quitado."); } catch (e) { toast(e.message || "No se pudo quitar.", true); }
  }
}

/* Participantes */
export async function addPerson() {
  const name = $("#newName").value.trim(), group = +$("#newGroup").value;
  if (!name) { toast("Escribe el nombre del participante.", true); return; }
  try { await api.call("hw_admin_add_person", { p_name: name, p_group: group }); $("#newName").value = ""; await pollNow(); toast(`${name} se unió al aquelarre.`); }
  catch (e) { toast(e.message || "No se pudo agregar.", true); }
}
export function editPerson(id) { S.editId = id; renderAdmin(); }
export async function savePerson(id) {
  const name = $("#ed-name").value.trim(), group = +$("#ed-group").value;
  if (!name) { toast("El nombre no puede quedar vacío.", true); return; }
  S.editId = null;
  try { await api.call("hw_admin_update_person", { p_id: +id, p_name: name, p_group: group }); await pollNow(); toast("Cambios guardados."); } catch (e) { toast(e.message || "No se pudo guardar.", true); }
}

/* PIN */
export async function setPin(w) {
  const v = $("#pin-" + w).value.trim();
  if (!/^\d{4}$/.test(v)) { toast("El PIN debe tener exactamente 4 dígitos.", true); return; }
  try { await api.call("hw_admin_set_pin", { p_who: w, p_pin: v }); $("#pin-" + w).value = ""; toast("PIN guardado. ¡Que no lo vea ningún fantasma!"); }
  catch (e) { toast(e.message || "No se pudo guardar el PIN.", true); }
}
