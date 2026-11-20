/* =========================================
   BLEET — LIVE SUPPORT
   Chat over HTTP + Server-Sent Events, with a ticket form for guests.
   Load order: common.js, api.js, support.js
   Every message is written with textContent, never innerHTML.
   ========================================= */
(() => {
  "use strict";

  const Bleet = window.Bleet;
  const root = document.querySelector("[data-support]");
  if (!root || !Bleet?.api) return;

  const { api, ApiError } = Bleet;
  const MAX_LENGTH = 1000;
  const MAX_RECONNECTS = 5;
  const RECONNECT_BASE_MS = 3000;

  const $ = (id) => document.getElementById(id);
  const pad = (n) => String(n).padStart(2, "0");

  const el = (tag, className, text) => {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined && text !== null) node.textContent = text;
    return node;
  };

  const timeFmt = (value) => {
    const date = new Date(value);
    return Number.isNaN(date.getTime())
      ? ""
      : `${pad(date.getHours())}:${pad(date.getMinutes())}`;
  };

  const newId = () =>
    globalThis.crypto?.randomUUID?.() ??
    `${Date.now()}-${Math.random().toString(16).slice(2)}`;

  const parse = (raw) => {
    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  };

  const ui = {
    status: $("supportStatus"),
    statusText: $("statusText"),
    sub: $("chatSub"),
    notice: $("pageNotice"),
    chatPanel: $("chatPanel"),
    guestPanel: $("guestPanel"),
    log: $("chatLog"),
    form: $("chatForm"),
    input: $("chatInput"),
    send: $("chatSend"),
    count: $("charCount"),
    typing: $("typing"),
    ticket: $("ticketForm"),
  };

  let conversationId = null;
  let stream = null;
  let reconnects = 0;
  let cooldownTimer = null;
  const seen = new Set(); // server message ids already shown
  const pendingRows = new Map(); // clientId -> row waiting for the server

  /* ---------- Notices ---------- */
  function notify(message, type = "error") {
    ui.notice.textContent = message;
    ui.notice.dataset.type = type;
    ui.notice.hidden = !message;
  }

  /* ---------- Live status ---------- */
  function setStatus(online, wait = "a few minutes") {
    ui.status.dataset.state = online ? "online" : "offline";
    ui.statusText.textContent = online
      ? `Agents online · replies in about ${wait}`
      : "Agents are offline · we'll reply by email";
    ui.sub.textContent = online
      ? "Usually replies in a few minutes"
      : "Messages are answered by email";
  }

  /* ---------- Messages ---------- */
  const scrollDown = () =>
    ui.log.scrollTo({ top: ui.log.scrollHeight, behavior: "smooth" });

  function paint(row, { from, text, at }, pending = false) {
    row.className = `msg msg-${from}${pending ? " is-pending" : ""}`;
    row.replaceChildren(
      el("p", "msg-bubble", text),
      el("time", "msg-time", pending ? "Sending…" : timeFmt(at)),
    );
  }

  function showMessage(msg) {
    if (msg.id) {
      if (seen.has(msg.id)) return;
      seen.add(msg.id);
    }

    let row = msg.clientId ? pendingRows.get(msg.clientId) : null;
    if (row) {
      pendingRows.delete(msg.clientId);
    } else {
      row = el("div");
      ui.log.append(row);
    }

    paint(row, msg);
    scrollDown();
  }

  /* ---------- Live stream (Server-Sent Events) ---------- */
  function openStream() {
    if (!conversationId || stream) return;

    stream = new EventSource(
      `/api/support/conversations/${encodeURIComponent(conversationId)}/stream`,
    );

    stream.addEventListener("message", (event) => {
      const msg = parse(event.data);
      if (!msg) return;
      reconnects = 0;
      showMessage(msg);
    });

    stream.addEventListener("typing", (event) => {
      const data = parse(event.data);
      if (data) ui.typing.hidden = !data.active;
    });

    stream.addEventListener("status", (event) => {
      const data = parse(event.data);
      if (data) setStatus(data.online, data.averageWait);
    });

    stream.onerror = () => {
      // The browser retries on its own while connecting. Only handle a closed stream.
      if (stream.readyState !== EventSource.CLOSED) return;
      stream.close();
      stream = null;

      if (reconnects < MAX_RECONNECTS) {
        reconnects += 1;
        setTimeout(openStream, RECONNECT_BASE_MS * reconnects);
      } else {
        notify(
          "Live updates stopped. Refresh the page to continue the chat.",
          "warning",
        );
      }
    };
  }

  /* ---------- Composer ---------- */
  function autoGrow() {
    ui.input.style.height = "auto";
    ui.input.style.height = `${Math.min(ui.input.scrollHeight, 140)}px`;
  }

  function updateComposer() {
    const length = ui.input.value.length;
    ui.count.textContent = `${length}/${MAX_LENGTH}`;
    ui.send.disabled = !ui.input.value.trim() || cooldownTimer !== null;
  }

  function startCooldown(seconds) {
    clearInterval(cooldownTimer);
    let left = seconds;

    const tick = () => {
      if (left <= 0) {
        clearInterval(cooldownTimer);
        cooldownTimer = null;
        notify("");
        updateComposer();
        return;
      }
      notify(`Please wait ${left}s before sending another message.`, "warning");
      left -= 1;
    };

    cooldownTimer = setInterval(tick, 1000);
    tick();
    updateComposer();
  }

  async function sendMessage(text) {
    const clientId = newId();

    const row = el("div");
    ui.log.append(row);
    paint(row, { from: "customer", text, at: new Date() }, true);
    pendingRows.set(clientId, row);
    scrollDown();

    ui.input.value = "";
    autoGrow();
    updateComposer();

    try {
      let saved;

      if (conversationId) {
        saved = await api.post(
          `/support/conversations/${encodeURIComponent(conversationId)}/messages`,
          { clientId, text },
        );
      } else {
        const created = await api.post("/support/conversations", {
          clientId,
          text,
        });
        conversationId = created.id;
        saved = created.message;
        openStream();
      }

      showMessage({ from: "customer", text, clientId, ...saved });
    } catch (err) {
      pendingRows.delete(clientId);
      row.classList.add("is-failed");
      row.querySelector(".msg-time").textContent = "Not sent";

      // Put the text back so the customer can try again
      ui.input.value = text;
      autoGrow();

      if (err instanceof ApiError && err.status === 429) {
        startCooldown(err.retryAfter || 30);
      } else if (err instanceof ApiError && err.status === 401) {
        showGuest();
      } else {
        notify(
          err instanceof ApiError
            ? err.message
            : "Your message wasn't sent. Please try again.",
        );
      }
    } finally {
      updateComposer();
    }
  }

  ui.input.addEventListener("input", () => {
    autoGrow();
    updateComposer();
  });

  ui.input.addEventListener("keydown", (event) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      ui.form.requestSubmit();
    }
  });

  ui.form.addEventListener("submit", (event) => {
    event.preventDefault();
    const text = ui.input.value.trim();
    if (!text || text.length > MAX_LENGTH || cooldownTimer !== null) return;
    sendMessage(text);
  });

  /* ---------- Guest ticket form ---------- */
  ui.ticket.addEventListener("submit", async (event) => {
    event.preventDefault();

    const fields = ui.ticket.elements;
    if (fields.website.value) return; // honeypot: bots only

    [...ui.ticket.querySelectorAll("input, select, textarea")].forEach(
      (input) => input.setCustomValidity(""),
    );
    if (!ui.ticket.reportValidity()) return;

    const button = ui.ticket.querySelector('[type="submit"]');
    button.disabled = true;

    try {
      const ticket = await api.post("/support/tickets", {
        name: fields.name.value.trim(),
        email: fields.email.value.trim(),
        topic: fields.topic.value,
        message: fields.message.value.trim(),
      });

      ui.ticket.reset();
      notify(
        `Thanks! Your reference is ${ticket.reference}. We'll reply by email.`,
        "success",
      );
    } catch (err) {
      if (err instanceof ApiError && Object.keys(err.fields).length) {
        Object.entries(err.fields).forEach(([name, message]) => {
          fields.namedItem(name)?.setCustomValidity(message);
        });
        ui.ticket.reportValidity();
      } else {
        notify(
          err instanceof ApiError
            ? err.message
            : "We couldn't send your message. Please try again.",
        );
      }
    } finally {
      button.disabled = false;
    }
  });

  /* ---------- Topic shortcuts ---------- */
  document.querySelectorAll("[data-topic]").forEach((button) => {
    button.addEventListener("click", () => {
      const topic = button.dataset.topic;

      if (!ui.chatPanel.hidden) {
        ui.input.value = `I need help with ${topic.toLowerCase()}: `;
        autoGrow();
        updateComposer();
        ui.input.focus();
      } else {
        ui.ticket.elements.topic.value = topic;
        ui.ticket.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    });
  });

  /* ---------- Session and conversation ---------- */
  function showGuest() {
    ui.chatPanel.hidden = true;
    ui.guestPanel.hidden = false;
  }

  async function loadSession() {
    try {
      await api.get("/auth/me");
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) return showGuest();
      notify(err.message ?? "Couldn't check your session.");
      return showGuest();
    }

    ui.guestPanel.hidden = true;
    ui.chatPanel.hidden = false;
    updateComposer();

    try {
      const current = await api.get("/support/conversations/current");

      if (current) {
        conversationId = current.id;
        (current.messages ?? []).forEach(showMessage);
        openStream();
      } else {
        showMessage({
          from: "system",
          text: "Hi! Tell us what you need and our team will reply here.",
          at: new Date(),
        });
      }
    } catch (err) {
      notify(
        err instanceof ApiError
          ? err.message
          : "Couldn't load your conversation.",
      );
    }
  }

  async function loadStatus() {
    try {
      const status = await api.get("/support/status");
      setStatus(Boolean(status.online), status.averageWait);
    } catch {
      setStatus(false);
      ui.statusText.textContent =
        "Availability unknown · you can still send a message";
    }
  }

  window.addEventListener("pagehide", () => stream?.close());

  loadStatus();
  loadSession();
})();
