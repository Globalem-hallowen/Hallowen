import { JUECES } from "../data.js";
import { icon } from "../utils.js";

/* ---------- Inicio y pantallas de aviso ---------- */
export function noDbView() {
  return `<section class="hero"><h1>Sin conexión</h1>
  <p>No logro comunicarme con la base de datos del concurso. Revisa tu conexión a internet.</p>
  <p class="muted">Se reintenta solo cada pocos segundos.</p></section>`;
}
export function setupView() {
  return `<section class="hero"><h1>Falta un paso</h1>
  <p>Abre <b>config.js</b> y pega la clave pública de Supabase (Project Settings → API Keys). Luego recarga la página.</p></section>`;
}

export function homeView() {
  const pk = cls => `<svg class="${cls}" viewBox="0 0 64 64" aria-hidden="true"><use href="#i-pumpkin"/></svg>`;
  return `<section class="hero">
    <h1 class="title" aria-label="Halloween">Hall<svg class="eye" viewBox="0 0 64 64" aria-hidden="true"><use href="#i-eye"/></svg>ween</h1>
    <div class="logo"><svg class="mark-g" viewBox="0 0 64 64" aria-hidden="true"><use href="#i-globalem"/></svg><b>GLOBALEM</b><small>Energizamos vidas</small></div>
    <div class="pumpkins">${pk("")}${pk("big")}${pk("sm")}</div>
    <div class="eyebrow">Concurso 2026 · Viernes 30 de octubre · desde la 1:00 p. m.</div>
    <p>Bienvenido al libro de votos del jurado. Elige tu nombre, escribe tu PIN y empieza a calificar islas y disfraces. Todo se guarda solo.</p>
    <div class="prizes"><span class="prize">Isla mejor decorada · <b>$300.000</b></span><span class="prize">Mejor disfraz individual · <b>$200.000</b></span></div>
  </section>
  <div class="section-t"><h2>¿Quién eres, jurado?</h2></div>
  <div class="judges">${JUECES.map((j, i) => `<button class="jcard" data-act="pick" data-who="${j}">
      <svg viewBox="0 0 ${i === 1 ? "64 40" : "64 64"}" style="color:var(--fg)"><use href="#${i === 1 ? "i-bat" : "i-pumpkin"}"/></svg>
      <div><b>${j}</b><span>Entrar con PIN</span></div></button>`).join("")}</div>
  <div class="section-t"><h2>Organización</h2></div>
  <div class="others">
    <button class="btn" data-act="pick" data-who="admin">${icon("i-web")}Panel de administración</button>
    <button class="btn" data-act="awards">Pantalla de premiación</button>
  </div>`;
}
