/* achievements.js — unlocked and locked achievements with progress */
(async function () {
  "use strict";
  await FL.boot("achievements");
  const content = document.getElementById("content");
  try {
    // Catch up on anything earned before this page was opened
    await FL.checkAchievements();
    const res = await Promise.all([
      FL.getStats(),
      sb.from("achievements").select("*").order("threshold", { ascending: true }),
      sb.from("user_achievements").select("achievement_id, unlocked_at").eq("user_id", FL.user.id)
    ]);
    const stats = res[0], all = res[1].data || [], mine = res[2].data || [];
    const got = {};
    mine.forEach(function (m) { got[m.achievement_id] = m.unlocked_at; });

    const order = { sessions: 0, tasks: 1, streak: 2, minutes: 3, goals: 4, bloom: 5 };
    all.sort(function (a, b) { return order[a.condition_type] - order[b.condition_type] || a.threshold - b.threshold; });

    const unit = { sessions: "sessions", tasks: "tasks", streak: "day streak", minutes: "minutes", goals: "daily goals", bloom: "plants bloomed" };
    const cards = all.map(function (a) {
      const unlocked = !!got[a.id];
      const val = Math.min(FL.achievementValue(a.condition_type, stats), a.threshold);
      return '<div class="card ach-card ' + (unlocked ? "" : "locked") + '"><div class="ach-icon ' + (unlocked ? "" : "locked") + '">' + FL.icon(unlocked ? a.icon : "lock") + "</div><div style=\"flex:1\">" +
        "<h4>" + FL.esc(a.name) + '</h4><div class="small muted">' + FL.esc(a.description) + "</div>" +
        (unlocked
          ? '<div class="small" style="margin-top:.5rem;color:var(--leaf-dark)">Unlocked ' + FL.fmtDate(got[a.id]) + "</div>"
          : '<div class="bar" style="margin-top:.6rem"><span style="width:' + Math.round((val / a.threshold) * 100) + '%"></span></div><div class="small muted" style="margin-top:.25rem">' + val + " / " + a.threshold + " " + unit[a.condition_type] + "</div>") +
        "</div></div>";
    }).join("");

    content.innerHTML = '<div class="page-head"><div><h1>Achievements</h1><p>' + mine.length + " of " + all.length + " unlocked</p></div></div>" +
      '<div class="ach-grid">' + cards + "</div>";
  } catch (e) {
    content.innerHTML = '<div class="card empty"><h4>Could not load achievements</h4><p>' + FL.esc(FL.humanError(e)) + "</p></div>";
  }
})();
