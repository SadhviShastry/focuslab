/* dashboard.js — real, dynamic dashboard built from Supabase data */
(async function () {
  "use strict";
  await FL.boot("dashboard");
  const content = document.getElementById("content");

  async function render() {
    const stats = await FL.getStats();
    const settings = FL.settings;
    const xp = FL.profile.xp;
    const lvl = FL.level(xp);
    const garden = FL.gardenInfo(xp);
    const goalPct = Math.min(100, Math.round((stats.minutesToday / settings.daily_goal_minutes) * 100));

    const todayTasks = stats.tasks.filter(FL.isTodayTask);
    const todayDone = todayTasks.filter(function (t) { return t.completed; }).length;

    // Current focus task: the one picked last in the timer, else the first open task for today.
    const open = todayTasks.filter(function (t) { return !t.completed; });
    let focusTask = stats.tasks.find(function (t) { return t.id === FL.getFocusTaskId() && !t.completed; });
    if (!focusTask) focusTask = open[0];

    const ach = await sb.from("user_achievements")
      .select("unlocked_at, achievements(name, description, icon)")
      .eq("user_id", FL.user.id).order("unlocked_at", { ascending: false }).limit(3);
    const recent = ach.data || [];

    const dateStr = new Date().toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "long", year: "numeric" });

    const taskRows = todayTasks.slice(0, 6).map(function (t) {
      return '<li class="' + (t.completed ? "done" : "") + '">' +
        '<input type="checkbox" class="check" data-id="' + t.id + '" aria-label="Complete ' + FL.esc(t.title) + '"' + (t.completed ? " checked" : "") + ">" +
        '<span class="title">' + FL.esc(t.title) + "</span>" +
        '<span class="badge ' + t.priority + '">' + t.priority + "</span></li>";
    }).join("");

    content.innerHTML =
      '<div class="page-head"><div><h1>' + FL.greeting() + ", " + FL.esc(FL.firstName()) + '.</h1><p>' + dateStr + "</p></div>" +
      '<a class="btn btn-primary" href="timer.html">' + FL.icon("play") + " Start focus</a></div>" +

      '<div class="stats-row">' +
        '<div class="card stat"><span class="label">' + FL.icon("clock") + 'Focus time today</span><span class="value">' + FL.fmtMinutes(stats.minutesToday) + '</span><span class="sub">' + stats.sessionsToday + " session" + (stats.sessionsToday === 1 ? "" : "s") + "</span></div>" +
        '<div class="card stat"><span class="label">' + FL.icon("flame") + 'Current streak</span><span class="value">' + stats.streak + ' day' + (stats.streak === 1 ? "" : "s") + '</span><span class="sub">Longest: ' + stats.longestStreak + "</span></div>" +
        '<div class="card stat"><span class="label">' + FL.icon("zap") + 'XP</span><span class="value">' + xp + '</span><span class="sub">Level ' + lvl.level + " · " + (100 - lvl.into) + " XP to next</span></div>" +
        '<div class="card stat"><span class="label">' + FL.icon("tasks") + 'Tasks today</span><span class="value">' + todayDone + " / " + todayTasks.length + '</span><span class="sub">completed</span></div>' +
      "</div>" +

      '<div class="card" style="margin-bottom:1.1rem"><div class="card-head"><h3>Daily focus goal</h3><span class="muted small">' +
        stats.minutesToday + " / " + settings.daily_goal_minutes + ' min</span></div>' +
        '<div class="bar"><span style="width:' + goalPct + '%"></span></div>' +
        '<p class="small muted" style="margin-top:.5rem">' + (goalPct >= 100 ? "Goal reached. Nice work." : "Complete your goal for +" + FL.XP.GOAL + " XP.") + "</p></div>" +

      '<div class="dash-grid"><div class="dash-col">' +
        '<div class="card"><div class="card-head"><h3>Current focus</h3></div>' +
          (focusTask
            ? '<div class="focus-now"><div><div class="task-name">' + FL.esc(focusTask.title) + '</div><span class="muted small">' + focusTask.estimated_sessions + " estimated session" + (focusTask.estimated_sessions === 1 ? "" : "s") + '</span></div>' +
              '<a class="btn btn-primary" href="timer.html?task=' + focusTask.id + '">' + FL.icon("play") + " Focus on this</a></div>"
            : '<div class="empty"><h4>Nothing in focus yet</h4><p>Add a task to Today, or start a session without one.</p><a class="btn btn-outline" href="timer.html">Quick start</a></div>') +
        "</div>" +
        '<div class="card"><div class="card-head"><h3>Today\'s tasks</h3><a class="small" href="tasks.html">Manage tasks</a></div>' +
          (todayTasks.length
            ? '<ul class="mini-tasks">' + taskRows + "</ul>"
            : '<div class="empty">' + FL.icon("tasks") + "<h4>No tasks planned for today</h4><p>Create a task and add it to Today to see it here.</p>" +
              '<a class="btn btn-primary" href="tasks.html">Add your first task</a></div>') +
        "</div></div>" +

        '<div class="dash-col">' +
          '<div class="card"><div class="card-head"><h3>Your garden</h3><a class="small" href="garden.html">Open</a></div>' +
            '<div class="garden-preview">' + FL.plantSVG(garden.stage, 84) + '<div class="meta"><strong>' + garden.name + '</strong>' +
            '<div class="bar" style="margin:.5rem 0"><span style="width:' + garden.pct + '%"></span></div>' +
            '<span class="small muted">' + (garden.toNext ? garden.toNext + " XP until " + FL.STAGES[garden.stage + 1] : "Fully bloomed") + "</span></div></div></div>" +
          '<div class="card"><div class="card-head"><h3>Recent achievements</h3><a class="small" href="achievements.html">View all</a></div>' +
            (recent.length
              ? '<div class="ach-mini">' + recent.map(function (r) {
                  return '<div class="row"><div class="ach-icon">' + FL.icon(r.achievements.icon) + '</div><div><strong>' + FL.esc(r.achievements.name) +
                    '</strong><div class="small muted">' + FL.esc(r.achievements.description) + "</div></div></div>";
                }).join("") + "</div>"
              : '<div class="empty">' + FL.icon("award") + "<h4>No achievements yet</h4><p>Finish a focus session to unlock your first one.</p></div>") +
          "</div></div></div>";

    content.querySelectorAll(".check").forEach(function (box) {
      box.addEventListener("change", async function () {
        const task = stats.tasks.find(function (t) { return t.id === box.dataset.id; });
        box.disabled = true;
        try { await FL.setTaskComplete(task, box.checked); } catch (e) { FL.toast(FL.humanError(e), "error"); }
        render();
      });
    });
  }

  try { await render(); } catch (e) {
    content.innerHTML = '<div class="card empty"><h4>Could not load your dashboard</h4><p>' + FL.esc(FL.humanError(e)) + "</p></div>";
  }
})();
