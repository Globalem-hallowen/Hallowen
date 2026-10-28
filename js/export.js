import { JUECES } from "./data.js";
import { toast } from "./utils.js";
import { itemsOf, sumC } from "./items.js";
import { source, compute } from "./results.js";

/* ---------- Exportar a CSV (se abre en Excel: separador ";" y BOM UTF-8) ---------- */
function csvCell(v) { const s = String(v ?? ""); return /[;"\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; }

export function exportCsv(what) {
  const M = source(); let rows;
  if (what === "scores") {
    rows = [["Categoría", "Grupo", "Isla o participante", "Jurado", "Coherencia", "Creatividad", "Detalle / Elaboración", "Ambientación / Caracterización", "Total jurado", "Excluido", "Hora"]];
    ["isla", "disfraz"].forEach(kind => itemsOf(kind).forEach(it => JUECES.forEach(j => {
      const e = M[j]?.[it.key];
      rows.push([kind === "isla" ? "Isla mejor decorada" : "Mejor disfraz", it.group, it.name, j, ...(e && !e.excl ? e.c.map(v => v ?? "") : ["", "", "", ""]), e && !e.excl ? sumC(e) : "", e?.excl ? "Sí" : "", e?.at ? new Date(e.at).toLocaleString("es-CO") : "Sin calificar"]);
    })));
  } else {
    rows = [["Categoría", "Puesto", "Grupo", "Isla o participante", ...JUECES, "Total (máx. 120)", "Creatividad (desempate)", "Estado"]];
    ["isla", "disfraz"].forEach(kind => { const R = compute(kind, M);
      [...R.ranked, ...R.excluded].forEach(r => rows.push([kind === "isla" ? "Isla mejor decorada" : "Mejor disfraz", r.excluded ? "" : r.place, r.group, r.name, ...JUECES.map(j => r.per[j] ?? ""), r.excluded ? "" : r.total, r.excluded ? "" : r.creat, r.excluded ? "Excluido" : r.missing.length ? "Falta: " + r.missing.join(", ") : "Completo"])); });
  }
  const csv = "﻿" + rows.map(r => r.map(csvCell).join(";")).join("\r\n");
  const name = what === "scores" ? "calificaciones-halloween-2026.csv" : "resultados-halloween-2026.csv";
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
  const a = document.createElement("a"); a.href = url; a.download = name; document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
  toast("Archivo listo. ¡Sin trucos, solo datos!");
}
