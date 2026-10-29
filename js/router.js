import { S } from "./state.js";
import { $, esc, ls } from "./utils.js";
import { CONFIG_OK } from "./api.js";
import { homeView, noDbView, setupView } from "./views/home.js";
import { pinView } from "./views/pin.js";
import { renderJudge, renderJudgeDynamic } from "./views/judge.js";
import { renderSheet } from "./views/sheet.js";
import { renderAdmin } from "./views/admin.js";
import { renderAwards } from "./views/awards.js";

/* ---------- Render general y navegación entre pantallas ---------- */
export function render() {
  const app = $("#app");
  const who = $("#who");
  who.innerHTML = S.view === "judge" ? `<span>Jurado</span><strong>${esc(S.judge)}</strong>` : S.view === "admin" ? `<span>Panel</span><strong>Organización</strong>` : "";
  if (!CONFIG_OK) { app.innerHTML = setupView(); return; }
  if (!S.loaded && S.offline) { app.innerHTML = noDbView(); return; }
  if (!S.loaded) { app.innerHTML = `<div class="loading">Invocando a los espíritus…</div>`; return; }
  if (S.view === "home") app.innerHTML = homeView();
  else if (S.view === "pin") app.innerHTML = pinView();
  else if (S.view === "judge") renderJudge();
  else if (S.view === "admin") renderAdmin();
  else if (S.view === "awards") renderAwards();
  renderSheet();
}
// Repinta solo lo que cambia con el tiempo real, sin perder el foco ni el scroll.
export function refresh() {
  if (S.view === "judge") { renderJudgeDynamic(); renderSheet(true); }
  else if (S.view === "admin") renderAdmin();
  else if (S.view === "awards") renderAwards();
  else if (S.view === "home") render();
}
export function go(view) { S.view = view; S.sheet = null; ls.set("hw26-view", view === "awards" ? "awards" : null); window.scrollTo(0, 0); render(); }
