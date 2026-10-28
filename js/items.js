import { ISLAS } from "./data.js";
import { S } from "./state.js";

/* ---------- Islas y participantes que se califican ---------- */
export function itemsOf(kind) { return kind === "isla" ? ISLAS : S.people.map(p => ({ key: "p-" + p.id, group: p.group, name: p.name })); }
export function findItem(key) {
  if (key.startsWith("isla-")) return { ...ISLAS.find(i => i.key === key), kind: "isla" };
  const p = S.people.find(p => "p-" + p.id === key);
  return p ? { key, group: p.group, name: p.name, kind: "disfraz" } : null;
}
export function isDone(e) { return !!e && (e.excl || (Array.isArray(e.c) && e.c.length === 4 && e.c.every(v => v >= 1))); }
export function sumC(e) { return e && Array.isArray(e.c) ? e.c.reduce((a, v) => a + (v || 0), 0) : 0; }
export function sortPeople(list) {
  return list.slice().sort((a, b) => (a.group - b.group) || ((a.order ?? 999) - (b.order ?? 999)) || a.name.localeCompare(b.name, "es"));
}
