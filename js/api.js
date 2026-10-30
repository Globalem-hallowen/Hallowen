import { ls, ss } from "./utils.js";

/* ---------- Conexión con Supabase (funciones hw_* de database/schema.sql) ---------- */
const CFG = window.HW_CONFIG || {};
export const CONFIG_OK = !!CFG.supabaseUrl && !!CFG.supabaseKey && !/PEGA|YOUR/i.test(CFG.supabaseKey);
// La sesión solo se conserva al recargar (F5). Entrar de nuevo al link (misma pestaña, pestaña nueva o
// pestañas restauradas) pide elegir jurado y PIN. Se borra también la de versiones anteriores (localStorage).
ls.set("hw26-token", null); ls.set("hw26-view", null);
if (performance.getEntriesByType?.("navigation")?.[0]?.type !== "reload") { ss.set("hw26-token", null); ss.set("hw26-view", null); }
export const api = {
  token: ss.get("hw26-token"),
  async rpc(fn, args = {}) {
    const headers = { "Content-Type": "application/json", apikey: CFG.supabaseKey };
    if (CFG.supabaseKey.startsWith("eyJ")) headers.Authorization = "Bearer " + CFG.supabaseKey; // clave anon antigua (JWT)
    const r = await fetch(`${CFG.supabaseUrl}/rest/v1/rpc/${fn}`, { method: "POST", headers, body: JSON.stringify(args), cache: "no-store" });
    let data = null; try { data = await r.json(); } catch (e) {}
    if (!r.ok) { const err = new Error((data && data.message) || "Error " + r.status); err.status = r.status; throw err; }
    return data;
  },
  // Igual que rpc, enviando la sesión del jurado o la organizadora.
  call(fn, args = {}) { return this.rpc(fn, { p_token: this.token || "", ...args }); },
  setToken(t) { this.token = t; ss.set("hw26-token", t); }
};
