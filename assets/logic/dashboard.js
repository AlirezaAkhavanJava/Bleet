/* =========================================
   BLEET — DASHBOARDS
   Account and agency panels. Load order: common.js, api.js, dashboard.js
   Every value is written with textContent. No innerHTML with server data.
   ========================================= */
(() => {
  "use strict";

  const Bleet = window.Bleet;
  const root = document.querySelector("[data-dashboard]");
  if (!root || !Bleet?.api) return;

  const { api, ApiError } = Bleet;
  const kind = root.dataset.dashboard; // "account" | "agency"
  const page = root.dataset.page || `${kind}.html`;
  const toast = (message) => Bleet.toast(message);

  /* ---------- Helpers ---------- */
  const $ = (id) => document.getElementById(id);
  const pad = (n) => String(n).padStart(2, "0");
  const cap = (text = "") => text.charAt(0).toUpperCase() + text.slice(1);
  const todayISO = () => {
    const d = new Date();
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  };

  const el = (tag, className, text) => {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined && text !== null) node.textContent = text;
    return node;
  };

  const dateFmt = (value) => {
    const d = new Date(value);
    return Number.isNaN(d.getTime())
      ? "—"
      : d.toLocaleDateString(undefined, {
          day: "numeric",
          month: "short",
          year: "numeric",
        });
  };

  const money = (cents, currency = "USD") => {
    try {
      return new Intl.NumberFormat(undefined, {
        style: "currency",
        currency,
      }).format((cents ?? 0) / 100);
    } catch {
      return `${((cents ?? 0) / 100).toFixed(2)} ${currency}`;
    }
  };

  const TONES = {
    confirmed: "good",
    paid: "good",
    active: "good",
    pending: "warn",
    processing: "warn",
    cancelled: "bad",
    failed: "bad",
    overdue: "bad",
  };
  const badge = (text, tone = "neutral") =>
    el("span", `badge badge-${tone}`, text);
  const statusBadge = (status = "") =>
    badge(cap(status), TONES[status] ?? "neutral");
  const stateBox = (text, tone) =>
    el("p", tone ? `state state-${tone}` : "state", text);

  const statCard = (label, value) => {
    const card = el("article", "dash-stat");
    card.append(el("strong", "", String(value)), el("span", "", label));
    return card;
  };

  const fillForm = (form, values) => {
    if (!form) return;
    Object.entries(values).forEach(([name, value]) => {
      const field = form.elements.namedItem(name);
      if (field) field.value = value ?? "";
    });
  };

  /* Builds a table. Cells can be text or DOM nodes (buttons, badges). */
  function table(headers, rows, emptyText) {
    if (!rows.length) return stateBox(emptyText);

    const thead = el("thead");
    const headRow = el("tr");
    headers.forEach((header) => {
      const th = el("th", "", header);
      th.scope = "col";
      headRow.append(th);
    });
    thead.append(headRow);

    const tbody = el("tbody");
    rows.forEach((cells) => {
      const row = el("tr");
      cells.forEach((cell) => {
        const td = el("td");
        if (cell instanceof Node) td.append(cell);
        else td.textContent = cell ?? "—";
        row.append(td);
      });
      tbody.append(row);
    });

    const data = el("table", "data-table");
    data.append(thead, tbody);
    const wrap = el("div", "table-wrap");
    wrap.append(data);
    return wrap;
  }

  /* Two-step button: first click asks to confirm, second click runs the action */
  function twoStep(label, className, action) {
    const button = el("button", className, label);
    button.type = "button";
    let armed = false;
    let timer;

    const reset = () => {
      armed = false;
      clearTimeout(timer);
      button.disabled = false;
      button.textContent = label;
      button.classList.remove("is-armed");
    };

    button.addEventListener("click", async () => {
      if (!armed) {
        armed = true;
        button.textContent = "Confirm?";
        button.classList.add("is-armed");
        timer = setTimeout(reset, 4000);
        return;
      }
      button.disabled = true;
      try {
        await action();
      } catch (err) {
        handleError(err);
      } finally {
        reset();
      }
    });

    return button;
  }

  /* ---------- Errors and navigation ---------- */
  function redirectToLogin() {
    location.replace(`login.html?next=${encodeURIComponent(page)}`);
  }

  function handleError(err) {
    if (err instanceof ApiError && err.status === 401) return redirectToLogin();
    toast(
      err instanceof ApiError
        ? err.message
        : "Something went wrong. Please try again.",
    );
  }

  /* Forms: clears old errors, checks validity, shows server field errors on the inputs */
  function bindForm(form, { prepare, submit, onSuccess }) {
    form.addEventListener("submit", async (event) => {
      event.preventDefault();

      [...form.elements].forEach((input) => input.setCustomValidity?.(""));
      prepare?.();
      if (!form.reportValidity()) return;

      const button = form.querySelector('[type="submit"]');
      const label = button.textContent;
      button.disabled = true;
      button.textContent = "Saving…";

      try {
        const result = await submit(new FormData(form));
        await onSuccess?.(result);
      } catch (err) {
        const fields = err instanceof ApiError ? err.fields : {};
        if (Object.keys(fields).length) {
          Object.entries(fields).forEach(([name, message]) => {
            form.elements.namedItem(name)?.setCustomValidity(message);
          });
          form.reportValidity();
        } else {
          handleError(err);
        }
      } finally {
        button.disabled = false;
        button.textContent = label;
      }
    });
  }

  /* ---------- Tabs (keyboard accessible, panels load once) ---------- */
  const loaded = new Set();

  function activate(name) {
    if (loaded.has(name)) return;
    loaded.add(name);
    const loader = LOADERS[name];
    if (!loader) return;
    loader().catch((err) => {
      loaded.delete(name); // allow a retry when the user clicks again
      handleError(err);
    });
  }

  function initTabs() {
    const tabs = [...root.querySelectorAll('[role="tab"]')];

    const show = (tab) => {
      tabs.forEach((item) => {
        const on = item === tab;
        item.setAttribute("aria-selected", String(on));
        item.tabIndex = on ? 0 : -1;
        document.getElementById(item.getAttribute("aria-controls")).hidden =
          !on;
      });
      activate(tab.dataset.panel);
    };

    tabs.forEach((tab, index) => {
      tab.addEventListener("click", () => show(tab));
      tab.addEventListener("keydown", (event) => {
        const step = {
          ArrowRight: 1,
          ArrowDown: 1,
          ArrowLeft: -1,
          ArrowUp: -1,
        }[event.key];
        if (!step) return;
        event.preventDefault();
        const next = tabs[(index + step + tabs.length) % tabs.length];
        next.focus();
        show(next);
      });
    });

    const start =
      tabs.find((tab) => tab.dataset.panel === location.hash.slice(1)) ??
      tabs[0];
    show(start);
  }

  /* ---------- Account: data loaders ---------- */
  async function loadOverview() {
    const data = await api.get("/account/summary");

    $("overviewStats").replaceChildren(
      statCard("Upcoming trips", data.upcomingCount ?? 0),
      statCard("Saved travellers", data.travellerCount ?? 0),
      statCard("Open requests", data.openRequests ?? 0),
    );

    $("nextTrip").replaceChildren(
      data.nextTrip
        ? tripSummary(data.nextTrip)
        : stateBox("No upcoming trips yet. Plan your next journey."),
    );

    const items = (data.activity ?? []).map((item) => {
      const li = el("li");
      li.append(
        el("span", "", item.text),
        el("time", "muted", dateFmt(item.at)),
      );
      return li;
    });
    $("activity").replaceChildren(
      ...(items.length ? items : [el("li", "muted", "No recent activity.")]),
    );
  }

  function tripSummary(trip) {
    const wrap = el("div", "trip-summary");
    wrap.append(
      el("h3", "", trip.route),
      el("p", "muted", `${dateFmt(trip.date)} · Ref ${trip.reference}`),
    );
    return wrap;
  }

  async function loadTrips() {
    const status = $("tripFilter").value;
    const trips = await api.get(
      `/account/trips?status=${encodeURIComponent(status)}`,
    );

    $("tripsList").replaceChildren(
      table(
        ["Trip", "Date", "Reference", "Status", ""],
        trips.map((trip) => [
          trip.route,
          dateFmt(trip.date),
          trip.reference,
          statusBadge(trip.status),
          trip.cancellable
            ? twoStep("Cancel", "btn btn-ghost btn-sm", () =>
                cancelTrip(trip.reference),
              )
            : "",
        ]),
        "No trips in this list.",
      ),
    );
  }

  async function cancelTrip(reference) {
    await api.post(`/account/trips/${encodeURIComponent(reference)}/cancel`);
    toast("Trip cancelled.");
    await loadTrips();
  }

  async function loadTravellers() {
    const list = await api.get("/account/travellers");

    $("travellersList").replaceChildren(
      table(
        ["Name", "Type", "Date of birth", "Document", ""],
        list.map((person) => [
          `${person.firstName} ${person.lastName}`,
          cap(person.type),
          dateFmt(person.dateOfBirth),
          person.documentMasked || "—",
          twoStep("Remove", "btn btn-ghost btn-sm", () =>
            removeTraveller(person.id),
          ),
        ]),
        "No saved travellers yet.",
      ),
    );
  }

  async function removeTraveller(id) {
    await api.del(`/account/travellers/${encodeURIComponent(id)}`);
    toast("Traveller removed.");
    await loadTravellers();
  }

  async function loadProfile() {
    const profile = await api.get("/account/profile");
    fillForm($("profileForm"), profile);
    $("profileEmail").value = profile.email ?? "";
  }

  async function loadSessions() {
    const sessions = await api.get("/account/sessions");

    const rows = sessions.map((session) => {
      const row = el("div", "session");
      const info = el("div");
      info.append(
        el("strong", "", session.device || "Unknown device"),
        el(
          "span",
          "",
          `${session.location || "Unknown location"} · active ${dateFmt(session.lastActive)}`,
        ),
      );
      row.append(info);
      row.append(
        session.current
          ? badge("This device", "good")
          : twoStep("Sign out", "btn btn-ghost btn-sm", () =>
              revokeSession(session.id),
            ),
      );
      return row;
    });

    $("sessionsList").replaceChildren(
      ...(rows.length ? rows : [stateBox("No active sessions found.")]),
    );
  }

  async function revokeSession(id) {
    await api.del(`/account/sessions/${encodeURIComponent(id)}`);
    toast("Device signed out.");
    await loadSessions();
  }

  async function loadNotifications() {
    const prefs = await api.get("/account/notifications");
    document
      .querySelectorAll('#notifyForm input[type="checkbox"][name]')
      .forEach((box) => {
        box.checked = Boolean(prefs[box.name]);
      });
  }

  /* ---------- Agency: data loaders ---------- */
  async function loadAgencyOverview() {
    const s = await api.get("/agency/summary");

    $("overviewStats").replaceChildren(
      statCard("Bookings this month", s.bookingsThisMonth ?? 0),
      statCard(
        "Commission this month",
        money(s.commissionThisMonthCents, s.currency),
      ),
      statCard("Pending payout", money(s.pendingPayoutCents, s.currency)),
      statCard("Active clients", s.activeClients ?? 0),
    );
  }

  async function loadAgencyBookings() {
    const status = $("agencyBookingFilter").value;
    const rows = await api.get(
      `/agency/bookings?status=${encodeURIComponent(status)}`,
    );

    $("bookingsList").replaceChildren(
      table(
        ["Reference", "Client", "Route", "Date", "Amount", "Status"],
        rows.map((b) => [
          b.reference,
          b.client,
          b.route,
          dateFmt(b.date),
          money(b.amountCents, b.currency),
          statusBadge(b.status),
        ]),
        "No bookings for this filter.",
      ),
    );
  }

  async function loadClients() {
    const clients = await api.get("/agency/clients");

    $("clientsList").replaceChildren(
      table(
        ["Client", "Email", "Bookings", "Last booking"],
        clients.map((c) => [
          c.name,
          c.email,
          String(c.bookings ?? 0),
          dateFmt(c.lastBooking),
        ]),
        "No clients yet. Clients appear after their first booking.",
      ),
    );
  }

  async function loadPayouts() {
    const payouts = await api.get("/agency/payouts");

    $("payoutsList").replaceChildren(
      table(
        ["Period", "Amount", "Status", "Paid on"],
        payouts.map((p) => [
          p.period,
          money(p.amountCents, p.currency),
          statusBadge(p.status),
          dateFmt(p.paidAt),
        ]),
        "No payouts yet.",
      ),
    );
  }

  async function loadTeam() {
    const members = await api.get("/agency/team");

    $("teamList").replaceChildren(
      table(
        ["Name", "Email", "Role", ""],
        members.map((m) => [
          m.name,
          m.email,
          cap(m.role),
          twoStep("Remove", "btn btn-ghost btn-sm", () => removeMember(m.id)),
        ]),
        "Only you are on this team.",
      ),
    );
  }

  async function removeMember(id) {
    await api.del(`/agency/team/${encodeURIComponent(id)}`);
    toast("Member removed.");
    await loadTeam();
  }

  async function loadCompany() {
    const company = await api.get("/agency/company");
    fillForm($("companyForm"), company);
    $("commissionRate").textContent =
      company.commissionRate != null ? `${company.commissionRate}%` : "—";
  }

  /* ---------- Panel registry (one name can mean different things per dashboard) ---------- */
  const LOADERS = {
    overview: kind === "agency" ? loadAgencyOverview : loadOverview,
    // account
    trips: loadTrips,
    travellers: loadTravellers,
    profile: loadProfile,
    security: loadSessions,
    notifications: loadNotifications,
    // agency
    bookings: loadAgencyBookings,
    clients: loadClients,
    payouts: loadPayouts,
    team: loadTeam,
    company: loadCompany,
  };

  /* ---------- Forms and buttons ---------- */
  function initForms() {
    $("logoutBtn")?.addEventListener("click", async () => {
      try {
        await api.post("/auth/logout");
      } catch {
        // Leave the page even if the server call fails
      }
      location.replace("login.html");
    });

    document.querySelectorAll('[name="dateOfBirth"]').forEach((input) => {
      input.max = todayISO();
    });

    $("tripFilter")?.addEventListener("change", () =>
      loadTrips().catch(handleError),
    );
    $("agencyBookingFilter")?.addEventListener("change", () =>
      loadAgencyBookings().catch(handleError),
    );

    // Password change
    const passwordForm = $("passwordForm");
    if (passwordForm) {
      const newPw = passwordForm.elements.namedItem("newPassword");
      const confirm = passwordForm.elements.namedItem("confirmPassword");
      const matchCheck = () => {
        confirm.setCustomValidity(
          confirm.value && confirm.value !== newPw.value
            ? "Passwords don't match."
            : "",
        );
      };
      newPw.addEventListener("input", matchCheck);
      confirm.addEventListener("input", matchCheck);

      bindForm(passwordForm, {
        prepare: matchCheck,
        submit: (data) =>
          api.post("/account/password", {
            currentPassword: data.get("currentPassword"),
            newPassword: data.get("newPassword"),
          }),
        onSuccess: async () => {
          passwordForm.reset();
          toast("Password updated. Other devices were signed out.");
          await loadSessions();
        },
      });
    }

    // Profile
    const profileForm = $("profileForm");
    if (profileForm) {
      bindForm(profileForm, {
        submit: (data) =>
          api.patch("/account/profile", Object.fromEntries(data)),
        onSuccess: () => toast("Profile saved."),
      });
    }

    // Add traveller (the document number is cleared from the form after saving)
    const travellerForm = $("travellerForm");
    if (travellerForm) {
      bindForm(travellerForm, {
        submit: (data) =>
          api.post("/account/travellers", Object.fromEntries(data)),
        onSuccess: async () => {
          travellerForm.reset();
          toast("Traveller saved.");
          await loadTravellers();
        },
      });
    }

    // Notifications: save each change right away, undo it if the save fails
    $("notifyForm")?.addEventListener("change", async (event) => {
      const box = event.target;
      if (!(box instanceof HTMLInputElement) || box.type !== "checkbox") return;

      const prefs = Object.fromEntries(
        [
          ...$("notifyForm").querySelectorAll('input[type="checkbox"][name]'),
        ].map((c) => [c.name, c.checked]),
      );

      try {
        await api.patch("/account/notifications", prefs);
        toast("Preferences saved.");
      } catch (err) {
        box.checked = !box.checked;
        handleError(err);
      }
    });

    // Sign out other devices
    $("revokeOthers")?.addEventListener("click", async () => {
      try {
        await api.post("/account/sessions/revoke-others");
        toast("Other devices signed out.");
        await loadSessions();
      } catch (err) {
        handleError(err);
      }
    });

    // Delete account: button stays disabled until the user types DELETE
    const deleteInput = $("deleteConfirm");
    const deleteBtn = $("deleteAccount");
    if (deleteInput && deleteBtn) {
      deleteInput.addEventListener("input", () => {
        deleteBtn.disabled = deleteInput.value !== "DELETE";
      });
      deleteBtn.addEventListener("click", async () => {
        try {
          await api.post("/account/delete", { confirm: "DELETE" });
          location.replace("index.html");
        } catch (err) {
          handleError(err);
        }
      });
    }

    // Agency: invite a team member
    const inviteForm = $("inviteForm");
    if (inviteForm) {
      bindForm(inviteForm, {
        submit: (data) => api.post("/agency/team", Object.fromEntries(data)),
        onSuccess: async () => {
          inviteForm.reset();
          toast("Invitation sent.");
          await loadTeam();
        },
      });
    }

    // Agency: company details
    const companyForm = $("companyForm");
    if (companyForm) {
      bindForm(companyForm, {
        submit: (data) =>
          api.patch("/agency/company", Object.fromEntries(data)),
        onSuccess: () => toast("Company details saved."),
      });
    }
  }

  /* ---------- Boot: check the session first, then build the page ---------- */
  async function boot() {
    let me;
    try {
      me = await api.get("/auth/me");
    } catch (err) {
      if (err instanceof ApiError && err.status === 401)
        return redirectToLogin();
      $("accountMeta").textContent = err.message;
      return;
    }

    $("greeting").textContent = `Hi, ${me.name}`;
    $("accountMeta").textContent = me.email;

    // The UI check is for presentation only. The server enforces the agency role on every request.
    if (kind === "agency" && !(me.roles ?? []).includes("AGENCY")) {
      $("dashContent").hidden = true;
      $("agencyDenied").hidden = false;
      return;
    }

    initForms();
    initTabs();
  }

  boot();
})();
