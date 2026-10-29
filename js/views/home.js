import { JUECES } from "../data.js";
import { icon } from "../utils.js";
import { S } from "../state.js";

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

// Título "HALLOWEEN" de la tarjeta con el ojo en dos capas (esclera + iris) encima, para mover el iris hacia
// el cursor. Se usa en el inicio y en el detalle de resultados (debe ir dentro de .hero).
export function bigTitle() {
  return `<h1 class="title"><img src="img/halloween-titulo.webp" alt="Halloween" width="930" height="280"><svg class="eye" viewBox="0 0 200 200" aria-hidden="true">
    <defs><clipPath id="eyeClip"><circle cx="100" cy="100" r="88"/></clipPath></defs>
    <image href="img/ojo-esclera.webp" width="200" height="200"/>
    <g clip-path="url(#eyeClip)"><g class="pupil"><image href="img/ojo-iris.webp" x="64" y="32" width="106" height="106"/></g></g></svg></h1>`;
}

export function homeView() {
  return `<section class="hero">
    <div class="spider" aria-hidden="true"><svg viewBox="0 0 40 40"><use href="#i-spider"/></svg></div>
    ${bigTitle()}
    <img class="pumpkins" src="img/calabazas.webp" alt="" width="1050" height="458">
    <div class="eyebrow">Concurso 2026 · Viernes 30 de octubre · desde la 1:00 p. m.</div>
    <p>Bienvenido al libro de votos del jurado. Elige tu nombre, escribe tu PIN y califica islas y disfraces: completa los 4 criterios y presiona Guardar.</p>
    <div class="prizes"><span class="prize">Isla mejor decorada · <b>$300.000</b></span><span class="prize">Mejor disfraz individual · <b>$200.000</b></span></div>
    ${S.state.awardsDone ? `<a class="btn pri" href="resultados.html">Ver detalle de resultados</a>` : ""}
  </section>
  <div class="section-t"><h2>¿Quién eres, jurado?</h2></div>
  <div class="judges">${JUECES.map((j, i) => `<button class="jcard" data-act="pick" data-who="${j}">
      <img class="pk" src="img/calabaza-${["izq", "centro", "der"][i % 3]}.webp" alt="">
      <div><b>${j}</b><span>Entrar con PIN</span></div></button>`).join("")}</div>
  <div class="section-t"><h2>Organización</h2></div>
  <div class="others">
    <button class="btn" data-act="pick" data-who="admin">${icon("i-web")}Panel de administración</button>
  </div>`;
}
