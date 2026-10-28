import { S } from "../state.js";
import { $, esc, icon } from "../utils.js";
import { api } from "../api.js";
import { render } from "../router.js";
import { enterJudge } from "./judge.js";
import { enterAdmin } from "./admin.js";

/* ---------- PIN ---------- */
export function pinView() {
  const isAdmin = S.pinFor === "admin";
  return `<div class="pinbox">
    <div><div class="eyebrow">${isAdmin ? "Panel de administración" : "Jurado"}</div><h2>${isAdmin ? "PIN de la organizadora" : esc(S.pinFor)}</h2></div>
    <div class="dots" id="dots">${[0, 1, 2, 3].map(i => `<i class="${i < S.pin.length ? "on" : ""}"></i>`).join("")}</div>
    <div class="pinmsg ${S.pinMsg ? "red-t" : "muted"}" id="pinmsg">${esc(S.pinMsg || "Escribe tus 4 dígitos secretos")}</div>
    <div class="pad">${[1, 2, 3, 4, 5, 6, 7, 8, 9].map(n => `<button data-act="digit" data-n="${n}">${n}</button>`).join("")}
      <button data-act="home" aria-label="Volver">${icon("i-left")}</button><button data-act="digit" data-n="0">0</button><button data-act="del" aria-label="Borrar">⌫</button></div>
  </div>`;
}
export function pinDigit(n) {
  if (S.pin.length >= 4) return;
  S.pin += n; S.pinMsg = "";
  if (S.pin.length === 4) checkPin(); else render();
}
export function pinBack() { S.pin = S.pin.slice(0, -1); render(); }
async function checkPin() {
  const who = S.pinFor, pin = S.pin;
  try {
    const r = await api.rpc("hw_login", { p_who: who, p_pin: pin });
    if (r.error) { const err = new Error(r.error); err.status = 401; throw err; }
    S.pin = ""; api.setToken(r.token);
    if (r.role === "admin") enterAdmin(); else enterJudge(r.judge);
  } catch (e) {
    S.pin = ""; S.pinMsg = e.status ? e.message : "Sin conexión con el servidor.";
    render(); const d = $("#dots"); d && d.classList.add("shake");
  }
}
