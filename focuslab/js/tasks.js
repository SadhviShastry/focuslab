/* tasks.js — full CRUD for tasks, stored in Supabase */
(async function () {
  "use strict";
  await FL.boot("tasks");
  const content = document.getElementById("content");

  let tasks = [];
  let filter = "active"; // all | today | active | done

  content.innerHTML =
    '<div class="page-head"><div><h1>Tasks</h1><p>Plan your work, then focus on it.</p></div>' +
    '<button class="btn btn-primary" id="newBtn">' + FL.icon("plus") + " New task</button></div>" +
    '<div class="task-toolbar"><div class="filters" id="filters"></div></div>' +
    '<div id="list" class="task-list"><div class="spinner"></div></div>';

  document.getElementById("newBtn").onclick = function () { openForm(); };

  async function load() {
    const r = await sb.from("tasks").select("*").eq("user_id", FL.user.id).order("created_at", { ascending: false });
    if (r.error) {
      document.getElementById("list").innerHTML = '<div class="card empty"><h4>Could not load tasks</h4><p>' + FL.esc(r.error.message) + "</p></div>";
      return;
    }
    tasks = r.data;
    draw();
  }

  function visible() {
    return tasks.filter(function (t) {
      if (filter === "today") return FL.isTodayTask(t);
      if (filter === "active") return !t.completed;
      if (filter === "done") return t.completed;
      return true;
    }).sort(function (a, b) {
      if (a.completed !== b.completed) return a.completed ? 1 : -1;
      const rank = { high: 0, medium: 1, low: 2 };
      return rank[a.priority] - rank[b.priority];
    });
  }

  function draw() {
    const counts = {
      all: tasks.length,
      today: tasks.filter(FL.isTodayTask).length,
      active: tasks.filter(function (t) { return !t.completed; }).length,
      done: tasks.filter(function (t) { return t.completed; }).length
    };
    const labels = { active: "Active", today: "Today", done: "Completed", all: "All" };
    document.getElementById("filters").innerHTML = Object.keys(labels).map(function (k) {
      return '<button class="chip ' + (filter === k ? "active" : "") + '" data-f="' + k + '">' + labels[k] + " (" + counts[k] + ")</button>";
    }).join("");
    document.querySelectorAll("#filters .chip").forEach(function (b) {
      b.onclick = function () { filter = b.dataset.f; draw(); };
    });

    const list = document.getElementById("list");
    const items = visible();
    if (!items.length) {
      list.innerHTML = '<div class="card empty">' + FL.icon("tasks") +
        (tasks.length === 0
          ? "<h4>No tasks yet</h4><p>Create your first task to start planning your day.</p>"
          : "<h4>Nothing here</h4><p>No tasks match this filter.</p>") + "</div>";
      return;
    }
    const today = FL.dateKey();
    list.innerHTML = items.map(function (t) {
      const inToday = FL.isTodayTask(t);
      const overdue = t.due_date && !t.completed && t.due_date < today;
      return '<div class="task ' + (t.completed ? "done" : "") + '" data-id="' + t.id + '">' +
        '<input type="checkbox" class="check" aria-label="Mark complete"' + (t.completed ? " checked" : "") + ">" +
        '<div class="task-body"><div class="task-title">' + FL.esc(t.title) + "</div>" +
        (t.description ? '<div class="task-desc">' + FL.esc(t.description) + "</div>" : "") +
        '<div class="task-meta"><span class="badge ' + t.priority + '">' + t.priority + "</span>" +
        '<span class="m">' + FL.icon("timer") + t.estimated_sessions + " session" + (t.estimated_sessions === 1 ? "" : "s") + "</span>" +
        (t.due_date ? '<span class="m ' + (overdue ? "overdue" : "") + '">' + FL.icon("calendar") + (overdue ? "Overdue · " : "Due ") + FL.fmtDate(t.due_date) + "</span>" : "") +
        (inToday ? '<span class="badge">Today</span>' : "") + "</div></div>" +
        '<div class="task-actions">' +
        (t.completed ? "" : '<a class="icon-btn" title="Start focus" aria-label="Start focus" href="timer.html?task=' + t.id + '">' + FL.icon("play") + "</a>") +
        '<button class="icon-btn today-btn ' + (inToday ? "today-on" : "") + '" title="' + (inToday ? "Remove from Today" : "Add to Today") + '" aria-label="Toggle today">' + FL.icon("calendar") + "</button>" +
        '<button class="icon-btn edit-btn" title="Edit" aria-label="Edit">' + FL.icon("edit") + "</button>" +
        '<button class="icon-btn danger del-btn" title="Delete" aria-label="Delete">' + FL.icon("trash") + "</button></div></div>";
    }).join("");

    list.querySelectorAll(".task").forEach(function (row) {
      const task = tasks.find(function (t) { return t.id === row.dataset.id; });
      row.querySelector(".check").onchange = async function (e) {
        e.target.disabled = true;
        try { await FL.setTaskComplete(task, e.target.checked); } catch (err) { FL.toast(FL.humanError(err), "error"); }
        load();
      };
      row.querySelector(".today-btn").onclick = async function () {
        const inToday = FL.isTodayTask(task);
        const r = await sb.from("tasks").update({ plan_date: inToday ? null : FL.dateKey() }).eq("id", task.id);
        if (r.error) FL.toast(r.error.message, "error");
        load();
      };
      row.querySelector(".edit-btn").onclick = function () { openForm(task); };
      row.querySelector(".del-btn").onclick = async function () {
        if (!(await FL.confirm('Delete "' + task.title + '"? This cannot be undone.'))) return;
        const r = await sb.from("tasks").delete().eq("id", task.id);
        if (r.error) return FL.toast(r.error.message, "error");
        if (FL.getFocusTaskId() === task.id) FL.setFocusTaskId(null);
        FL.toast("Task deleted.");
        load();
      };
    });
  }

  function openForm(task) {
    const editing = !!task;
    const t = task || { title: "", description: "", priority: "medium", due_date: "", estimated_sessions: 1, plan_date: null };
    const m = FL.openModal(
      "<h3>" + (editing ? "Edit task" : "New task") + "</h3>" +
      '<form id="taskForm" novalidate><div id="formMsg"></div>' +
      '<div class="field"><label for="f_title">Title</label><input id="f_title" maxlength="200" required value="' + FL.esc(t.title) + '" placeholder="e.g. Finish chapter 4 notes"></div>' +
      '<div class="field"><label for="f_desc">Description (optional)</label><textarea id="f_desc" maxlength="1000">' + FL.esc(t.description) + "</textarea></div>" +
      '<div class="form-row"><div class="field"><label for="f_pri">Priority</label><select id="f_pri">' +
      ["low", "medium", "high"].map(function (p) { return '<option value="' + p + '"' + (t.priority === p ? " selected" : "") + ">" + p.charAt(0).toUpperCase() + p.slice(1) + "</option>"; }).join("") +
      '</select></div><div class="field"><label for="f_est">Estimated sessions</label><input id="f_est" type="number" min="1" max="50" value="' + t.estimated_sessions + '"></div></div>' +
      '<div class="form-row"><div class="field"><label for="f_due">Due date (optional)</label><input id="f_due" type="date" value="' + (t.due_date || "") + '"></div>' +
      '<div class="field"><label>&nbsp;</label><label style="display:flex;gap:.5rem;align-items:center;font-weight:500;padding:.65rem 0"><input type="checkbox" id="f_today" style="width:auto"' + (FL.isTodayTask(t) ? " checked" : "") + "> Add to Today</label></div></div>" +
      '<div class="modal-actions"><button type="button" class="btn btn-ghost" id="cancelBtn">Cancel</button><button type="submit" class="btn btn-primary">' + (editing ? "Save changes" : "Create task") + "</button></div></form>"
    );
    m.querySelector("#cancelBtn").onclick = function () { m.remove(); };
    m.querySelector("#taskForm").onsubmit = async function (e) {
      e.preventDefault();
      const title = m.querySelector("#f_title").value.trim();
      const est = parseInt(m.querySelector("#f_est").value, 10);
      if (!title) { m.querySelector("#formMsg").innerHTML = '<div class="form-error">Please enter a title.</div>'; return; }
      if (!(est >= 1 && est <= 50)) { m.querySelector("#formMsg").innerHTML = '<div class="form-error">Estimated sessions must be 1 to 50.</div>'; return; }
      const wantToday = m.querySelector("#f_today").checked;
      const row = {
        title: title,
        description: m.querySelector("#f_desc").value.trim(),
        priority: m.querySelector("#f_pri").value,
        estimated_sessions: est,
        due_date: m.querySelector("#f_due").value || null
      };
      // Keep an existing plan date unless the checkbox state changed.
      const wasToday = editing && FL.isTodayTask(task);
      if (wantToday && !wasToday) row.plan_date = FL.dateKey();
      if (!wantToday && wasToday) row.plan_date = null;

      const r = editing
        ? await sb.from("tasks").update(row).eq("id", task.id)
        : await sb.from("tasks").insert(Object.assign({ user_id: FL.user.id }, row));
      if (r.error) { m.querySelector("#formMsg").innerHTML = '<div class="form-error">' + FL.esc(r.error.message) + "</div>"; return; }
      m.remove();
      FL.toast(editing ? "Task updated." : "Task created.");
      load();
    };
  }

  await load();
  // Real-time: changes made in another tab or device show up here automatically.
  FL.subscribeTasks(function () { load(); });
})();
