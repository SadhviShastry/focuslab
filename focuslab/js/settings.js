/* settings.js — profile, timer preferences, theme, password, logout */
(async function () {
  "use strict";
  await FL.boot("settings");
  const content = document.getElementById("content");
  const S = FL.settings;
  const P = FL.profile;

  function num(id, label, min, max, val, hint) {
    return '<div class="field"><label for="' + id + '">' + label + '</label><input id="' + id + '" type="number" min="' + min + '" max="' + max + '" value="' + val + '">' +
      (hint ? '<span class="hint">' + hint + "</span>" : "") + "</div>";
  }

  content.innerHTML =
    '<div class="page-head"><div><h1>Settings</h1><p>Make FocusLab fit the way you work.</p></div></div>' +
    '<div class="settings-grid"><div class="dash-col">' +

    '<form class="card" id="profileForm" novalidate><div class="card-head"><h3>Profile</h3>' + (FL.isAdmin ? '<span class="badge admin">Admin</span>' : "") + "</div><div id=\"pMsg\"></div>" +
      '<div class="field"><label for="p_name">Name</label><input id="p_name" maxlength="80" value="' + FL.esc(P.full_name) + '"></div>' +
      '<div class="field"><label for="p_email">Email</label><input id="p_email" type="email" value="' + FL.esc(P.email) + '"><span class="hint">Changing your email sends a confirmation link to the new address.</span></div>' +
      '<button class="btn btn-primary" type="submit">Save profile</button></form>' +

    '<form class="card" id="pwForm" novalidate><div class="card-head"><h3>Password</h3></div><div id="pwMsg"></div>' +
      '<div class="field"><label for="pw1">New password</label><input id="pw1" type="password" minlength="6" autocomplete="new-password"></div>' +
      '<div class="field"><label for="pw2">Confirm new password</label><input id="pw2" type="password" autocomplete="new-password"></div>' +
      '<button class="btn btn-outline" type="submit">Update password</button></form>' +
    "</div><div class=\"dash-col\">" +

    '<form class="card" id="timerForm" novalidate><div class="card-head"><h3>Timer &amp; goals</h3></div><div id="tMsg"></div>' +
      '<div class="form-row">' + num("s_focus", "Focus (minutes)", 1, 180, S.focus_minutes) + num("s_short", "Short break (minutes)", 1, 60, S.short_break_minutes) + "</div>" +
      '<div class="form-row">' + num("s_long", "Long break (minutes)", 1, 120, S.long_break_minutes) + num("s_cycle", "Sessions before long break", 2, 12, S.sessions_before_long) + "</div>" +
      num("s_goal", "Daily focus goal (minutes)", 10, 720, S.daily_goal_minutes, "Reaching it each day earns +" + FL.XP.GOAL + " XP and builds goal achievements.") +
      '<label style="display:flex;gap:.5rem;align-items:center;margin-bottom:1rem"><input type="checkbox" id="s_auto"' + (S.auto_start_breaks ? " checked" : "") + '> Start breaks automatically</label>' +
      '<button class="btn btn-primary" type="submit">Save timer settings</button></form>' +

    '<div class="card"><div class="card-head"><h3>Appearance</h3></div><div class="theme-toggle">' +
      '<button class="theme-opt" data-theme="light">' + FL.icon("sun") + ' Light</button><button class="theme-opt" data-theme="dark">' + FL.icon("moon") + " Dark</button></div></div>" +

    '<div class="card"><div class="card-head"><h3>Session</h3></div><button class="btn btn-danger-outline" id="logout2">' + FL.icon("logout") + " Log out</button></div>" +
    "</div></div>";

  const msg = function (id, text, ok) {
    document.getElementById(id).innerHTML = '<div class="' + (ok ? "form-ok" : "form-error") + '" role="alert">' + FL.esc(text) + "</div>";
  };

  // ---- profile ----
  document.getElementById("profileForm").onsubmit = async function (e) {
    e.preventDefault();
    const name = document.getElementById("p_name").value.trim();
    const email = document.getElementById("p_email").value.trim();
    if (!name) return msg("pMsg", "Name cannot be empty.");
    let note = "Profile saved.";
    const r = await sb.from("profiles").update({ full_name: name }).eq("id", FL.user.id);
    if (r.error) return msg("pMsg", r.error.message);
    P.full_name = name;
    if (email && email !== P.email) {
      const u = await sb.auth.updateUser({ email: email });
      if (u.error) return msg("pMsg", u.error.message);
      note = "Profile saved. Check " + email + " to confirm the new address.";
    }
    msg("pMsg", note, true);
    FL.initShell("settings");
  };

  // ---- password ----
  document.getElementById("pwForm").onsubmit = async function (e) {
    e.preventDefault();
    const a = document.getElementById("pw1").value, b = document.getElementById("pw2").value;
    if (a.length < 6) return msg("pwMsg", "Password must be at least 6 characters.");
    if (a !== b) return msg("pwMsg", "The passwords do not match.");
    const r = await sb.auth.updateUser({ password: a });
    if (r.error) return msg("pwMsg", r.error.message);
    e.target.reset();
    msg("pwMsg", "Password updated.", true);
  };

  // ---- timer settings ----
  document.getElementById("timerForm").onsubmit = async function (e) {
    e.preventDefault();
    const v = function (id) { return parseInt(document.getElementById(id).value, 10); };
    const row = {
      focus_minutes: v("s_focus"), short_break_minutes: v("s_short"), long_break_minutes: v("s_long"),
      sessions_before_long: v("s_cycle"), daily_goal_minutes: v("s_goal"),
      auto_start_breaks: document.getElementById("s_auto").checked
    };
    const ranges = { focus_minutes: [1, 180], short_break_minutes: [1, 60], long_break_minutes: [1, 120], sessions_before_long: [2, 12], daily_goal_minutes: [10, 720] };
    for (const k in ranges) {
      if (!(row[k] >= ranges[k][0] && row[k] <= ranges[k][1])) return msg("tMsg", "Please check your numbers: each value must be within its allowed range.");
    }
    const r = await sb.from("user_settings").update(row).eq("user_id", FL.user.id);
    if (r.error) return msg("tMsg", r.error.message);
    Object.assign(FL.settings, row);
    msg("tMsg", "Timer settings saved.", true);
  };

  // ---- theme ----
  function paintTheme() {
    document.querySelectorAll(".theme-opt").forEach(function (b) {
      b.classList.toggle("active", b.dataset.theme === FL.settings.theme);
    });
  }
  document.querySelectorAll(".theme-opt").forEach(function (b) {
    b.onclick = async function () {
      FL.settings.theme = b.dataset.theme;
      FL.applyTheme(b.dataset.theme);
      paintTheme();
      await sb.from("user_settings").update({ theme: b.dataset.theme }).eq("user_id", FL.user.id);
    };
  });
  paintTheme();

  document.getElementById("logout2").onclick = FL.logout;
})();
