import { SAVED_MSGS } from "./data.js";
import { S } from "./state.js";
import { toast } from "./utils.js";
import { api } from "./api.js";
import { findItem } from "./items.js";
import { renderJudgeDynamic } from "./views/judge.js";
import { renderSheet } from "./views/sheet.js";

/* Guardado de notas: una escritura a la vez por documento, agrupando toques rápidos. */
export const pend = {};
export function busy(k) { const p = pend[k]; return p && (p.t || p.n); }
let lastToast = 0;
export function setScore(key, patch) {
  if (S.state.closed) { toast("La votación está cerrada.", true); return; }
  const it = findItem(key);
  const e = S.mine[key] ? { ...S.mine[key], c: [...(S.mine[key].c || [null, null, null, null])] } : { c: [null, null, null, null], excl: false };
  if ("i" in patch) e.c[patch.i] = patch.n;
  if ("excl" in patch) e.excl = patch.excl;
  e.kind = it.kind; e.at = Date.now();
  S.mine[key] = e;
  const p = pend[key] || (pend[key] = { t: null, n: 0, chain: Promise.resolve() });
  clearTimeout(p.t);
  p.t = setTimeout(() => {
    p.t = null; p.n++;
    const body = { c: S.mine[key].c, excl: !!S.mine[key].excl };
    p.chain = p.chain.then(() => api.call("hw_save_score", { p_key: key, p_c: body.c, p_excl: body.excl }))
      .then(() => { if (Date.now() - lastToast > 1800) { lastToast = Date.now(); toast(SAVED_MSGS[Math.floor(Math.random() * SAVED_MSGS.length)]); } })
      .catch(err => { console.warn(err); toast(err.status ? err.message : "No se pudo guardar. Revisa tu conexión y vuelve a tocar la nota.", true); if (err.status) S.v.mine = 0; })
      .finally(() => { p.n--; if (S.view === "judge") { renderJudgeDynamic(); renderSheet(true); } });
  }, 350);
  renderJudgeDynamic(); renderSheet(true);
}
