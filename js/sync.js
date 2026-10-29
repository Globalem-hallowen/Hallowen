import { S } from "./state.js";
import { ls, toast } from "./utils.js";
import { api } from "./api.js";
import { sortPeople } from "./items.js";
import { busy, editedAt } from "./scores.js";
import { render, refresh, go } from "./router.js";
import { enterJudge } from "./views/judge.js";
import { enterAdmin } from "./views/admin.js";

/* Tiempo real: consulta cada 2,5 s; el servidor responde "sin cambios" si nada se movió. */
export async function poll() {
  try {
    let changed = false;
    const pub = await api.rpc("hw_public", { p_v: S.v.pub });
    if (!pub.unchanged) { changed = true; S.v.pub = pub.v; S.people = sortPeople(pub.people); S.state = { ...S.state, ...pub.state }; }
    if (S.view === "judge") {
      const t0 = Date.now();
      const m = await api.call("hw_mine", { p_v: S.v.mine });
      // Una respuesta pedida antes de la última edición local trae datos viejos para ese ítem: se ignora.
      if (!m.unchanged) { changed = true; S.v.mine = m.v; Object.entries(m.scores).forEach(([k, e]) => { if (!busy(k) && !(editedAt[k] >= t0)) S.mine[k] = e; }); }
    } else if (S.view === "admin") {
      const a = await api.call("hw_admin_all", { p_v: S.v.adm });
      if (!a.unchanged) { changed = true; S.v.adm = a.v; S.all = a.scores; S.state = { ...S.state, ...a.state }; }
    }
    const wasOffline = S.offline; S.offline = false;
    if (!S.loaded) { S.loaded = true; await restore(); render(); }
    else if (wasOffline || changed) refresh();
  } catch (e) {
    if (e.status === 401 && (S.view === "judge" || S.view === "admin")) { toast("Tu sesión expiró. Entra de nuevo con tu PIN.", true); logout(true); return; }
    if (!S.offline) { S.offline = true; if (!S.loaded) render(); else toast("Sin conexión con el servidor. Reintentando…", true); }
  }
}
export async function pollNow() { S.v.adm = 0; S.v.mine = 0; await poll(); }
export function startSync() { poll(); setInterval(poll, 2500); }

/* Sesión */
async function restore() {
  if (ls.get("hw26-view") === "awards") { S.view = "awards"; return; }
  if (!api.token) return;
  try {
    const s = await api.call("hw_session");
    if (s.role === "judge") enterJudge(s.judge, true); else if (s.role === "admin") enterAdmin(true);
  } catch (e) { api.setToken(null); }
}
export async function logout(silent) {
  if (!silent) { try { await api.call("hw_logout"); } catch (e) {} }
  api.setToken(null); S.judge = null; S.mine = {}; S.all = {}; go("home");
}
