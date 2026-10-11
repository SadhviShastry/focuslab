/* admin.js — Admin Panel.
   The page is hidden from non-admins here, but the REAL protection is in the database:
   Row Level Security and the admin-only functions in schema.sql reject non-admin requests. */
(async function () {
  "use strict";
  await FL.boot("admin", { admin: true });
  const content = document.getElementById("content");

  const LOG_PAGE = 20, USER_PAGE = 10;
  let users = [], userQuery = "", userPage = 0;
  let logPage = 0, logType = "", logTotal = 0;

  content.innerHTML =
    '<div class="page-head"><div><h1>Admin Panel</h1><p>Platform overview and moderation.</p></div></div>' +
    '<div class="admin-note">' + FL.icon("shield") + "Actions here affect every user. Access is enforced by database security rules.</div>" +
    '<div class="admin-stats" id="stats"></div>' +
    '<div class="admin-grid">' +
      '<div class="card"><div class="card-head"><h3>' + FL.icon("megaphone") + ' System announcement</h3></div><div id="annBox"></div></div>' +
      '<div class="card"><div class="card-head"><h3>' + FL.icon("users") + ' Users</h3><input class="input" id="userSearch" placeholder="Search name or email" style="max-width:240px" aria-label="Search users"></div>' +
        '<div class="table-wrap" id="userTable"></div><div class="pager" id="userPager"></div></div>' +
      '<div class="card"><div class="card-head"><h3><span class="live-dot"></span>Activity log</h3>' +
        '<select class="role-select" id="logFilter" aria-label="Filter events"><option value="">All events</option><option value="signup">Signups</option><option value="focus_session">Focus sessions</option>' +
        '<option value="task_complete">Task completions</option><option value="achievement">Achievements</option><option value="daily_goal">Daily goals</option><option value="admin_action">Admin actions</option></select></div>' +
        '<ul class="log-list" id="logList"></ul><div class="pager" id="logPager"></div></div>' +
    "</div>";

  /* ---------- stats ---------- */
  async function loadStats() {
    const r = await sb.rpc("admin_stats");
    const box = document.getElementById("stats");
    if (r.error) { box.innerHTML = '<div class="card">' + FL.esc(r.error.message) + "</div>"; return; }
    const s = r.data;
    const cards = [
      ["users", "Registered users", s.total_users], ["clock", "Total focus hours", (s.total_focus_minutes / 60).toFixed(1)],
      ["tasks", "Active tasks", s.active_tasks], ["timer", "Sessions completed", s.total_sessions]
    ];
    box.innerHTML = cards.map(function (c) {
      return '<div class="card stat"><span class="label">' + FL.icon(c[0]) + c[1] + '</span><span class="value">' + c[2] + "</span></div>";
    }).join("");
  }

  /* ---------- announcement ---------- */
  async function loadAnnouncement() {
    const r = await sb.from("announcements").select("*").eq("is_active", true).order("created_at", { ascending: false }).limit(1);
    const cur = r.data && r.data[0];
    const box = document.getElementById("annBox");
    box.innerHTML =
      (cur ? '<div class="form-ok" style="display:flex;justify-content:space-between;gap:1rem;align-items:center"><span>Live now: ' + FL.esc(cur.message) + '</span><button class="btn btn-sm btn-outline" id="clearAnn">Remove</button></div>'
           : '<p class="muted small" style="margin-bottom:.8rem">No announcement is live.</p>') +
      '<div class="field"><label for="annText">New banner message</label><textarea id="annText" maxlength="300" placeholder="e.g. Scheduled maintenance tonight at 10 PM."></textarea></div>' +
      '<button class="btn btn-primary" id="pubAnn">Publish to all users</button>';
    document.getElementById("pubAnn").onclick = async function () {
      const text = document.getElementById("annText").value.trim();
      if (!text) return FL.toast("Write a message first.", "error");
      await sb.from("announcements").update({ is_active: false }).eq("is_active", true);
      const ins = await sb.from("announcements").insert({ message: text, created_by: FL.user.id });
      if (ins.error) return FL.toast(ins.error.message, "error");
      FL.log("admin_action", FL.profile.full_name + " published an announcement", { message: text });
      FL.toast("Announcement published.");
      loadAnnouncement();
    };
    const c = document.getElementById("clearAnn");
    if (c) c.onclick = async function () {
      await sb.from("announcements").update({ is_active: false }).eq("is_active", true);
      FL.log("admin_action", FL.profile.full_name + " removed the announcement");
      loadAnnouncement();
    };
  }

  /* ---------- users ---------- */
  async function loadUsers() {
    const r = await sb.from("profiles").select("*").order("created_at", { ascending: false });
    if (r.error) { document.getElementById("userTable").innerHTML = '<p class="form-error">' + FL.esc(r.error.message) + "</p>"; return; }
    users = r.data;
    drawUsers();
  }

  function drawUsers() {
    const q = userQuery.toLowerCase();
    const list = users.filter(function (u) { return !q || (u.full_name + " " + u.email).toLowerCase().indexOf(q) >= 0; });
    const pages = Math.max(1, Math.ceil(list.length / USER_PAGE));
    if (userPage >= pages) userPage = pages - 1;
    const rows = list.slice(userPage * USER_PAGE, userPage * USER_PAGE + USER_PAGE);

    document.getElementById("userTable").innerHTML = rows.length
      ? '<table class="table"><thead><tr><th>Name</th><th>Email</th><th>Joined</th><th>XP</th><th>Role</th><th></th></tr></thead><tbody>' +
        rows.map(function (u) {
          const me = u.id === FL.user.id;
          return "<tr><td>" + FL.esc(u.full_name || "—") + (me ? ' <span class="badge">You</span>' : "") + "</td><td>" + FL.esc(u.email) + "</td><td>" + FL.fmtDate(u.created_at) + "</td><td>" + u.xp + "</td>" +
            '<td><select class="role-select" data-role="' + u.id + '"' + (me ? " disabled" : "") + '><option value="user"' + (u.role === "user" ? " selected" : "") + '>User</option><option value="admin"' + (u.role === "admin" ? " selected" : "") + ">Admin</option></select></td>" +
            '<td>' + (me ? "" : '<button class="icon-btn danger" data-del="' + u.id + '" aria-label="Delete user">' + FL.icon("trash") + "</button>") + "</td></tr>";
        }).join("") + "</tbody></table>"
      : '<div class="empty"><p>No users match your search.</p></div>';

    document.getElementById("userPager").innerHTML = '<span class="small muted">' + list.length + " user" + (list.length === 1 ? "" : "s") + "</span><div>" +
      '<button class="btn btn-ghost btn-sm" id="uPrev"' + (userPage === 0 ? " disabled" : "") + ">Previous</button>" +
      '<span class="small muted"> Page ' + (userPage + 1) + " of " + pages + " </span>" +
      '<button class="btn btn-ghost btn-sm" id="uNext"' + (userPage >= pages - 1 ? " disabled" : "") + ">Next</button></div>";
    document.getElementById("uPrev").onclick = function () { userPage--; drawUsers(); };
    document.getElementById("uNext").onclick = function () { userPage++; drawUsers(); };

    content.querySelectorAll("[data-role]").forEach(function (sel) {
      sel.onchange = async function () {
        const u = users.find(function (x) { return x.id === sel.dataset.role; });
        if (!(await FL.confirm("Change " + (u.full_name || u.email) + " to " + sel.value + "?", "Change role"))) { sel.value = u.role; return; }
        const r = await sb.from("profiles").update({ role: sel.value }).eq("id", u.id);
        if (r.error) { FL.toast(r.error.message, "error"); sel.value = u.role; return; }
        FL.log("admin_action", FL.profile.full_name + " changed " + u.email + " to " + sel.value, { target: u.id });
        FL.toast("Role updated.");
        loadUsers();
      };
    });
    content.querySelectorAll("[data-del]").forEach(function (b) {
      b.onclick = async function () {
        const u = users.find(function (x) { return x.id === b.dataset.del; });
        if (!(await FL.confirm("Permanently delete " + (u.full_name || u.email) + " and all of their data? This cannot be undone.", "Delete user"))) return;
        const r = await sb.rpc("admin_delete_user", { target: u.id });
        if (r.error) return FL.toast(r.error.message, "error");
        FL.log("admin_action", FL.profile.full_name + " deleted user " + u.email);
        FL.toast("User deleted.");
        loadUsers(); loadStats(); loadLogs();
      };
    });
  }

  document.getElementById("userSearch").oninput = function (e) { userQuery = e.target.value.trim(); userPage = 0; drawUsers(); };

  /* ---------- activity log ---------- */
  async function loadLogs() {
    let q = sb.from("activity_logs").select("*, profiles(full_name, email)", { count: "exact" }).order("created_at", { ascending: false });
    if (logType) q = q.eq("event_type", logType);
    const r = await q.range(logPage * LOG_PAGE, logPage * LOG_PAGE + LOG_PAGE - 1);
    const ul = document.getElementById("logList");
    if (r.error) { ul.innerHTML = '<li class="form-error">' + FL.esc(r.error.message) + "</li>"; return; }
    logTotal = r.count || 0;
    ul.innerHTML = r.data.length
      ? r.data.map(function (l) {
          return '<li class="log-item"><span class="when">' + FL.fmtDateTime(l.created_at) + '</span><span class="log-type ' + FL.esc(l.event_type) + '">' + FL.esc(l.event_type.replace("_", " ")) + "</span><span>" + FL.esc(l.message) + "</span></li>";
        }).join("")
      : '<li class="empty"><p>No events yet.</p></li>';
    const pages = Math.max(1, Math.ceil(logTotal / LOG_PAGE));
    document.getElementById("logPager").innerHTML = '<span class="small muted">' + logTotal + " events</span><div>" +
      '<button class="btn btn-ghost btn-sm" id="lPrev"' + (logPage === 0 ? " disabled" : "") + ">Newer</button>" +
      '<span class="small muted"> Page ' + (logPage + 1) + " of " + pages + " </span>" +
      '<button class="btn btn-ghost btn-sm" id="lNext"' + (logPage >= pages - 1 ? " disabled" : "") + ">Older</button></div>";
    document.getElementById("lPrev").onclick = function () { logPage--; loadLogs(); };
    document.getElementById("lNext").onclick = function () { logPage++; loadLogs(); };
  }
  document.getElementById("logFilter").onchange = function (e) { logType = e.target.value; logPage = 0; loadLogs(); };

  // Live updates: new log rows refresh the first page and the stats.
  sb.channel("admin-logs").on("postgres_changes", { event: "INSERT", schema: "public", table: "activity_logs" }, function () {
    if (logPage === 0) loadLogs();
    loadStats();
  }).subscribe();

  await Promise.all([loadStats(), loadAnnouncement(), loadUsers(), loadLogs()]);
})();
