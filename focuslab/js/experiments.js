/* experiments.js — compare focus session lengths using your real sessions */
(async function () {
  "use strict";
  await FL.boot("lab");
  const content = document.getElementById("content");
  const MIN_RATED = 3; // ratings needed per variant before naming a winner

  let experiments = [];
  let sessions = [];

  // Summary numbers for a list of sessions
  function summarize(list) {
    const rated = list.filter(function (s) { return s.focus_rating; });
    let mins = 0, sum = 0;
    list.forEach(function (s) { mins += s.duration_minutes; });
    rated.forEach(function (s) { sum += s.focus_rating; });
    return { count: list.length, minutes: mins, rated: rated.length, avg: rated.length ? sum / rated.length : null };
  }

  function variantCard(label, minutes, sum, isWinner) {
    return '<div class="card variant ' + (isWinner ? "winner" : "") + '">' +
      '<div class="eyebrow">' + label + '</div><div class="mins">' + minutes + ' min</div>' +
      "<dl><dt>Sessions</dt><dd>" + sum.count + "</dd><dt>Total focus</dt><dd>" + FL.fmtMinutes(sum.minutes) + "</dd>" +
      "<dt>Avg focus rating</dt><dd>" + (sum.avg !== null ? sum.avg.toFixed(1) + " / 5" : "n/a") + "</dd>" +
      "<dt>Rated sessions</dt><dd>" + sum.rated + "</dd></dl>" +
      (isWinner ? '<div class="badge" style="margin-top:.8rem">' + FL.icon("check") + " Higher rating</div>" : "") + "</div>";
  }

  function verdict(a, b, minA, minB) {
    if (a.rated < MIN_RATED || b.rated < MIN_RATED) {
      return { text: "Not enough data yet. Rate at least " + MIN_RATED + " sessions of each length after finishing them.", winner: null };
    }
    if (Math.abs(a.avg - b.avg) < 0.2) return { text: "Too close to call. Both lengths feel about the same for you.", winner: null };
    const w = a.avg > b.avg ? "A" : "B";
    return { text: (w === "A" ? minA : minB) + "-minute sessions are rated higher so far.", winner: w };
  }

  function render() {
    // 1) Built-in comparison: every session you did at exactly 25 or 50 minutes
    const s25 = summarize(sessions.filter(function (s) { return s.duration_minutes === 25; }));
    const s50 = summarize(sessions.filter(function (s) { return s.duration_minutes === 50; }));
    const v0 = verdict(s25, s50, 25, 50);

    const active = experiments.find(function (e) { return e.status === "active"; });
    const ended = experiments.filter(function (e) { return e.status === "ended"; });

    let html = '<div class="page-head"><div><h1>Experiments</h1><p>Find the session length that works best for you.</p></div>' +
      (active ? "" : '<button class="btn btn-primary" id="newExp">' + FL.icon("plus") + " New experiment</button>") + "</div>" + FL.labTabs("experiments");

    html += '<div class="card"><div class="card-head"><h3>25 vs 50 minutes</h3><span class="small muted">All your sessions</span></div>' +
      '<p class="small muted">Uses every session you completed at exactly 25 or 50 minutes. Rate sessions after the timer ends to compare how focused you felt.</p>' +
      '<div class="vs-grid">' + variantCard("Standard", 25, s25, v0.winner === "A") + variantCard("Extended", 50, s50, v0.winner === "B") + "</div>" +
      '<p style="margin-top:1rem">' + FL.esc(v0.text) + "</p></div>";

    if (active) {
      const sa = summarize(sessions.filter(function (s) { return s.experiment_id === active.id && s.duration_minutes === active.minutes_a; }));
      const sb2 = summarize(sessions.filter(function (s) { return s.experiment_id === active.id && s.duration_minutes === active.minutes_b; }));
      const v = verdict(sa, sb2, active.minutes_a, active.minutes_b);
      html += '<div class="card" style="margin-top:1.1rem"><div class="card-head"><h3>Active: ' + FL.esc(active.name) + '</h3>' +
        '<button class="btn btn-outline btn-sm" id="endExp">End experiment</button></div>' +
        (active.hypothesis ? '<p class="muted"><em>Hypothesis:</em> ' + FL.esc(active.hypothesis) + "</p>" : "") +
        '<div class="vs-grid">' + variantCard("Variant A", active.minutes_a, sa, v.winner === "A") + variantCard("Variant B", active.minutes_b, sb2, v.winner === "B") + "</div>" +
        '<p style="margin-top:1rem">' + FL.esc(v.text) + '</p><p class="small muted" style="margin-top:.4rem">Pick a variant on the <a href="timer.html">timer page</a> to log sessions into this experiment.</p></div>';
    }

    html += '<div class="card" style="margin-top:1.1rem"><div class="card-head"><h3>Past experiments</h3></div>';
    if (!ended.length) {
      html += '<div class="empty">' + FL.icon("flask") + "<h4>No finished experiments</h4><p>End an active experiment to save your conclusion here.</p></div>";
    } else {
      html += ended.map(function (e) {
        return '<div class="exp-item"><div><strong>' + FL.esc(e.name) + '</strong><div class="small muted">' + e.minutes_a + " min vs " + e.minutes_b + " min · " + FL.fmtDate(e.started_at) +
          " to " + FL.fmtDate(e.ended_at) + "</div>" + (e.conclusion ? '<div class="small" style="margin-top:.3rem">' + FL.esc(e.conclusion) + "</div>" : "") +
          '</div><button class="icon-btn danger" data-del="' + e.id + '" aria-label="Delete experiment">' + FL.icon("trash") + "</button></div>";
      }).join("");
    }
    html += "</div>";
    content.innerHTML = html;

    const nb = document.getElementById("newExp");
    if (nb) nb.onclick = openNew;
    const eb = document.getElementById("endExp");
    if (eb) eb.onclick = function () { openEnd(active); };
    content.querySelectorAll("[data-del]").forEach(function (b) {
      b.onclick = async function () {
        if (!(await FL.confirm("Delete this experiment? Your sessions are kept."))) return;
        const r = await sb.from("experiments").delete().eq("id", b.dataset.del);
        if (r.error) return FL.toast(r.error.message, "error");
        load();
      };
    });
  }

  function openNew() {
    const m = FL.openModal(
      "<h3>New experiment</h3><form id=\"expForm\" novalidate><div id=\"expMsg\"></div>" +
      '<div class="field"><label for="e_name">Name</label><input id="e_name" maxlength="120" placeholder="e.g. Morning deep work"></div>' +
      '<div class="field"><label for="e_hyp">Hypothesis (optional)</label><textarea id="e_hyp" placeholder="I focus better in longer sessions."></textarea></div>' +
      '<div class="form-row"><div class="field"><label for="e_a">Variant A (minutes)</label><input id="e_a" type="number" min="1" max="180" value="25"></div>' +
      '<div class="field"><label for="e_b">Variant B (minutes)</label><input id="e_b" type="number" min="1" max="180" value="50"></div></div>' +
      '<div class="modal-actions"><button type="button" class="btn btn-ghost" id="c">Cancel</button><button class="btn btn-primary" type="submit">Start experiment</button></div></form>'
    );
    m.querySelector("#c").onclick = function () { m.remove(); };
    m.querySelector("#expForm").onsubmit = async function (e) {
      e.preventDefault();
      const name = m.querySelector("#e_name").value.trim();
      const a = parseInt(m.querySelector("#e_a").value, 10), b = parseInt(m.querySelector("#e_b").value, 10);
      const err = function (t) { m.querySelector("#expMsg").innerHTML = '<div class="form-error">' + FL.esc(t) + "</div>"; };
      if (!name) return err("Please name your experiment.");
      if (!(a >= 1 && a <= 180 && b >= 1 && b <= 180)) return err("Minutes must be between 1 and 180.");
      if (a === b) return err("The two variants must be different lengths.");
      const r = await sb.from("experiments").insert({ user_id: FL.user.id, name: name, hypothesis: m.querySelector("#e_hyp").value.trim(), minutes_a: a, minutes_b: b });
      if (r.error) return err(r.error.message.indexOf("one_active") >= 0 ? "You already have an active experiment. End it first." : r.error.message);
      m.remove();
      FL.toast("Experiment started.");
      load();
    };
  }

  function openEnd(exp) {
    const m = FL.openModal(
      "<h3>End experiment</h3><p class=\"muted small\" style=\"margin-bottom:1rem\">Write what you learned. It is saved with the experiment.</p>" +
      '<div class="field"><label for="e_con">Conclusion</label><textarea id="e_con" placeholder="Longer sessions worked better in the morning."></textarea></div>' +
      '<div class="modal-actions"><button class="btn btn-ghost" id="c">Cancel</button><button class="btn btn-primary" id="ok">End experiment</button></div>'
    );
    m.querySelector("#c").onclick = function () { m.remove(); };
    m.querySelector("#ok").onclick = async function () {
      const r = await sb.from("experiments").update({ status: "ended", ended_at: new Date().toISOString(), conclusion: m.querySelector("#e_con").value.trim() || null }).eq("id", exp.id);
      if (r.error) return FL.toast(r.error.message, "error");
      m.remove();
      load();
    };
  }

  async function load() {
    try {
      const res = await Promise.all([
        sb.from("experiments").select("*").eq("user_id", FL.user.id).order("started_at", { ascending: false }),
        sb.from("focus_sessions").select("id,duration_minutes,focus_rating,experiment_id").eq("user_id", FL.user.id).limit(5000)
      ]);
      experiments = res[0].data || [];
      sessions = res[1].data || [];
      render();
    } catch (e) {
      content.innerHTML = '<div class="card empty"><h4>Could not load experiments</h4><p>' + FL.esc(FL.humanError(e)) + "</p></div>";
    }
  }
  load();
})();
