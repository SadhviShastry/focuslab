/* progress.js — long-term statistics aggregated from Supabase */
(async function () {
  "use strict";
  await FL.boot("lab");
  const content = document.getElementById("content");
  try {
    const st = await FL.getStats();
    const lvl = FL.level(FL.profile.xp);
    const rate = st.tasksTotal ? Math.round((st.tasksDone / st.tasksTotal) * 100) : 0;
    const avg = st.totalSessions ? Math.round(st.totalMinutes / st.totalSessions) : 0;

    const days = FL.lastNDays(30);
    const chart = FL.barChart(days.map(function (k) {
      return { label: String(FL.parseKey(k).getDate()), value: st.dayMap[k] || 0, highlight: k === FL.dateKey() };
    }), "m");

    let bestDay = null;
    Object.keys(st.dayMap).forEach(function (k) { if (!bestDay || st.dayMap[k] > st.dayMap[bestDay]) bestDay = k; });

    content.innerHTML =
      '<div class="page-head"><div><h1>Progress</h1><p>Your totals since you started.</p></div></div>' + FL.labTabs("progress") +
      '<div class="stats-row">' +
        '<div class="card stat"><span class="label">' + FL.icon("timer") + 'Focus sessions</span><span class="value">' + st.totalSessions + '</span><span class="sub">avg ' + avg + " min</span></div>" +
        '<div class="card stat"><span class="label">' + FL.icon("clock") + 'Total focus time</span><span class="value">' + FL.fmtMinutes(st.totalMinutes) + '</span><span class="sub">all time</span></div>' +
        '<div class="card stat"><span class="label">' + FL.icon("flame") + 'Longest streak</span><span class="value">' + st.longestStreak + '</span><span class="sub">current: ' + st.streak + "</span></div>" +
        '<div class="card stat"><span class="label">' + FL.icon("zap") + 'Level</span><span class="value">' + lvl.level + '</span><span class="sub">' + FL.profile.xp + " XP</span></div></div>" +
      '<div class="grid grid-2">' +
        '<div class="card"><div class="card-head"><h3>Milestones</h3></div><div class="progress-rows">' +
          row("Tasks completed", st.tasksDone + " / " + st.tasksTotal, rate) +
          row("Daily goals met", st.goalsMet + " day" + (st.goalsMet === 1 ? "" : "s"), Math.min(100, st.goalsMet * 10)) +
          row("Next level", lvl.into + " / 100 XP", lvl.into) + "</div>" +
          (bestDay ? '<p class="small muted" style="margin-top:1rem">Best day: ' + FL.fmtDate(bestDay) + " with " + FL.fmtMinutes(st.dayMap[bestDay]) + ".</p>" : "") + "</div>" +
        '<div class="card"><div class="card-head"><h3>Last 30 days</h3><span class="small muted">minutes per day</span></div>' + chart + "</div></div>";
  } catch (e) {
    content.innerHTML = '<div class="card empty"><h4>Could not load progress</h4><p>' + FL.esc(FL.humanError(e)) + "</p></div>";
  }

  function row(label, value, pct) {
    return '<div><div class="row-top"><span>' + label + '</span><strong>' + value + '</strong></div><div class="bar"><span style="width:' + pct + '%"></span></div></div>';
  }
})();
