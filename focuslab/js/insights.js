/* insights.js — weekly focus chart and habit statistics */
(async function () {
  "use strict";
  await FL.boot("insights");
  const content = document.getElementById("content");
  try {
    const st = await FL.getStats();
    const week = FL.lastNDays(7);
    const today = FL.dateKey();
    const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

    const weekItems = week.map(function (k) {
      return { label: dayNames[FL.parseKey(k).getDay()], value: st.dayMap[k] || 0, highlight: k === today };
    });
    const weekMinutes = weekItems.reduce(function (a, i) { return a + i.value; }, 0);
    const weekSessions = st.sessions.filter(function (s) { return week.indexOf(FL.dateKey(new Date(s.completed_at))) >= 0; }).length;
    const activeDays = weekItems.filter(function (i) { return i.value > 0; }).length;
    const rate = st.tasksTotal ? Math.round((st.tasksDone / st.tasksTotal) * 100) : 0;

    // Time-of-day buckets
    const buckets = { Morning: 0, Afternoon: 0, Evening: 0, Night: 0 };
    st.sessions.forEach(function (s) {
      const h = new Date(s.completed_at).getHours();
      buckets[h >= 5 && h < 12 ? "Morning" : h >= 12 && h < 17 ? "Afternoon" : h >= 17 && h < 22 ? "Evening" : "Night"] += s.duration_minutes;
    });
    const todItems = Object.keys(buckets).map(function (k) { return { label: k, value: buckets[k] }; });
    const bestTod = todItems.slice().sort(function (a, b) { return b.value - a.value; })[0];

    const rated = st.sessions.filter(function (s) { return s.focus_rating; });
    const avgRating = rated.length ? (rated.reduce(function (a, s) { return a + s.focus_rating; }, 0) / rated.length).toFixed(1) : null;

    if (!st.totalSessions && !st.tasksTotal) {
      content.innerHTML = '<div class="page-head"><div><h1>Insights</h1><p>Patterns in how you focus.</p></div></div>' +
        '<div class="card empty">' + FL.icon("chart") + "<h4>No data yet</h4><p>Complete a focus session or add a task and your insights will appear here.</p>" +
        '<a class="btn btn-primary" href="timer.html">Start a focus session</a></div>';
      return;
    }

    content.innerHTML =
      '<div class="page-head"><div><h1>Insights</h1><p>Patterns in how you focus.</p></div></div>' +
      '<div class="stats-row">' +
        '<div class="card stat"><span class="label">' + FL.icon("clock") + 'Focus this week</span><span class="value">' + FL.fmtMinutes(weekMinutes) + '</span><span class="sub">' + weekSessions + " sessions</span></div>" +
        '<div class="card stat"><span class="label">' + FL.icon("calendar") + 'Active days</span><span class="value">' + activeDays + " / 7</span><span class=\"sub\">this week</span></div>" +
        '<div class="card stat"><span class="label">' + FL.icon("timer") + 'Total focus time</span><span class="value">' + FL.fmtMinutes(st.totalMinutes) + '</span><span class="sub">' + st.totalSessions + " sessions overall</span></div>" +
        '<div class="card stat"><span class="label">' + FL.icon("tasks") + 'Task completion</span><span class="value">' + rate + '%</span><span class="sub">' + st.tasksDone + " of " + st.tasksTotal + " tasks</span></div></div>" +
      '<div class="grid grid-2">' +
        '<div class="card"><div class="card-head"><h3>This week</h3><span class="small muted">minutes per day</span></div>' + FL.barChart(weekItems, "m") + "</div>" +
        '<div class="card"><div class="card-head"><h3>Time of day</h3><span class="small muted">minutes focused</span></div>' + FL.barChart(todItems, "m") +
        (st.totalSessions ? '<p class="small muted" style="margin-top:.8rem">You focus the most in the <strong>' + bestTod.label.toLowerCase() + "</strong>.</p>" : "") + "</div></div>" +
      '<div class="card" style="margin-top:1.1rem"><div class="card-head"><h3>Habits</h3></div><div class="grid grid-3">' +
        "<div><strong>" + st.streak + " day streak</strong><div class=\"small muted\">Longest: " + st.longestStreak + " days</div></div>" +
        "<div><strong>" + st.goalsMet + " daily goals met</strong><div class=\"small muted\">Target: " + FL.settings.daily_goal_minutes + " min/day</div></div>" +
        "<div><strong>" + (avgRating ? avgRating + " / 5 focus rating" : "No ratings yet") + '</strong><div class="small muted">' + rated.length + " rated sessions</div></div></div></div>";
  } catch (e) {
    content.innerHTML = '<div class="card empty"><h4>Could not load insights</h4><p>' + FL.esc(FL.humanError(e)) + "</p></div>";
  }
})();
