/* garden.js — plant growth driven by your XP */
(async function () {
  "use strict";
  await FL.boot("lab");
  const content = document.getElementById("content");
  const xp = FL.profile.xp;
  const g = FL.gardenInfo(xp);

  const tiles = FL.STAGES.map(function (name, i) {
    const cls = i < g.stage ? "reached" : i === g.stage ? "reached current" : "locked";
    return '<div class="stage-tile ' + cls + '">' + FL.plantSVG(i, 56) + '<div class="name">' + name + '</div><div class="xp">' + FL.STAGE_XP[i] + " XP</div></div>";
  }).join("");

  content.innerHTML =
    '<div class="page-head"><div><h1>Garden</h1><p>Every focus session helps your plant grow.</p></div></div>' + FL.labTabs("garden") +
    '<div class="card"><div class="garden-hero"><div class="big-plant">' + FL.plantSVG(g.stage, 150) + "</div><div>" +
      '<div class="eyebrow">Current stage</div><h2 style="margin:.3rem 0 .8rem">' + g.name + "</h2>" +
      '<div class="bar"><span style="width:' + g.pct + '%"></span></div>' +
      '<p class="small muted" style="margin-top:.5rem">' + xp + " XP total · " +
        (g.toNext ? g.toNext + " XP until " + FL.STAGES[g.stage + 1] : "fully bloomed") + "</p>" +
      '<p style="margin-top:1rem">Plants bloomed: <strong>' + g.bloomed + "</strong></p></div></div>" +
      '<div class="garden-row">' + tiles + "</div></div>" +
    '<div class="card" style="margin-top:1.1rem"><div class="card-head"><h3>How to earn XP</h3></div>' +
      '<div class="grid grid-3">' +
      '<div><strong>+' + FL.XP.SESSION + ' XP</strong><div class="small muted">Complete a focus session</div></div>' +
      '<div><strong>+' + FL.XP.TASK + ' XP</strong><div class="small muted">Complete a task (first time only)</div></div>' +
      '<div><strong>+' + FL.XP.GOAL + ' XP</strong><div class="small muted">Reach your daily focus goal</div></div></div></div>';
})();
