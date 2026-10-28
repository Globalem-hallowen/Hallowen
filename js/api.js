import { ls } from "./utils.js";

/* ---------- Conexión con Supabase (funciones hw_* de database/schema.sql) ---------- */
const CFG = window.HW_CONFIG || {};
export const CONFIG_OK = !!CFG.supabaseUrl && !!CFG.supabaseKey && !/PEGA|YOUR/i.test(CFG.supabaseKey);
export const api = {
  token: ls.get("hw26-token"),
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
  setToken(t) { this.token = t; ls.set("hw26-token", t); }
};
