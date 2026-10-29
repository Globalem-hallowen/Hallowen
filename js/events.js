import { S } from "./state.js";
import { $, ls } from "./utils.js";
import { go } from "./router.js";
import { logout } from "./sync.js";
import { api } from "./api.js";
import { exportCsv } from "./export.js";
import { ask, doConfirm, cancelConfirm, addPerson, editPerson, savePerson, setPin } from "./admin-actions.js";
import { pinDigit, pinBack } from "./views/pin.js";
import { renderJudge, renderJudgeDynamic } from "./views/judge.js";
import { openSheet, requestClose, saveDraft, keepEditing, discardDraft, setDraftScore, setDraftExcl } from "./views/sheet.js";
import { renderAdmin, enterAdmin } from "./views/admin.js";
import { awardStep, toggleFullscreen, showWinners, replayAwards } from "./views/awards.js";

/* ---------- Eventos: un solo listener por tipo, los botones declaran su acción con data-act ---------- */
function onClick(ev) {
  const el = ev.target.closest("[data-act]"); if (!el) return;
  const a = el.dataset.act;
  if (a === "bgclose") { if (ev.target === el) requestClose(); return; }
  switch (a) {
    case "pick": S.pinFor = el.dataset.who; S.pin = ""; S.pinMsg = ""; go("pin"); break;
    case "digit": pinDigit(el.dataset.n); break;
    case "del": pinBack(); break;
    case "home": go("home"); break;
    case "awards": S.award.step = 0; S.award.last = -1; S.award.summary = null; go("awards"); break;
    case "logout": logout(); break;
    case "tab": S.tab = el.dataset.t; renderJudge(); break;
    case "grp": S.g = +el.dataset.g; document.querySelectorAll(".chip").forEach(c => c.classList.toggle("on", +c.dataset.g === S.g)); renderJudgeDynamic(); break;
    case "open": openSheet(el.dataset.k); break;
    case "close": requestClose(); break;
    case "save": saveDraft(false); break;
    case "keepedit": keepEditing(); break;
    case "discard": discardDraft(); break;
    case "score": setDraftScore(+el.dataset.i, +el.dataset.n); break;
    case "atab": S.adminTab = el.dataset.t; S.editId = null; renderAdmin(); break;
    case "ask": ask(el.dataset.what, el.dataset.id); break;
    case "doconfirm": doConfirm(); break;
    case "cancelconfirm": cancelConfirm(); break;
    case "export": exportCsv(el.dataset.what); break;
    case "addp": addPerson(); break;
    case "editp": editPerson(el.dataset.id); break;
    case "cancelp": S.editId = null; renderAdmin(); break;
    case "savep": savePerson(el.dataset.id); break;
    case "setpin": setPin(el.dataset.who); break;
    case "aw": awardStep(+el.dataset.d); break;
    case "awsummary": showWinners(); break;
    // La premiación se abre desde el panel; al salir vuelve al panel si la sesión sigue abierta.
    case "awexit": if (api.token) { ls.set("hw26-view", null); enterAdmin(); } else go("home"); break;
    case "awreplay": replayAwards(); break;
    case "fs": toggleFullscreen(); break;
  }
}

function onKey(ev) {
  if (S.view === "pin") { if (/^\d$/.test(ev.key)) pinDigit(ev.key); else if (ev.key === "Backspace") pinBack(); return; }
  if (S.view === "awards" && S.state.revealed && !S.award.summary && !ev.target.closest("input,textarea,button")) {
    if (ev.key === " " || ev.key === "ArrowRight" || ev.key === "PageDown") { ev.preventDefault(); awardStep(1); }
    else if (ev.key === "ArrowLeft" || ev.key === "PageUp") { ev.preventDefault(); awardStep(-1); }
  }
  if (S.sheet && ev.key === "Escape") requestClose();
  if (S.view === "admin" && ev.key === "Enter" && ev.target.id === "newName") addPerson();
}

export function bindEvents() {
  document.addEventListener("click", onClick);
  document.addEventListener("change", ev => { if (ev.target.id === "excl") setDraftExcl(ev.target.checked); });
  document.addEventListener("input", ev => { if (ev.target.id === "q") { S.q = ev.target.value; renderJudgeDynamic(); } });
  document.addEventListener("keydown", onKey);
  $("#brand").addEventListener("click", () => { if (S.view === "pin" || S.view === "awards") go("home"); });
}
