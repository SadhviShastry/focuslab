/* lab.js — Lab overview (links to Garden, Experiments and Progress) */
(async function () {
  "use strict";
  await FL.boot("lab");
  const content = document.getElementById("content");
  try {
    const res = await Promise.all([
      FL.getStats(),
      sb.from("experiments").select("*").eq("user_id", FL.user.id).eq("status", "active").maybeSingle()
    ]);
    const stats = res[0], exp = res[1].data;
    const g = FL.gardenInfo(FL.profile.xp);

    content.innerHTML =
      '<div class="page-head"><div><h1>Lab</h1><p>Grow your garden, run experiments and review your progress.</p></div></div>' +
      FL.labTabs("lab") +
      '<div class="lab-cards">' +
      '<a class="card lab-card" href="garden.html"><div class="ach-icon">' + FL.icon("leaf") + "</div><h3>Garden</h3>" +
        '<div style="display:flex;align-items:center;gap:1rem">' + FL.plantSVG(g.stage, 64) + "<div><strong>" + g.name + '</strong><div class="small muted">' +
        FL.profile.xp + " XP earned</div></div></div>" +
        '<span class="go">Open garden ' + FL.icon("arrow") + "</span></a>" +
      '<a class="card lab-card" href="experiments.html"><div class="ach-icon">' + FL.icon("flask") + "</div><h3>Experiments</h3>" +
        (exp
          ? '<p class="muted small">Active: <strong>' + FL.esc(exp.name) + "</strong><br>" + exp.minutes_a + " min vs " + exp.minutes_b + " min</p>"
          : '<p class="muted small">Compare 25-minute and 50-minute sessions, or design your own test.</p>') +
        '<span class="go">Open experiments ' + FL.icon("arrow") + "</span></a>" +
      '<a class="card lab-card" href="progress.html"><div class="ach-icon">' + FL.icon("chart") + "</div><h3>Progress</h3>" +
        '<p class="muted small">' + stats.totalSessions + " sessions · " + FL.fmtMinutes(stats.totalMinutes) + " focused · " + stats.tasksDone + " tasks done</p>" +
        '<span class="go">View progress ' + FL.icon("arrow") + "</span></a></div>";
  } catch (e) {
    content.innerHTML = '<div class="card empty"><h4>Could not load the lab</h4><p>' + FL.esc(FL.humanError(e)) + "</p></div>";
  }
})();
