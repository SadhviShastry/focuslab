/* ==========================================================
   app.js — shared helpers used by every page (namespace: FL)
   Load order on each app page:
     supabase CDN -> config.js -> supabase.js -> app.js -> page script
   ========================================================== */
(function () {
  "use strict";
  const FL = {};
  window.FL = FL;
  const sb = window.sb;

  /* ---------------- Constants ---------------- */
  FL.XP = { SESSION: 10, TASK: 20, GOAL: 25 };
  FL.STAGES = ["Seed", "Sprout", "Growing Plant", "Mature Plant", "Bloom"];
  FL.STAGE_XP = [0, 50, 150, 300, 500]; // XP needed to reach each stage

  /* ---------------- Icons (Lucide-style line icons) ---------------- */
  const ICONS = {
    home: '<path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>',
    timer: '<line x1="10" x2="14" y1="2" y2="2"/><line x1="12" x2="15" y1="14" y2="11"/><circle cx="12" cy="14" r="8"/>',
    tasks: '<rect width="8" height="4" x="8" y="2" rx="1"/><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><path d="m9 14 2 2 4-4"/>',
    flask: '<path d="M10 2v7.5L4.5 19a2 2 0 0 0 1.7 3h11.6a2 2 0 0 0 1.7-3L14 9.5V2"/><path d="M8.5 2h7"/><path d="M7 16h10"/>',
    chart: '<line x1="18" x2="18" y1="20" y2="10"/><line x1="12" x2="12" y1="20" y2="4"/><line x1="6" x2="6" y1="20" y2="14"/>',
    award: '<circle cx="12" cy="8" r="6"/><path d="M15.5 13.5 17 22l-5-3-5 3 1.5-8.5"/>',
    settings: '<line x1="4" x2="20" y1="7" y2="7"/><line x1="4" x2="20" y1="17" y2="17"/><circle cx="9" cy="7" r="2.2"/><circle cx="15" cy="17" r="2.2"/>',
    shield: '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>',
    logout: '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" x2="9" y1="12" y2="12"/>',
    plus: '<path d="M5 12h14"/><path d="M12 5v14"/>',
    edit: '<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"/>',
    trash: '<path d="M3 6h18"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>',
    play: '<polygon points="6 3 20 12 6 21 6 3"/>',
    pause: '<rect x="14" y="4" width="4" height="16" rx="1"/><rect x="6" y="4" width="4" height="16" rx="1"/>',
    reset: '<path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/>',
    skip: '<polygon points="5 4 15 12 5 20 5 4"/><line x1="19" x2="19" y1="5" y2="19"/>',
    check: '<path d="M20 6 9 17l-5-5"/>',
    leaf: '<path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10Z"/><path d="M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12"/>',
    flame: '<path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.07-2.14-.22-4.05 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.15.43-2.3 1-3a2.5 2.5 0 0 0 2.5 2.5z"/>',
    calendar: '<rect width="18" height="18" x="3" y="4" rx="2"/><line x1="16" x2="16" y1="2" y2="6"/><line x1="8" x2="8" y1="2" y2="6"/><line x1="3" x2="21" y1="10" y2="10"/>',
    clock: '<circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>',
    target: '<circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/>',
    trophy: '<path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/><path d="M4 22h16"/><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"/><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"/><path d="M18 2H6v7a6 6 0 0 0 12 0V2Z"/>',
    menu: '<line x1="4" x2="20" y1="12" y2="12"/><line x1="4" x2="20" y1="6" y2="6"/><line x1="4" x2="20" y1="18" y2="18"/>',
    x: '<path d="M18 6 6 18"/><path d="m6 6 12 12"/>',
    sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"/>',
    moon: '<path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/>',
    users: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>',
    activity: '<path d="M22 12h-4l-3 9L9 3l-3 9H2"/>',
    megaphone: '<path d="m3 11 18-5v12L3 14v-3z"/><path d="M11.6 16.8a3 3 0 1 1-5.8-1.6"/>',
    arrow: '<path d="M5 12h14"/><path d="m12 5 7 7-7 7"/>',
    zap: '<polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>',
    lock: '<rect width="18" height="11" x="3" y="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>'
  };

  FL.icon = function (name, extraClass) {
    return '<svg class="icon ' + (extraClass || "") + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" ' +
      'stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
      (ICONS[name] || ICONS.leaf) + "</svg>";
  };

  /* ---------------- Small utilities ---------------- */
  // Escape text before putting it inside innerHTML (prevents XSS from user-typed titles).
  FL.esc = function (s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  };

  const pad = function (n) { return String(n).padStart(2, "0"); };

  // Local calendar date as "YYYY-MM-DD"
  FL.dateKey = function (d) {
    d = d || new Date();
    return d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate());
  };
  FL.addDays = function (key, n) {
    const p = key.split("-").map(Number);
    return FL.dateKey(new Date(p[0], p[1] - 1, p[2] + n));
  };
  FL.lastNDays = function (n) {
    const out = [];
    const today = FL.dateKey();
    for (let i = n - 1; i >= 0; i--) out.push(FL.addDays(today, -i));
    return out;
  };
  FL.parseKey = function (key) {
    const p = key.split("-").map(Number);
    return new Date(p[0], p[1] - 1, p[2]);
  };
  FL.fmtMinutes = function (m) {
    m = Math.round(m || 0);
    if (m < 60) return m + "m";
    const h = Math.floor(m / 60), r = m % 60;
    return r ? h + "h " + r + "m" : h + "h";
  };
  FL.fmtClock = function (sec) {
    sec = Math.max(0, Math.round(sec));
    return pad(Math.floor(sec / 60)) + ":" + pad(sec % 60);
  };
  FL.fmtDate = function (iso) {
    if (!iso) return "";
    const d = iso.length === 10 ? FL.parseKey(iso) : new Date(iso);
    return d.toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
  };
  FL.fmtDateTime = function (iso) {
    return new Date(iso).toLocaleString(undefined, { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
  };
  FL.greeting = function () {
    const h = new Date().getHours();
    return h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening";
  };
  FL.firstName = function () {
    return ((FL.profile && FL.profile.full_name) || "there").split(" ")[0];
  };
  FL.humanError = function (err) {
    return (err && (err.message || err.error_description)) || "Something went wrong. Please try again.";
  };

  // Small per-device convenience values (wrapped because storage can be blocked)
  FL.store = {
    get: function (k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set: function (k, v) { try { localStorage.setItem(k, v); } catch (e) { /* ignore */ } },
    del: function (k) { try { localStorage.removeItem(k); } catch (e) { /* ignore */ } }
  };

  /* ---------------- Theme ---------------- */
  FL.applyTheme = function (theme) {
    theme = theme === "dark" ? "dark" : "light";
    document.documentElement.setAttribute("data-theme", theme);
    FL.store.set("fl_theme", theme);
  };
  (function earlyTheme() {
    const t = FL.store.get("fl_theme");
    if (t) document.documentElement.setAttribute("data-theme", t);
  })();

  /* ---------------- Toasts & modals ---------------- */
  FL.toast = function (message, type) {
    let box = document.getElementById("toasts");
    if (!box) {
      box = document.createElement("div");
      box.id = "toasts";
      box.setAttribute("aria-live", "polite");
      document.body.appendChild(box);
    }
    const t = document.createElement("div");
    t.className = "toast " + (type || "");
    t.innerHTML = FL.icon(type === "error" ? "x" : "check") + "<span>" + FL.esc(message) + "</span>";
    box.appendChild(t);
    setTimeout(function () { t.remove(); }, type === "error" ? 6000 : 3800);
  };

  FL.openModal = function (html) {
    const b = document.createElement("div");
    b.className = "modal-backdrop";
    b.innerHTML = '<div class="modal" role="dialog" aria-modal="true">' + html + "</div>";
    b.addEventListener("mousedown", function (e) { if (e.target === b) b.remove(); });
    document.body.appendChild(b);
    const first = b.querySelector("input, select, textarea, button");
    if (first) first.focus();
    return b;
  };
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape") {
      const all = document.querySelectorAll(".modal-backdrop");
      if (all.length) all[all.length - 1].remove();
    }
  });

  FL.confirm = function (message, okLabel) {
    return new Promise(function (resolve) {
      const m = FL.openModal(
        "<h3>Are you sure?</h3>" +
        '<p class="muted" style="margin:.5rem 0 1.2rem">' + FL.esc(message) + "</p>" +
        '<div class="modal-actions"><button class="btn btn-ghost" data-no>Cancel</button>' +
        '<button class="btn btn-danger" data-yes>' + FL.esc(okLabel || "Delete") + "</button></div>"
      );
      m.querySelector("[data-no]").onclick = function () { m.remove(); resolve(false); };
      m.querySelector("[data-yes]").onclick = function () { m.remove(); resolve(true); };
      m.addEventListener("mousedown", function (e) { if (e.target === m) resolve(false); });
    });
  };

  /* ---------------- Auth & page boot ---------------- */
  FL.loadSettings = async function () {
    let res = await sb.from("user_settings").select("*").eq("user_id", FL.user.id).maybeSingle();
    let data = res.data;
    if (!data) {
      const ins = await sb.from("user_settings").upsert({ user_id: FL.user.id }).select().single();
      data = ins.data;
    }
    FL.settings = data || {
      focus_minutes: 25, short_break_minutes: 5, long_break_minutes: 15,
      sessions_before_long: 4, daily_goal_minutes: 60, auto_start_breaks: false, theme: "light"
    };
    FL.applyTheme(FL.settings.theme);
    return FL.settings;
  };

  // Makes sure someone is logged in. Redirects to login.html if not.
  FL.requireAuth = async function (opts) {
    opts = opts || {};
    const stuck = new Promise(function () {}); // never resolves: stops the page script after a redirect
    if (!window.FOCUSLAB_CONFIGURED) {
      const c = document.getElementById("content");
      if (c) c.innerHTML = '<div class="card empty"><h4>Supabase is not configured</h4><p>Add your project URL and anon key to <code>js/config.js</code>. See the README.</p></div>';
      return stuck;
    }
    const s = await sb.auth.getSession();
    if (!s.data.session) { location.replace("login.html"); return stuck; }
    FL.user = s.data.session.user;

    const p = await sb.from("profiles").select("*").eq("id", FL.user.id).maybeSingle();
    if (p.error || !p.data) {
      const c = document.getElementById("content");
      const why = p.error ? (p.error.message + (p.error.code ? " (code " + p.error.code + ")" : "")) : "No profile row exists for this user.";
      if (c) c.innerHTML = '<div class="card empty"><h4>Profile not found</h4><p>' + FL.esc(why) +
        '</p><p class="small" style="margin-top:.8rem">Run <code>supabase/fix.sql</code> in the Supabase SQL Editor, then reload this page.</p></div>';
      return stuck;
    }
    FL.profile = p.data;
    FL.isAdmin = p.data.role === "admin";
    if (opts.admin && !FL.isAdmin) { location.replace("dashboard.html"); return stuck; }

    await FL.loadSettings();
    sb.auth.onAuthStateChange(function (event) {
      if (event === "SIGNED_OUT") location.replace("login.html");
    });
    return { user: FL.user, profile: FL.profile };
  };

  const NAV = [
    { key: "dashboard", label: "Dashboard", icon: "home", href: "dashboard.html" },
    { key: "timer", label: "Focus Timer", icon: "timer", href: "timer.html" },
    { key: "tasks", label: "Tasks", icon: "tasks", href: "tasks.html" },
    { key: "lab", label: "Lab", icon: "flask", href: "lab.html" },
    { key: "insights", label: "Insights", icon: "chart", href: "insights.html" },
    { key: "achievements", label: "Achievements", icon: "award", href: "achievements.html" },
    { key: "settings", label: "Settings", icon: "settings", href: "settings.html" }
  ];

  FL.level = function (xp) {
    return { level: Math.floor(xp / 100) + 1, into: xp % 100, next: 100 };
  };

  FL.refreshChip = function () {
    const el = document.getElementById("chipLevel");
    if (el && FL.profile) el.textContent = "Level " + FL.level(FL.profile.xp).level + " · " + FL.profile.xp + " XP";
  };

  FL.initShell = function (active) {
    const p = FL.profile;
    const side = document.getElementById("sidebar");
    const mobile = document.getElementById("mobilebar");
    const nav = NAV.map(function (n) {
      return '<a class="nav-item ' + (n.key === active ? "active" : "") + '" href="' + n.href + '">' + FL.icon(n.icon) + n.label + "</a>";
    }).join("");
    const admin = FL.isAdmin
      ? '<div class="nav-sep"></div><a class="nav-item ' + (active === "admin" ? "active" : "") + '" href="admin.html">' + FL.icon("shield") + "Admin Panel</a>"
      : "";

    side.innerHTML =
      '<a class="brand" href="dashboard.html"><img src="assets/logo.svg" alt="">FOCUSLAB</a>' +
      '<nav class="nav" aria-label="Main">' + nav + admin + "</nav>" +
      '<div class="sidebar-foot"><div class="user-chip"><div class="avatar">' + FL.esc((p.full_name || "?").charAt(0).toUpperCase()) +
      '</div><div><div class="name">' + FL.esc(p.full_name || p.email) + '</div><div class="lvl" id="chipLevel"></div></div></div>' +
      '<button class="btn btn-ghost btn-block" id="logoutBtn">' + FL.icon("logout") + " Log out</button></div>";
    FL.refreshChip();

    if (mobile) {
      mobile.innerHTML =
        '<button class="icon-btn" id="menuBtn" aria-label="Open menu">' + FL.icon("menu") + "</button>" +
        '<a class="brand" href="dashboard.html"><img src="assets/logo.svg" alt="">FOCUSLAB</a><span style="width:34px"></span>';
      const closeMenu = function () {
        side.classList.remove("open");
        const s = document.querySelector(".scrim");
        if (s) s.remove();
      };
      document.getElementById("menuBtn").onclick = function () {
        side.classList.add("open");
        const s = document.createElement("div");
        s.className = "scrim";
        s.onclick = closeMenu;
        document.body.appendChild(s);
      };
    }

    document.getElementById("logoutBtn").onclick = FL.logout;
    FL.loadBanner();
  };

  FL.logout = async function () {
    await sb.auth.signOut();
    location.replace("login.html");
  };

  // One call per page: check login, then draw sidebar/topbar.
  FL.boot = async function (active, opts) {
    const r = await FL.requireAuth(opts);
    FL.initShell(active);
    return r;
  };

  /* ---------------- Global announcement banner ---------------- */
  FL.loadBanner = async function () {
    const slot = document.getElementById("banner");
    if (!slot) return;
    const draw = async function () {
      const r = await sb.from("announcements").select("*").eq("is_active", true)
        .order("created_at", { ascending: false }).limit(1);
      const a = r.data && r.data[0];
      if (!a || FL.store.get("fl_banner_dismissed") === a.id) { slot.innerHTML = ""; return; }
      slot.innerHTML = '<div class="banner" role="status">' + FL.icon("megaphone") + "<span>" + FL.esc(a.message) +
        '</span><button aria-label="Dismiss">' + FL.icon("x") + "</button></div>";
      slot.querySelector("button").onclick = function () {
        FL.store.set("fl_banner_dismissed", a.id);
        slot.innerHTML = "";
      };
    };
    draw();
    sb.channel("banner-feed").on("postgres_changes", { event: "*", schema: "public", table: "announcements" }, draw).subscribe();
  };

  /* ---------------- Activity log ---------------- */
  FL.log = async function (type, message, meta) {
    try {
      await sb.from("activity_logs").insert({ user_id: FL.user.id, event_type: type, message: message, metadata: meta || {} });
    } catch (e) { /* logging must never break the app */ }
  };

  /* ---------------- Plant illustrations (inline SVG) ---------------- */
  function leaf(x, y, angle, len, dark) {
    const l = len;
    return '<path d="M0 0C' + (l * 0.3) + " " + (-l * 0.45) + " " + (l * 0.9) + " " + (-l * 0.35) + " " + l + " 0C" +
      (l * 0.9) + " " + (l * 0.35) + " " + (l * 0.3) + " " + (l * 0.45) + ' 0 0Z" transform="translate(' + x + " " + y +
      ") rotate(" + angle + ')" fill="' + (dark ? "#4f7345" : "#6b8f5e") + '"/>';
  }

  FL.plantSVG = function (stage, width) {
    width = width || 80;
    const stem = function (y) {
      return '<path d="M40 70 C40 ' + (70 + (y - 70) * 0.5) + " 40 " + (y + 8) + " 40 " + y + '" stroke="#4f7345" stroke-width="2.4" fill="none" stroke-linecap="round"/>';
    };
    let body = "";
    if (stage === 0) {
      body = '<ellipse cx="40" cy="69" rx="3.2" ry="2" fill="#7a6648"/>';
    } else if (stage === 1) {
      body = stem(56) + leaf(40, 58, -38, 12) + leaf(40, 60, -142, 12, true);
    } else if (stage === 2) {
      body = stem(42) + leaf(40, 62, -35, 15) + leaf(40, 62, -145, 15, true) + leaf(40, 52, -42, 15, true) +
        leaf(40, 52, -138, 15) + leaf(40, 42, -90, 12);
    } else {
      body = stem(28) + leaf(40, 64, -30, 17) + leaf(40, 64, -150, 17, true) + leaf(40, 55, -38, 17, true) +
        leaf(40, 55, -142, 17) + leaf(40, 46, -45, 16) + leaf(40, 46, -135, 16, true) + leaf(40, 37, -55, 14, true) +
        leaf(40, 37, -125, 14) + leaf(40, 28, -90, 12);
      if (stage === 4) {
        let petals = "";
        for (let i = 0; i < 6; i++) {
          petals += '<ellipse cx="40" cy="16" rx="4.2" ry="8" fill="#f1e3c4" stroke="#d8c293" stroke-width=".6" transform="rotate(' + (i * 60) + ' 40 24)"/>';
        }
        body += petals + '<circle cx="40" cy="24" r="4" fill="#c99a3b"/>';
      }
    }
    return '<svg viewBox="0 0 80 100" width="' + width + '" height="' + (width * 1.25) + '" role="img" aria-label="' +
      FL.STAGES[stage] + '">' + body +
      '<path d="M24 70h32l-3.5 24a3 3 0 0 1-3 2.5H30.5a3 3 0 0 1-3-2.5z" fill="#d9d5c7" stroke="#bfb9a6" stroke-width="1"/>' +
      '<rect x="22" y="66.5" width="36" height="5" rx="2" fill="#e6e2d4" stroke="#bfb9a6" stroke-width="1"/></svg>';
  };

  FL.stageForXP = function (xp) {
    let s = 0;
    for (let i = 0; i < FL.STAGE_XP.length; i++) if (xp >= FL.STAGE_XP[i]) s = i;
    return s;
  };
  // Progress toward the next stage: { stage, name, pct, toNext }
  FL.gardenInfo = function (xp) {
    const stage = FL.stageForXP(xp);
    if (stage >= 4) return { stage: stage, name: FL.STAGES[stage], pct: 100, toNext: 0, bloomed: Math.floor(xp / 500) };
    const lo = FL.STAGE_XP[stage], hi = FL.STAGE_XP[stage + 1];
    return { stage: stage, name: FL.STAGES[stage], pct: Math.round(((xp - lo) / (hi - lo)) * 100), toNext: hi - xp, bloomed: Math.floor(xp / 500) };
  };

  // Keep the garden_progress table in step with XP
  FL.syncGarden = async function () {
    const g = FL.gardenInfo(FL.profile.xp);
    try {
      await sb.from("garden_progress").upsert({
        user_id: FL.user.id, stage: g.stage, plants_bloomed: g.bloomed, last_watered_at: new Date().toISOString()
      });
    } catch (e) { /* non-critical */ }
  };

  /* ---------------- XP ---------------- */
  // XP is added through a database function so users cannot edit their own XP directly.
  FL.awardXP = async function (amount) {
    const r = await sb.rpc("add_xp", { amount: amount });
    if (r.error) throw r.error;
    const before = FL.gardenInfo(FL.profile.xp).stage;
    FL.profile.xp = r.data;
    const after = FL.gardenInfo(FL.profile.xp).stage;
    FL.refreshChip();
    await FL.syncGarden();
    if (after > before) FL.toast("Your plant grew into a " + FL.STAGES[after] + ".");
    return r.data;
  };

  /* ---------------- Stats, streaks ---------------- */
  FL.computeStreak = function (dayMap) {
    const today = FL.dateKey();
    let cur = dayMap[today] ? today : FL.addDays(today, -1);
    let streak = 0;
    while (dayMap[cur]) { streak++; cur = FL.addDays(cur, -1); }
    return streak;
  };
  FL.computeLongest = function (dayMap) {
    const keys = Object.keys(dayMap).sort();
    let best = 0, run = 0, prev = null;
    keys.forEach(function (k) {
      run = prev && FL.addDays(prev, 1) === k ? run + 1 : 1;
      if (run > best) best = run;
      prev = k;
    });
    return best;
  };

  // Everything the dashboard / insights / achievements need, from real Supabase rows.
  FL.getStats = async function () {
    const uid = FL.user.id;
    const res = await Promise.all([
      sb.from("focus_sessions").select("id,task_id,experiment_id,duration_minutes,planned_minutes,focus_rating,completed_at")
        .eq("user_id", uid).order("completed_at", { ascending: false }).limit(5000),
      sb.from("tasks").select("*").eq("user_id", uid).order("created_at", { ascending: false }),
      sb.from("daily_goals").select("*").eq("user_id", uid)
    ]);
    const sessions = res[0].data || [], tasks = res[1].data || [], goals = res[2].data || [];
    const today = FL.dateKey();
    const dayMap = {};
    sessions.forEach(function (s) {
      const k = FL.dateKey(new Date(s.completed_at));
      dayMap[k] = (dayMap[k] || 0) + s.duration_minutes;
    });
    let totalMinutes = 0;
    sessions.forEach(function (s) { totalMinutes += s.duration_minutes; });
    return {
      sessions: sessions, tasks: tasks, goals: goals, dayMap: dayMap,
      totalSessions: sessions.length,
      totalMinutes: totalMinutes,
      tasksDone: tasks.filter(function (t) { return t.completed; }).length,
      tasksTotal: tasks.length,
      streak: FL.computeStreak(dayMap),
      longestStreak: FL.computeLongest(dayMap),
      goalsMet: goals.filter(function (g) { return g.goal_met; }).length,
      minutesToday: dayMap[today] || 0,
      sessionsToday: sessions.filter(function (s) { return FL.dateKey(new Date(s.completed_at)) === today; }).length
    };
  };

  /* ---------------- Tasks ---------------- */
  // A task is in "Today" when planned for today, or planned earlier and still unfinished.
  FL.isTodayTask = function (t) {
    const today = FL.dateKey();
    if (!t.plan_date) return false;
    return t.plan_date === today || (t.plan_date < today && !t.completed);
  };
  FL.getFocusTaskId = function () { return FL.store.get("fl_focus_task"); };
  FL.setFocusTaskId = function (id) { if (id) FL.store.set("fl_focus_task", id); else FL.store.del("fl_focus_task"); };

  // Complete / un-complete a task. XP is given only the first time a task is completed,
  // so toggling it back and forth can never farm XP.
  FL.setTaskComplete = async function (task, done) {
    const patch = { completed: done, completed_at: done ? new Date().toISOString() : null };
    const giveXP = done && !task.xp_awarded;
    if (giveXP) patch.xp_awarded = true;
    const r = await sb.from("tasks").update(patch).eq("id", task.id).select().single();
    if (r.error) throw r.error;
    if (giveXP) {
      await FL.awardXP(FL.XP.TASK);
      FL.toast("Task complete. +" + FL.XP.TASK + " XP");
      FL.log("task_complete", FL.profile.full_name + " completed task \"" + task.title + "\"", { task_id: task.id });
    }
    if (done) await FL.checkAchievements();
    return r.data;
  };

  /* ---------------- Focus session saving ---------------- */
  FL.recordSession = async function (o) {
    const ins = await sb.from("focus_sessions").insert({
      user_id: FL.user.id, task_id: o.taskId || null, experiment_id: o.experimentId || null,
      duration_minutes: o.minutes, planned_minutes: o.plannedMinutes || o.minutes,
      xp_earned: FL.XP.SESSION, focus_rating: o.rating || null
    }).select().single();
    if (ins.error) throw ins.error;

    await FL.awardXP(FL.XP.SESSION);
    FL.log("focus_session", FL.profile.full_name + " completed a " + o.minutes + " min focus session", { minutes: o.minutes, task_id: o.taskId || null });

    // Daily goal bookkeeping
    const today = FL.dateKey();
    const target = FL.settings.daily_goal_minutes;
    const g = await sb.from("daily_goals").select("*").eq("user_id", FL.user.id).eq("goal_date", today).maybeSingle();
    const prev = g.data;
    const minutes = (prev ? prev.focus_minutes : 0) + o.minutes;
    const met = minutes >= target;
    await sb.from("daily_goals").upsert({
      user_id: FL.user.id, goal_date: today, target_minutes: target, focus_minutes: minutes,
      sessions: (prev ? prev.sessions : 0) + 1, goal_met: met || (prev ? prev.goal_met : false)
    }, { onConflict: "user_id,goal_date" });

    let goalJustMet = false;
    if (met && !(prev && prev.goal_met)) {
      goalJustMet = true;
      await FL.awardXP(FL.XP.GOAL);
      FL.log("daily_goal", FL.profile.full_name + " reached their daily goal", { minutes: minutes });
    }
    await FL.checkAchievements();
    return { session: ins.data, goalJustMet: goalJustMet };
  };

  /* ---------------- Achievements ---------------- */
  FL.achievementValue = function (type, stats) {
    return {
      sessions: stats.totalSessions,
      tasks: stats.tasksDone,
      streak: Math.max(stats.streak, stats.longestStreak),
      minutes: stats.totalMinutes,
      goals: stats.goalsMet,
      bloom: Math.floor(FL.profile.xp / 500)
    }[type] || 0;
  };

  FL.checkAchievements = async function () {
    try {
      const stats = await FL.getStats();
      const res = await Promise.all([
        sb.from("achievements").select("*"),
        sb.from("user_achievements").select("achievement_id").eq("user_id", FL.user.id)
      ]);
      const have = new Set((res[1].data || []).map(function (a) { return a.achievement_id; }));
      const fresh = (res[0].data || []).filter(function (a) {
        return !have.has(a.id) && FL.achievementValue(a.condition_type, stats) >= a.threshold;
      });
      if (!fresh.length) return [];
      await sb.from("user_achievements").upsert(
        fresh.map(function (a) { return { user_id: FL.user.id, achievement_id: a.id }; }),
        { onConflict: "user_id,achievement_id", ignoreDuplicates: true }
      );
      fresh.forEach(function (a) {
        FL.toast("Achievement unlocked: " + a.name);
        FL.log("achievement", FL.profile.full_name + " unlocked \"" + a.name + "\"", { code: a.code });
      });
      return fresh;
    } catch (e) { return []; }
  };

  /* ---------------- Realtime tasks ---------------- */
  FL.subscribeTasks = function (callback) {
    return sb.channel("tasks-" + FL.user.id)
      .on("postgres_changes", { event: "*", schema: "public", table: "tasks", filter: "user_id=eq." + FL.user.id }, callback)
      .subscribe();
  };

  /* ---------------- Tiny bar chart (pure HTML/CSS) ---------------- */
  // items: [{ label, value, highlight }]
  FL.barChart = function (items, unit) {
    const max = Math.max.apply(null, items.map(function (i) { return i.value; }).concat([1]));
    return '<div class="bars">' + items.map(function (i) {
      const h = Math.round((i.value / max) * 100);
      return '<div class="bar-col" title="' + FL.esc(i.label) + ": " + i.value + (unit || "") + '">' +
        '<span class="bar-val">' + (i.value ? i.value : "") + "</span>" +
        '<div class="bar-track"><div class="bar-fill ' + (i.highlight ? "hl" : "") + '" style="height:' + h + '%"></div></div>' +
        '<span class="bar-label">' + FL.esc(i.label) + "</span></div>";
    }).join("") + "</div>";
  };

  FL.labTabs = function (active) {
    const t = [["lab", "Overview", "lab.html"], ["garden", "Garden", "garden.html"],
      ["experiments", "Experiments", "experiments.html"], ["progress", "Progress", "progress.html"]];
    return '<div class="tabs" role="tablist">' + t.map(function (x) {
      return '<a class="tab ' + (x[0] === active ? "active" : "") + '" href="' + x[2] + '">' + x[1] + "</a>";
    }).join("") + "</div>";
  };
})();s