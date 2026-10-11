/* supabase.js — creates the one Supabase client used by every page. */
(function () {
  const cfg = window.FOCUSLAB_CONFIG || {};
  const configured =
    cfg.SUPABASE_URL && cfg.SUPABASE_ANON_KEY &&
    !cfg.SUPABASE_URL.startsWith("YOUR_") && !cfg.SUPABASE_ANON_KEY.startsWith("YOUR_");

  window.FOCUSLAB_CONFIGURED = configured;

  // Use harmless placeholders when not configured so the page still loads
  // and can show a helpful message instead of crashing.
  window.sb = window.supabase.createClient(
    configured ? cfg.SUPABASE_URL : "https://placeholder.supabase.co",
    configured ? cfg.SUPABASE_ANON_KEY : "placeholder-key",
    { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true } }
  );

  if (!configured) {
    document.addEventListener("DOMContentLoaded", function () {
      const bar = document.createElement("div");
      bar.style.cssText =
        "background:#f6ecd5;color:#5c4310;padding:10px 16px;font:500 14px system-ui;text-align:center;border-bottom:1px solid #e3d3a4";
      bar.textContent =
        "Supabase is not configured yet. Add your URL and anon key in js/config.js (see README).";
      document.body.prepend(bar);
    });
  }
})();
