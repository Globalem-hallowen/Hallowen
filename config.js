// Conexión pública con Supabase.
// La clave "anon" / "publishable" es pública por diseño y puede ir en GitHub:
// las tablas están cerradas (RLS) y la página solo puede usar las funciones hw_*
// de database/schema.sql, que validan el PIN y la sesión.
// NUNCA pongas aquí la contraseña de la base de datos ni la clave "service_role" / "secret".
window.HW_CONFIG = {
  supabaseUrl: "https://ldgjnlryrdssikcmsqkx.supabase.co",
  // Supabase → Project Settings → API Keys → "anon public" (eyJ...) o "publishable" (sb_publishable_...)
  supabaseKey: "sb_publishable_rG1VielQxeioaoNfyuXyBQ_xP8WBWJ6"
};
