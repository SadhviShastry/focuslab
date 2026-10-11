/* auth.js — sign up and log in (used by login.html and signup.html) */
(async function () {
  "use strict";
  const msg = document.getElementById("msg");
  const btn = document.getElementById("submitBtn");

  function show(text, ok) {
    msg.innerHTML = '<div class="' + (ok ? "form-ok" : "form-error") + '" role="alert">' + FL.esc(text) + "</div>";
  }

  if (!window.FOCUSLAB_CONFIGURED) {
    show("Supabase is not configured yet. Add your keys to js/config.js (see README).");
    return;
  }

  // Persistent login: if a session already exists, skip the form.
  const s = await sb.auth.getSession();
  if (s.data.session) { location.replace("dashboard.html"); return; }

  const login = document.getElementById("loginForm");
  const signup = document.getElementById("signupForm");

  if (login) {
    login.addEventListener("submit", async function (e) {
      e.preventDefault();
      const email = document.getElementById("email").value.trim();
      const password = document.getElementById("password").value;
      if (!email || !password) return show("Please enter your email and password.");
      btn.disabled = true; btn.textContent = "Logging in...";
      const r = await sb.auth.signInWithPassword({ email: email, password: password });
      if (r.error) {
        btn.disabled = false; btn.textContent = "Log in";
        return show(r.error.message);
      }
      location.replace("dashboard.html");
    });
  }

  if (signup) {
    signup.addEventListener("submit", async function (e) {
      e.preventDefault();
      const name = document.getElementById("name").value.trim();
      const email = document.getElementById("email").value.trim();
      const password = document.getElementById("password").value;
      if (!name) return show("Please enter your name.");
      if (!email) return show("Please enter your email.");
      if (password.length < 6) return show("Password must be at least 6 characters.");

      btn.disabled = true; btn.textContent = "Creating account...";
      // full_name is read by the database trigger that creates the profile row.
      const r = await sb.auth.signUp({ email: email, password: password, options: { data: { full_name: name } } });
      if (r.error) {
        btn.disabled = false; btn.textContent = "Create account";
        return show(r.error.message);
      }
      if (r.data.session) {
        location.replace("dashboard.html");
      } else {
        // Email confirmation is switched on in Supabase: no session until the link is clicked.
        btn.disabled = false; btn.textContent = "Create account";
        signup.reset();
        show("Account created. Check your email for a confirmation link, then log in.", true);
      }
    });
  }
})();
