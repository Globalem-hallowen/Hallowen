import { S } from "./state.js";
import { api } from "./api.js";
import { findItem } from "./items.js";

/* Guardado de notas: se envían las 4 notas juntas cuando el jurado presiona "Guardar". */
export const pend = {};
export const editedAt = {}; // último guardado local por ítem, para no pisarlo con una consulta que salió antes
export function busy(k) { return !!pend[k]; }

export async function saveScore(key, c, excl) {
  if (S.state.closed) { const err = new Error("La votación está cerrada."); err.status = 409; throw err; }
  pend[key] = true; editedAt[key] = Date.now();
  try {
    await api.call("hw_save_score", { p_key: key, p_c: c, p_excl: !!excl });
    S.mine[key] = { c: [...c], excl: !!excl, kind: findItem(key)?.kind, at: Date.now() };
    editedAt[key] = Date.now();
  } catch (err) {
    if (err.status) S.v.mine = 0; // fuerza a recargar lo que de verdad hay en el servidor
    throw err;
  } finally { delete pend[key]; }
}
