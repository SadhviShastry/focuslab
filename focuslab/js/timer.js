/* timer.js — Pomodoro focus timer.
   The timer counts against a real end timestamp, so it stays accurate even if the
   browser throttles background tabs. A session is saved only when it fully completes. */
(async function () {
  "use strict";
  await FL.boot("timer");
  const S = FL.settings;
  const content = document.getElementById("content");
  const CIRC = 2 * Math.PI * 110;

  // ---- state ----
  let mode = "focus";            // focus | short | long
  let focusMin = S.focus_minutes;
  let total = focusMin * 60;
  let remaining = total;
  let running = false;
  let endAt = 0;
  let tickId = null;
  let cycle = 0;                 // focus sessions finished in the current cycle
  let saving = false;
  let tasks = [];
  let experiment = null;
  let selectedTaskId = new URLSearchParams(location.search).get("task") || FL.getFocusTaskId() || "";
  let lockedTaskId = null;       // task the running session belongs to
  let lockedMinutes = focusMin;

  const MODE_LABEL = { focus: "Focus", short: "Short break", long: "Long break" };
  const minutesFor = function (m) {
    return m === "focus" ? focusMin : m === "short" ? S.short_break_minutes : S.long_break_minutes;
  };

  // ---- data ----
  async function loadTasks() {
    const r = await sb.from("tasks").select("*").eq("user_id", FL.user.id).eq("completed", false).order("created_at", { ascending: false });
    tasks = (r.data || []).sort(function (a, b) { return (FL.isTodayTask(b) ? 1 : 0) - (FL.isTodayTask(a) ? 1 : 0); });
    if (selectedTaskId && !tasks.find(function (t) { return t.id === selectedTaskId; })) selectedTaskId = "";
  }
  async function loadExperiment() {
    const r = await sb.from("experiments").select("*").eq("user_id", FL.user.id).eq("status", "active").maybeSingle();
    experiment = r.data || null;
    if (experiment) focusMin = experiment.minutes_a; // start on variant A
  }
  async function loadToday() {
    const start = new Date(); start.setHours(0, 0, 0, 0);
    const r = await sb.from("focus_sessions").select("duration_minutes, completed_at, tasks(title)")
      .eq("user_id", FL.user.id).gte("completed_at", start.toISOString()).order("completed_at", { ascending: false });
    const list = r.data || [];
    const el = document.getElementById("todayList");
    if (!el) return;
    el.innerHTML = list.length
      ? list.map(function (s) {
          return "<li><span>" + FL.esc(s.tasks ? s.tasks.title : "No task") + '</span><span class="muted">' + s.duration_minutes + " min</span></li>";
        }).join("")
      : '<li class="muted">No sessions yet today.</li>';
  }

  // ---- layout ----
  function build() {
    content.innerHTML =
      '<div class="page-head"><div><h1>Focus Timer</h1><p>One session at a time.</p></div></div>' +
      '<div class="timer-wrap"><div class="card timer-card">' +
      '<div class="mode-tabs" id="modeTabs">' +
      ["focus", "short", "long"].map(function (m) { return '<button class="mode-tab" data-m="' + m + '">' + MODE_LABEL[m] + "</button>"; }).join("") + "</div>" +
      '<div class="ring"><svg viewBox="0 0 240 240" aria-hidden="true"><circle class="track" cx="120" cy="120" r="110" fill="none" stroke-width="9"/>' +
      '<circle class="progress" id="ringProg" cx="120" cy="120" r="110" fill="none" stroke-width="9" stroke-dasharray="' + CIRC + '" stroke-dashoffset="0"/></svg>' +
      '<div class="readout"><div class="time" id="clock" role="timer" aria-live="off">25:00</div><div class="mode-label" id="modeLabel">Focus</div></div></div>' +
      '<div class="controls"><button class="btn btn-primary" id="startBtn"></button>' +
      '<button class="btn btn-outline" id="resetBtn">' + FL.icon("reset") + " Reset</button>" +
      '<button class="btn btn-ghost" id="skipBtn">' + FL.icon("skip") + " Skip</button></div>" +
      '<div class="cycle-dots" id="dots" title="Sessions until long break"></div></div>' +

      '<div class="dash-col"><div class="card"><div class="card-head"><h3>Working on</h3></div>' +
      '<div class="field" style="margin-bottom:0"><select id="taskSel" aria-label="Task"></select>' +
      '<span class="hint">Pick a task, or focus without one.</span></div></div>' +
      '<div id="expCard"></div>' +
      '<div class="card"><div class="card-head"><h3>Today\'s sessions</h3><a class="small" href="settings.html">Timer settings</a></div><ul class="today-sessions" id="todayList"></ul></div>' +
      "</div></div>";

    document.querySelectorAll(".mode-tab").forEach(function (b) {
      b.onclick = function () {
        if (running) return FL.toast("Pause or reset the timer first.", "error");
        setMode(b.dataset.m);
      };
    });
    document.getElementById("startBtn").onclick = function () { running ? pause() : start(); };
    document.getElementById("resetBtn").onclick = reset;
    document.getElementById("skipBtn").onclick = skip;
    document.getElementById("taskSel").onchange = function (e) {
      if (running) { e.target.value = lockedTaskId || ""; return FL.toast("Finish or reset the session to change tasks.", "error"); }
      selectedTaskId = e.target.value;
      FL.setFocusTaskId(selectedTaskId);
    };
    drawTasks();
    drawExperiment();
  }

  function drawTasks() {
    const sel = document.getElementById("taskSel");
    sel.innerHTML = '<option value="">No task (free focus)</option>' + tasks.map(function (t) {
      return '<option value="' + t.id + '"' + (t.id === selectedTaskId ? " selected" : "") + ">" + FL.esc(t.title) + (FL.isTodayTask(t) ? " (Today)" : "") + "</option>";
    }).join("");
  }

  function drawExperiment() {
    const el = document.getElementById("expCard");
    if (!experiment) { el.innerHTML = ""; return; }
    el.innerHTML = '<div class="card"><div class="card-head"><h3>Experiment</h3><a class="small" href="experiments.html">Details</a></div>' +
      '<p class="small muted" style="margin-bottom:.7rem">' + FL.esc(experiment.name) + ": choose which session length to try.</p>" +
      '<div class="mode-tabs" id="variantTabs">' +
      [experiment.minutes_a, experiment.minutes_b].map(function (m) {
        return '<button class="mode-tab ' + (m === focusMin ? "active" : "") + '" data-min="' + m + '">' + m + " min</button>";
      }).join("") + "</div></div>";
    el.querySelectorAll("[data-min]").forEach(function (b) {
      b.onclick = function () {
        if (running) return FL.toast("Pause or reset the timer first.", "error");
        focusMin = parseInt(b.dataset.min, 10);
        if (mode === "focus") { total = remaining = focusMin * 60; }
        drawExperiment();
        paint();
      };
    });
  }

  // ---- painting ----
  function paint() {
    document.getElementById("clock").textContent = FL.fmtClock(remaining);
    document.getElementById("modeLabel").textContent = MODE_LABEL[mode];
    const done = total ? 1 - remaining / total : 0;
    document.getElementById("ringProg").style.strokeDashoffset = String(CIRC * (1 - done));
    const started = remaining < total;
    document.getElementById("startBtn").innerHTML = running
      ? FL.icon("pause") + " Pause"
      : FL.icon("play") + (started ? " Resume" : " Start");
    document.querySelectorAll(".mode-tab[data-m]").forEach(function (b) { b.classList.toggle("active", b.dataset.m === mode); });
    const n = S.sessions_before_long;
    document.getElementById("dots").innerHTML = Array.from({ length: n }, function (_, i) {
      return '<span class="' + (i < cycle % n ? "on" : "") + '"></span>';
    }).join("");
    document.title = (running ? FL.fmtClock(remaining) + " · " : "") + MODE_LABEL[mode] + " — FocusLab";
  }

  // ---- controls ----
  function setMode(m) {
    mode = m;
    total = remaining = minutesFor(m) * 60;
    paint();
  }
  function start() {
    if (remaining <= 0) remaining = total;
    if (mode === "focus" && remaining === total) { lockedTaskId = selectedTaskId || null; lockedMinutes = focusMin; }
    endAt = Date.now() + remaining * 1000;
    running = true;
    clearInterval(tickId);
    tickId = setInterval(tick, 250);
    paint();
  }
  function pause() {
    remaining = Math.max(0, Math.ceil((endAt - Date.now()) / 1000));
    running = false;
    clearInterval(tickId);
    paint();
  }
  function reset() {
    running = false;
    clearInterval(tickId);
    remaining = total;
    paint();
  }
  function skip() {
    running = false;
    clearInterval(tickId);
    if (mode === "focus") {
      FL.toast("Session skipped. Skipped sessions are not saved.");
      setMode("short");
    } else {
      setMode("focus");
    }
  }
  function tick() {
    remaining = Math.max(0, Math.ceil((endAt - Date.now()) / 1000));
    paint();
    if (remaining <= 0) complete();
  }

  function beep() {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      [0, 0.25].forEach(function (d) {
        const o = ctx.createOscillator(), g = ctx.createGain();
        o.frequency.value = 660; o.connect(g); g.connect(ctx.destination);
        g.gain.setValueAtTime(0.15, ctx.currentTime + d);
        g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + d + 0.2);
        o.start(ctx.currentTime + d); o.stop(ctx.currentTime + d + 0.2);
      });
    } catch (e) { /* sound is optional */ }
  }

  async function complete() {
    if (saving) return;
    running = false;
    clearInterval(tickId);
    beep();

    if (mode !== "focus") {
      FL.toast("Break finished. Ready for the next session?");
      setMode("focus");
      return;
    }

    saving = true;
    const taskId = lockedTaskId;
    const minutes = lockedMinutes;
    const inExperiment = experiment && (minutes === experiment.minutes_a || minutes === experiment.minutes_b);
    try {
      const res = await FL.recordSession({
        taskId: taskId, minutes: minutes, plannedMinutes: minutes, experimentId: inExperiment ? experiment.id : null
      });
      cycle++;
      const next = cycle % S.sessions_before_long === 0 ? "long" : "short";
      setMode(next);
      showDone(res, taskId, minutes);
      loadToday();
      if (S.auto_start_breaks) start();
    } catch (e) {
      FL.toast("Could not save the session: " + FL.humanError(e), "error");
      setMode("focus");
    }
    saving = false;
  }

  function showDone(res, taskId, minutes) {
    const task = tasks.find(function (t) { return t.id === taskId; });
    const m = FL.openModal(
      '<div style="text-align:center"><h3>Session complete</h3>' +
      '<p class="muted" style="margin:.4rem 0">' + minutes + " minutes of focus saved. +" + FL.XP.SESSION + " XP" +
      (res.goalJustMet ? " and +" + FL.XP.GOAL + " XP for your daily goal" : "") + ".</p>" +
      '<p class="small muted">How focused were you?</p>' +
      '<div class="rating">' + [1, 2, 3, 4, 5].map(function (n) { return '<button data-r="' + n + '" aria-label="Rating ' + n + '">' + n + "</button>"; }).join("") + "</div>" +
      (task ? '<button class="btn btn-outline btn-block" id="finishTask" style="margin-bottom:.6rem">' + FL.icon("check") + ' Mark "' + FL.esc(task.title) + '" complete (+' + FL.XP.TASK + " XP)</button>" : "") +
      '<button class="btn btn-primary btn-block" id="closeDone">Continue</button></div>'
    );
    m.querySelectorAll("[data-r]").forEach(function (b) {
      b.onclick = async function () {
        m.querySelectorAll("[data-r]").forEach(function (x) { x.classList.toggle("on", x === b); });
        await sb.from("focus_sessions").update({ focus_rating: parseInt(b.dataset.r, 10) }).eq("id", res.session.id);
      };
    });
    const ft = m.querySelector("#finishTask");
    if (ft) ft.onclick = async function () {
      ft.disabled = true;
      try {
        await FL.setTaskComplete(task, true);
        ft.remove();
        await loadTasks();
        if (selectedTaskId === task.id) selectedTaskId = "";
        drawTasks();
      } catch (e) { FL.toast(FL.humanError(e), "error"); ft.disabled = false; }
    };
    m.querySelector("#closeDone").onclick = function () { m.remove(); };
  }

  window.addEventListener("beforeunload", function (e) {
    if (running && mode === "focus") { e.preventDefault(); e.returnValue = ""; }
  });

  // ---- go ----
  await Promise.all([loadTasks(), loadExperiment()]);
  total = remaining = focusMin * 60;
  build();
  paint();
  loadToday();
})();
