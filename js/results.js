import { JUECES, GRUPOS, CREAT } from "./data.js";
import { S } from "./state.js";
import { itemsOf, isDone, sumC } from "./items.js";

/* ---------- Cálculo de resultados ---------- */
// Notas de los tres jurados: { Jorge: { "isla-1": {c, excl, at}, ... }, ... }
export function source() {
  const out = {}; JUECES.forEach(j => out[j] = { ...(S.all[j] || {}) });
  return out;
}

// Puntaje = suma de los tres jurados; empate: mayor suma en Creatividad. Un "excluido" de cualquier jurado saca del premio.
export function compute(kind, M) {
  const rows = itemsOf(kind).map(it => {
    const per = {}; let total = 0, creat = 0; const missing = [], exclBy = [];
    JUECES.forEach(j => {
      const e = M[j]?.[it.key];
      if (e && e.excl && kind === "disfraz") exclBy.push(j);
      if (!isDone(e)) missing.push(j);
      const s = e && !e.excl ? sumC(e) : null; per[j] = e ? (e.excl ? "X" : s) : null;
      if (e && !e.excl) { total += s; creat += e.c?.[CREAT] || 0; }
    });
    const G = GRUPOS[it.group] || {};
    return { ...it, per, total, creat, missing, exclBy, excluded: exclBy.length > 0, sub: `Grupo ${it.group} · ${G.tema || ""}` };
  });
  const ranked = rows.filter(r => !r.excluded).sort((a, b) => b.total - a.total || b.creat - a.creat || a.name.localeCompare(b.name, "es"));
  let place = 0;
  ranked.forEach((r, i) => {
    const prev = ranked[i - 1];
    r.tie = !!prev && prev.total === r.total && prev.creat === r.creat;
    if (!r.tie) place = i + 1;
    r.place = place;
  });
  ranked.forEach((r, i) => { const nx = ranked[i + 1]; if (nx && nx.total === r.total && r.creat > nx.creat) r.tieBreak = true; });
  return { rows, ranked, excluded: rows.filter(r => r.excluded) };
}
