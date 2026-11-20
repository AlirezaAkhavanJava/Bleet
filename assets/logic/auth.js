/* =========================================
   BLEET — LOGIN & SIGNUP
   One script for both pages. Set data-auth="login" or "signup" on the form.
   Load order: common.js, api.js, auth.js
   ========================================= */
(() => {
  "use strict";

  const { api, ApiError, safeNext } = window.Bleet ?? {};
  const form = document.querySelector("[data-auth]");
  if (!form || !api) return;

  const mode = form.dataset.auth;
  const MIN_PASSWORD = 12;
  const MAX_PASSWORD = 128;
  const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
  const PHONE = /^\+?[0-9 ()-]{7,20}$/;
  const params = new URLSearchParams(location.search);

  const alertBox = document.getElementById("authAlert");
  const submitBtn = form.querySelector('button[type="submit"]');
  const submitLabel = submitBtn.textContent;
  const pwInput = form.elements.namedItem("password");
  const caps = form.querySelector("[data-caps]");
  const meter = form.querySelector("[data-meter]");
  const meterLabel = form.querySelector("[data-meter-label]");

  let cooling = false;
  let cooldownTimer = null;

  /* ---------- Messages ---------- */
  function showAlert(message, type = "error") {
    alertBox.textContent = message;
    alertBox.dataset.type = type;
    alertBox.hidden = !message;
  }

  function setError(input, message) {
    const field = input.closest(".auth-field");
    if (!field) return;
    field.classList.toggle("is-invalid", Boolean(message));
    input.setAttribute("aria-invalid", String(Boolean(message)));
    field.querySelector(".auth-error").textContent = message;
  }

  /* ---------- Validation ---------- */
  function fieldError(input) {
    const value = input.value;

    if (input.type === "checkbox") {
      return input.required && !input.checked
        ? "Please accept to continue."
        : "";
    }
    if (input.required && !value.trim()) return "This field is required.";
    if (input.type === "email" && value && !EMAIL.test(value.trim()))
      return "Enter a valid email address.";
    if (input.name === "phone" && value && !PHONE.test(value.trim()))
      return "Enter a valid phone number.";

    if (input.name === "password" && mode === "signup") {
      if (value.length < MIN_PASSWORD)
        return `Use at least ${MIN_PASSWORD} characters.`;
      if (value.length > MAX_PASSWORD)
        return `Use no more than ${MAX_PASSWORD} characters.`;
    }

    if (input.name === "confirm" && value !== pwInput.value)
      return "Passwords don't match.";

    return "";
  }

  function validateAll() {
    let firstInvalid = null;

    form.querySelectorAll("input[name]").forEach((input) => {
      if (input.name === "website") return; // honeypot
      const message = fieldError(input);
      setError(input, message);
      if (message && !firstInvalid) firstInvalid = input;
    });

    return firstInvalid;
  }

  // Clear an error as soon as the user fixes that field
  form.querySelectorAll("input[name]").forEach((input) => {
    const refresh = () => {
      if (input.closest(".auth-field")?.classList.contains("is-invalid")) {
        setError(input, fieldError(input));
      }
    };
    input.addEventListener("input", refresh);
    input.addEventListener("change", refresh);
  });

  /* ---------- Password strength (signup) ---------- */
  const LEVELS = ["Too weak", "Weak", "Fair", "Good", "Strong"];

  function strengthOf(pw) {
    let score = 0;
    if (pw.length >= MIN_PASSWORD) score += 1;
    if (pw.length >= 16) score += 1;
    if (/[a-z]/.test(pw) && /[A-Z]/.test(pw)) score += 1;
    if (/\d/.test(pw) && /[^A-Za-z0-9]/.test(pw)) score += 1;
    if (/(.)\1{2,}/.test(pw) || /password|qwerty|1234/i.test(pw)) score -= 2;
    return Math.max(0, Math.min(4, score));
  }

  if (meter && pwInput) {
    pwInput.addEventListener("input", () => {
      const level = pwInput.value ? strengthOf(pwInput.value) : 0;
      meter.dataset.level = String(level);
      meterLabel.textContent = pwInput.value
        ? `Strength: ${LEVELS[level]}`
        : "";
    });
  }

  /* ---------- Show / hide password ---------- */
  form.querySelectorAll("[data-toggle-password]").forEach((button) => {
    button.addEventListener("click", () => {
      const input = button.closest(".auth-control").querySelector("input");
      const show = input.type === "password";
      input.type = show ? "text" : "password";
      button.setAttribute("aria-pressed", String(show));
      button.setAttribute(
        "aria-label",
        show ? "Hide password" : "Show password",
      );
      button.querySelector("i").className = show
        ? "fa-solid fa-eye-slash"
        : "fa-solid fa-eye";
    });
  });

  /* ---------- Caps Lock warning ---------- */
  if (pwInput && caps) {
    pwInput.addEventListener("keyup", (event) => {
      caps.hidden = !event.getModifierState("CapsLock");
    });
    pwInput.addEventListener("blur", () => {
      caps.hidden = true;
    });
  }

  /* ---------- Busy state and rate-limit cooldown ---------- */
  function setBusy(busy) {
    submitBtn.disabled = busy || cooling;
    submitBtn.textContent = busy ? "Please wait…" : submitLabel;
    submitBtn.setAttribute("aria-busy", String(busy));
  }

  function startCooldown(seconds) {
    clearInterval(cooldownTimer);
    cooling = true;
    let left = seconds;

    const tick = () => {
      if (left <= 0) {
        clearInterval(cooldownTimer);
        cooling = false;
        submitBtn.disabled = false;
        submitBtn.textContent = submitLabel;
        showAlert("");
        return;
      }
      submitBtn.disabled = true;
      showAlert(`Too many attempts. Try again in ${left}s.`, "warning");
      left -= 1;
    };

    tick();
    cooldownTimer = setInterval(tick, 1000);
  }

  /* ---------- Errors from the server ---------- */
  function handleError(err) {
    if (!(err instanceof ApiError)) {
      showAlert("Network problem. Check your connection and try again.");
      return;
    }

    Object.entries(err.fields).forEach(([name, message]) => {
      const input = form.elements.namedItem(name);
      if (input) setError(input, message);
    });

    if (err.status === 429) {
      startCooldown(err.retryAfter || 60);
      return;
    }

    showAlert(err.message);
  }

  /* ---------- Requests ---------- */
  async function handleLogin() {
    await api.post("/auth/login", {
      email: form.elements.namedItem("email").value.trim(),
      password: pwInput.value,
      remember: form.elements.namedItem("remember").checked,
    });
    // The session cookie was set by the server. Nothing is stored here.
    location.replace(safeNext(params.get("next")));
  }

  async function handleSignup() {
    const text = (name) => form.elements.namedItem(name).value.trim();

    await api.post("/auth/register", {
      name: text("name"),
      email: text("email"),
      phone: text("phone"),
      password: pwInput.value,
      marketingOptIn: form.elements.namedItem("marketing").checked,
      termsAccepted: form.elements.namedItem("terms").checked,
    });

    form.reset();
    if (meter) {
      meter.dataset.level = "0";
      meterLabel.textContent = "";
    }
    showAlert(
      "Account created. Check your email to confirm your address before you log in.",
      "success",
    );
  }

  form.addEventListener("submit", async (event) => {
    event.preventDefault();

    // Honeypot: real people never see or fill this field
    if (form.elements.namedItem("website")?.value) return;

    showAlert("");
    const firstInvalid = validateAll();
    if (firstInvalid) {
      firstInvalid.focus();
      return;
    }

    setBusy(true);
    try {
      if (mode === "login") await handleLogin();
      else await handleSignup();
    } catch (err) {
      handleError(err);
    } finally {
      if (!cooling) setBusy(false);
    }
  });

  /* ---------- Startup ---------- */
  // Login: a signed-in user goes straight to their account.
  // Both: this request also makes the server issue the CSRF cookie the form needs.
  if (mode === "login") {
    api
      .get("/auth/me")
      .then(() => location.replace(safeNext(params.get("next"))))
      .catch(() => {});
  } else {
    api.get("/auth/me").catch(() => {});
  }
})();
