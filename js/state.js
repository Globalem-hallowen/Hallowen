/* ---------- Estado de la aplicación (único y compartido por todos los módulos) ---------- */
export const S = {
  offline: false, loaded: false,
  people: [], state: {},
  view: "home", judge: null, pinFor: null, pin: "", pinMsg: "",
  tab: "deco", q: "", g: 0, mine: {}, mineLoaded: false, sheet: null, draft: null,
  gen: 0,  // sube al entrar o salir: las respuestas de una sesión anterior se descartan
  adminTab: "avance", all: {}, confirm: null, editId: null,
  v: { pub: 0, mine: 0, adm: 0 },
  award: { step: 0, last: -1, summary: null }
};
