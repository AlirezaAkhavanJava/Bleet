/* =========================================
   BLEET — SERVICE SEARCH
   One script for trains, buses, hotels, tours and visa.
   Each page sets data-service-form="<name>" on its form.
   ========================================= */
(() => {
  "use strict";

  const form = document.querySelector("[data-service-form]");
  if (!form) return;

  /* ---------- Helpers ---------- */
  const $ = (id) => document.getElementById(id);
  const pad = (n) => String(n).padStart(2, "0");
  const toISO = (d) =>
    `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const todayISO = toISO(new Date());
  const addDays = (iso, days) => {
    const d = new Date(`${iso}T00:00:00`);
    d.setDate(d.getDate() + days);
    return toISO(d);
  };
  const nightsBetween = (a, b) =>
    Math.round((new Date(`${b}T00:00:00`) - new Date(`${a}T00:00:00`)) / 864e5);
  const prettyDate = (iso) => {
    const d = new Date(`${iso}T00:00:00`);
    return Number.isNaN(d.getTime())
      ? ""
      : d.toLocaleDateString(undefined, {
          day: "numeric",
          month: "short",
          year: "numeric",
        });
  };
  const clock = (m) => `${pad(Math.floor(m / 60) % 24)}:${pad(m % 60)}`;
  const duration = (m) => `${Math.floor(m / 60)}h ${pad(m % 60)}m`;
  const money = (n) => `$${Math.round(n)}`;
  const n = (x) => Number(x) || 0;
  const between = (rand, min, max) => min + rand() * (max - min);
  const pick = (rand, list) => list[Math.floor(rand() * list.length)];

  const el = (tag, className, text) => {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  };

  /* Deterministic sample data: the same search always gives the same results */
  const seeded = (text) => {
    let seed = [...text].reduce(
      (hash, c) => (Math.imul(hash, 31) + c.charCodeAt(0)) >>> 0,
      7,
    );
    return () => {
      seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
      return seed / 4294967296;
    };
  };

  /* ---------- Per-service configuration ---------- */
  const ROUTE_TITLE = (v) => `${v.from} → ${v.to}`;
  const ROUTE_CROSS = (v) =>
    v.from.trim().toLowerCase() === v.to.trim().toLowerCase()
      ? { name: "to", message: "Destination must differ from departure." }
      : null;

  const CONFIG = {
    trains: {
      title: ROUTE_TITLE,
      subtitle: (v) =>
        `${prettyDate(v.date)}${v.trip === "return" ? ` · return ${prettyDate(v.return)}` : " · one way"}`,
      cross: ROUTE_CROSS,
      results(v, rand) {
        const factor = { standard: 1, business: 1.8, first: 2.6 }[v.class] ?? 1;
        const label =
          { standard: "Standard", business: "Business", first: "First class" }[
            v.class
          ] ?? "Standard";
        const weight = n(v.adults) + n(v.children) + n(v.infants) * 0.1;

        return [
          "Express Rail",
          "Coastal Line",
          "Metro Rapid",
          "Northern Star",
          "Silver Arrow",
        ].map((operator) => {
          const departure = 6 * 60 + Math.floor(rand() * 15 * 60);
          const minutes = 90 + Math.floor(rand() * 300);
          const stops = rand() > 0.6 ? "1 change" : "Direct";
          return {
            title: operator,
            subtitle: `${clock(departure)} → ${clock(departure + minutes)} · ${v.from} → ${v.to}`,
            tags: [label, stops, duration(minutes)],
            price: money(between(rand, 25, 140) * factor * weight),
            priceNote: "Total for travellers",
            cta: "Select",
          };
        });
      },
    },

    buses: {
      title: ROUTE_TITLE,
      subtitle: (v) =>
        `${prettyDate(v.date)}${v.trip === "return" ? ` · return ${prettyDate(v.return)}` : " · one way"}`,
      cross: ROUTE_CROSS,
      results(v, rand) {
        const seat = {
          standard: ["Standard seat", 1],
          premium: ["Premium seat", 1.5],
          sleeper: ["Sleeper berth", 2.2],
        }[v.seat] ?? ["Standard seat", 1];
        const weight = n(v.adults) + n(v.children) * 0.7;

        return ["Blue Coach", "Sunline", "Night Rider", "City Express"].map(
          (operator) => {
            const departure = 7 * 60 + Math.floor(rand() * 16 * 60);
            const minutes = 180 + Math.floor(rand() * 480);
            return {
              title: operator,
              subtitle: `${clock(departure)} → ${clock(departure + minutes)} · ${v.from} → ${v.to}`,
              tags: [
                seat[0],
                rand() > 0.5 ? "Wi-Fi" : "No Wi-Fi",
                duration(minutes),
              ],
              price: money(between(rand, 12, 60) * seat[1] * weight),
              priceNote: "Total for travellers",
              cta: "Select",
            };
          },
        );
      },
    },

    hotels: {
      title: (v) =>
        `${v.type[0].toUpperCase()}${v.type.slice(1)}s in ${v.destination}`,
      subtitle: (v) =>
        `${prettyDate(v.checkin)} → ${prettyDate(v.checkout)} · ${n(v.adults)} adult${n(v.adults) > 1 ? "s" : ""}, ${v.rooms} room${n(v.rooms) > 1 ? "s" : ""}`,
      results(v, rand) {
        const nights = Math.max(1, nightsBetween(v.checkin, v.checkout));
        const minStars = n(v.stars);
        const names = [
          "Grand",
          "Riverside",
          "Old Town",
          "Harbor",
          "Garden",
          "Summit",
        ];
        const kinds = ["Hotel", "Suites", "Inn", "Residence"];

        return Array.from({ length: 6 }, () => {
          const stars = 2 + Math.floor(rand() * 4);
          const rating = (7 + rand() * 2.5).toFixed(1);
          const perNight = between(rand, 60, 340) * (stars / 3.5) * n(v.rooms);
          return {
            title: `${pick(rand, names)} ${pick(rand, kinds)}`,
            stars,
            rating,
            perNight,
            freeCancel: rand() > 0.5,
            breakfast: rand() > 0.5,
          };
        })
          .filter((hotel) => hotel.stars >= minStars)
          .map((hotel) => ({
            title: hotel.title,
            subtitle: `${v.destination} · ${"★".repeat(hotel.stars)} · rating ${hotel.rating}`,
            tags: [
              hotel.freeCancel ? "Free cancellation" : "Non-refundable",
              hotel.breakfast ? "Breakfast included" : "Room only",
              `${nights} night${nights > 1 ? "s" : ""}`,
            ],
            price: money(hotel.perNight * nights),
            priceNote: `Total · ${v.rooms} room${n(v.rooms) > 1 ? "s" : ""}`,
            cta: "Book room",
          }));
      },
    },

    tours: {
      title: (v) => `Tours in ${v.destination}`,
      subtitle: (v) =>
        `${prettyDate(v.date)} · ${n(v.adults)} adult${n(v.adults) > 1 ? "s" : ""}${n(v.children) ? `, ${v.children} child${n(v.children) > 1 ? "ren" : ""}` : ""}`,
      results(v, rand) {
        const TOURS = {
          city: [
            "Highlights walk",
            "Hop-on hop-off city tour",
            "Hidden streets tour",
          ],
          adventure: ["Mountain trek", "Kayak and cliffs", "Zipline day"],
          culture: [
            "Museum and history tour",
            "Old quarter guide",
            "Architecture walk",
          ],
          food: [
            "Street food tasting",
            "Cooking class and market",
            "Wine and cheese evening",
          ],
          daytrip: [
            "Countryside day trip",
            "Coastal villages",
            "Lake excursion",
          ],
        };
        const STYLE = {
          city: "City",
          adventure: "Adventure",
          culture: "Culture",
          food: "Food",
          daytrip: "Day trip",
        };
        const DURATION = {
          half: ["Half day", 0.5],
          full: ["Full day", 1],
          multi: ["2–3 days", 2.5],
          long: ["4+ days", 5],
        };

        const [durLabel, durFactor] = DURATION[v.duration] ?? DURATION.full;
        const people = n(v.adults) + n(v.children) * 0.6;
        const list = TOURS[v.style] ?? TOURS.city;

        return list.map((name) => ({
          title: name,
          subtitle: `${v.destination} · ${durLabel}`,
          tags: [
            STYLE[v.style] ?? "City",
            durLabel,
            rand() > 0.5 ? "Guide included" : "Small group",
          ],
          price: money(between(rand, 30, 160) * durFactor * people),
          priceNote: "Total for travellers",
          cta: "Book tour",
        }));
      },
    },

    visa: {
      title: (v) =>
        `${v.type[0].toUpperCase()}${v.type.slice(1)} visa to ${v.to}`,
      subtitle: (v) =>
        `For ${v.from} citizens · travelling ${prettyDate(v.date)}`,
      cross: (v) =>
        v.from === v.to
          ? {
              name: "to",
              message: "Choose a destination other than your own country.",
            }
          : null,
      results(v, rand) {
        const SPEEDS = {
          standard: ["Standard", "10–15 working days", 45],
          fast: ["Fast track", "3–5 working days", 95],
          express: ["Express", "1–2 working days", 190],
        };
        const documents = 3 + Math.floor(rand() * 3);
        const typeFactor = v.type === "business" ? 1.2 : 1;

        return Object.entries(SPEEDS).map(([key, [label, time, fee]]) => ({
          title: `${label} processing`,
          subtitle: `${time} · ${v.type} visa`,
          tags: [
            `${documents} documents`,
            rand() > 0.5 ? "eVisa available" : "Embassy submission",
            key === v.speed ? "Your choice" : "Alternative",
          ],
          price: money(fee * typeFactor),
          priceNote: "Government fee + service",
          cta: key === v.speed ? "Start application" : "Compare",
        }));
      },
    },
  };

  const config = CONFIG[form.dataset.serviceForm];
  if (!config) return;

  /* ---------- Dates ---------- */
  function initDates() {
    form.querySelectorAll('input[type="date"]').forEach((input) => {
      input.min = todayISO;
      if (!input.value && input.dataset.offset) {
        input.value = addDays(todayISO, Number(input.dataset.offset));
      }
    });

    // Return / check-out dates can't be before the start date
    form.querySelectorAll('input[type="date"][data-after]').forEach((input) => {
      const source =
        form.elements[input.dataset.after] ?? $(input.dataset.after);
      const gap = Number(input.dataset.gap) || 0;

      const sync = () => {
        if (!source.value) return;
        input.min = addDays(source.value, gap);
        if (!input.value || input.value < input.min) input.value = input.min;
      };

      source.addEventListener("change", sync);
      sync();
    });
  }

  /* ---------- Travellers / guests picker ---------- */
  function initPicker(root) {
    const trigger = root.querySelector(".picker-trigger");
    const panel = root.querySelector(".picker-panel");
    const summary = root.querySelector(".picker-summary");
    const hint = root.querySelector(".picker-hint");
    const rows = [...root.querySelectorAll(".counter-row")];
    const cap = Number(root.dataset.totalMax) || Infinity;
    const infantRule = root.dataset.infantRule === "true";

    const state = Object.fromEntries(
      rows.map((row) => [row.dataset.key, Number(row.dataset.start) || 0]),
    );

    const total = () =>
      Object.values(state).reduce((sum, value) => sum + value, 0);

    const bounds = (key) => {
      const row = rows.find((r) => r.dataset.key === key);
      let min = Number(row.dataset.min) || 0;
      let max = Math.min(Number(row.dataset.max), state[key] + (cap - total()));

      // Each infant needs an adult: adults can't drop below infants, infants can't exceed adults
      if (infantRule && key === "adults") min = Math.max(min, state.infants);
      if (infantRule && key === "infants") max = Math.min(max, state.adults);

      return { min, max };
    };

    const bump = (node) => {
      node.classList.remove("bump");
      void node.offsetWidth; // restart the animation
      node.classList.add("bump");
    };

    function render() {
      rows.forEach((row) => {
        const key = row.dataset.key;
        const output = row.querySelector("output");
        const { min, max } = bounds(key);

        if (output.textContent !== String(state[key])) {
          output.textContent = state[key];
          bump(output);
        }

        row.querySelector('[data-action="dec"]').disabled = state[key] <= min;
        row.querySelector('[data-action="inc"]').disabled = state[key] >= max;
      });

      const parts = rows
        .filter((row) => state[row.dataset.key] > 0)
        .map((row) => {
          const count = state[row.dataset.key];
          return `${count} ${count === 1 ? row.dataset.one : row.dataset.many}`;
        });

      summary.textContent = parts.join(", ") || "Add travellers";

      if (infantRule && state.infants > 0 && state.infants >= state.adults) {
        hint.textContent = "Each infant needs its own adult.";
      } else if (total() >= cap) {
        hint.textContent = `Maximum of ${cap} per booking.`;
      } else {
        hint.textContent = "";
      }
    }

    const open = (value) => {
      panel.classList.toggle("is-open", value);
      trigger.setAttribute("aria-expanded", String(value));
    };

    trigger.addEventListener("click", () =>
      open(!panel.classList.contains("is-open")),
    );

    root.querySelector(".picker-done").addEventListener("click", () => {
      open(false);
      trigger.focus();
    });

    panel.addEventListener("click", (event) => {
      const button = event.target.closest(".counter-btn");
      if (!button || button.disabled) return;

      const key = button.closest(".counter-row").dataset.key;
      state[key] += button.dataset.action === "inc" ? 1 : -1;
      render();
    });

    document.addEventListener("click", (event) => {
      if (!root.contains(event.target)) open(false);
    });

    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && panel.classList.contains("is-open")) {
        open(false);
        trigger.focus();
      }
    });

    render();
    return { state };
  }

  /* ---------- Trip type (One way / Return) ---------- */
  function applyTrip() {
    const checked = form.querySelector('input[name="trip"]:checked');
    const isReturn = checked?.value === "return";

    form.classList.toggle("is-return", isReturn);
    form.querySelectorAll("[data-return]").forEach((input) => {
      input.disabled = !isReturn;
    });
  }

  /* ---------- Validation ---------- */
  const requiredInputs = [
    ...form.querySelectorAll("input[required], select[required]"),
  ];

  function setError(input, message) {
    const field = input.closest(".svc-field");
    if (!field) return;

    field.classList.toggle("is-invalid", Boolean(message));
    input.setAttribute("aria-invalid", String(Boolean(message)));
    field.querySelector(".svc-error").textContent = message;
  }

  function nativeMessage(input) {
    if (input.disabled) return "";
    const v = input.validity;
    if (v.valueMissing) return input.dataset.msg || "This field is required.";
    if (v.rangeUnderflow)
      return input.dataset.msgRange || "This date is too early.";
    if (v.badInput || v.typeMismatch) return "Enter a valid value.";
    return "";
  }

  function validate(values) {
    const errors = new Map();

    requiredInputs.forEach((input) => {
      const message = nativeMessage(input);
      if (message) errors.set(input, message);
    });

    const cross = config.cross?.(values);
    if (cross) {
      const input = form.elements[cross.name];
      if (input && !errors.has(input)) errors.set(input, cross.message);
    }

    let firstInvalid = null;
    requiredInputs.forEach((input) => {
      const message = errors.get(input) || "";
      setError(input, message);
      if (message && !firstInvalid) firstInvalid = input;
    });

    return firstInvalid;
  }

  /* ---------- Values ---------- */
  function readValues(pickers) {
    const data = Object.fromEntries(new FormData(form).entries());
    data.trip ??= "oneway";
    pickers.forEach((picker) => Object.assign(data, picker.state));
    return data;
  }

  /* ---------- Results ---------- */
  function renderItem(item) {
    const card = el("article", "svc-result");

    const info = el("div");
    info.append(el("h3", "", item.title), el("p", "", item.subtitle));

    const tags = el("div", "svc-tags");
    item.tags.forEach((tag) => tags.append(el("span", "svc-tag", tag)));

    const price = el("div", "svc-price");
    const cta = el("button", "btn svc-submit", item.cta);
    cta.type = "button";
    cta.addEventListener("click", () =>
      window.Bleet?.toast("Booking is coming soon."),
    );
    price.append(
      el("strong", "", item.price),
      el("span", "", item.priceNote),
      cta,
    );

    card.append(info, tags, price);
    return card;
  }

  function renderResults(values) {
    const items = config.results(values, seeded(JSON.stringify(values)));

    const head = el("div", "svc-results-head");
    const text = el("div");
    text.append(
      el("h2", "", config.title(values)),
      el("p", "", config.subtitle(values)),
    );
    head.append(text, el("p", "muted", `${items.length} options`));
    $("resultsHead").replaceChildren(head);

    $("resultsList").replaceChildren(
      ...items.map((item, index) => {
        const card = renderItem(item);
        card.style.animationDelay = `${index * 60}ms`;
        return card;
      }),
    );

    $("results").scrollIntoView({ behavior: "smooth", block: "start" });
  }

  /* ---------- Init ---------- */
  initDates();
  const pickers = [...form.querySelectorAll(".picker")].map(initPicker);

  form.addEventListener("change", (event) => {
    if (event.target.name === "trip") applyTrip();
  });
  applyTrip();

  // Swap button (trains and buses)
  form.querySelector(".svc-swap")?.addEventListener("click", () => {
    const { from, to } = form.elements;
    [from.value, to.value] = [to.value, from.value];
  });

  // Clear an error as soon as the user fixes that field
  requiredInputs.forEach((input) => {
    const refresh = () => {
      if (input.closest(".svc-field")?.classList.contains("is-invalid")) {
        setError(input, nativeMessage(input));
      }
    };
    input.addEventListener("input", refresh);
    input.addEventListener("change", refresh);
  });

  form.addEventListener("submit", (event) => {
    event.preventDefault();

    const values = readValues(pickers);
    const firstInvalid = validate(values);

    if (firstInvalid) {
      firstInvalid.focus();
      return;
    }

    renderResults(values);
  });
})();
