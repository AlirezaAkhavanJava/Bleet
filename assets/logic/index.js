/* =========================================
   BLEET — HOME PAGE
   Flight search (trip type, return date, travellers, validation) and newsletter
   ========================================= */
(() => {
  "use strict";

  const $ = (id) => document.getElementById(id);
  const pad = (n) => String(n).padStart(2, "0");
  const toISO = (date) =>
    `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
  const addDays = (iso, days) => {
    const date = new Date(`${iso}T00:00:00`);
    date.setDate(date.getDate() + days);
    return toISO(date);
  };

  const MAX_TRAVELLERS = 10;

  /* ---------- Flight search ---------- */
  function initSearch(form) {
    const grid = $("searchGrid");
    const fromInput = $("fromCity");
    const toInput = $("toCity");
    const departInput = $("departureDate");
    const returnInput = $("returnDate");
    const swapBtn = $("swapCities");
    const directOnly = $("directOnly");
    const tripButtons = form.querySelectorAll(".trip-type");

    /* Dates: earliest is today, return can't be before departure */
    const todayISO = toISO(new Date());
    departInput.min = todayISO;
    if (!departInput.value || departInput.value < todayISO)
      departInput.value = addDays(todayISO, 7);
    if (!returnInput.value) returnInput.value = addDays(departInput.value, 7);

    const syncReturnDate = () => {
      returnInput.min = departInput.value;
      if (returnInput.value < departInput.value)
        returnInput.value = departInput.value;
    };
    departInput.addEventListener("change", syncReturnDate);
    syncReturnDate();

    /* Validation */
    const setError = (input, message) => {
      const field = input.closest(".field");
      field.classList.toggle("is-invalid", Boolean(message));
      input.setAttribute("aria-invalid", String(Boolean(message)));
      field.querySelector(".field-error").textContent = message;
    };

    const rules = [
      {
        input: fromInput,
        check: () =>
          fromInput.value.trim().length < 2 ? "Enter a departure city." : "",
      },
      {
        input: toInput,
        check: () => {
          const to = toInput.value.trim();
          if (to.length < 2) return "Enter a destination.";
          if (to.toLowerCase() === fromInput.value.trim().toLowerCase()) {
            return "Destination must differ from departure.";
          }
          return "";
        },
      },
      {
        input: departInput,
        check: () => {
          if (!departInput.value) return "Choose a departure date.";
          if (departInput.value < todayISO) return "Date can't be in the past.";
          return "";
        },
      },
      {
        input: returnInput,
        enabled: () => grid.classList.contains("is-round"),
        check: () => {
          if (!returnInput.value) return "Choose a return date.";
          if (returnInput.value < departInput.value)
            return "Return must be on or after departure.";
          return "";
        },
      },
    ];

    const isEnabled = (rule) => (rule.enabled ? rule.enabled() : true);

    const validateAll = () => {
      let firstInvalid = null;
      rules.forEach((rule) => {
        const message = isEnabled(rule) ? rule.check() : "";
        setError(rule.input, message);
        if (message && !firstInvalid) firstInvalid = rule.input;
      });
      return firstInvalid;
    };

    rules.forEach((rule) => {
      rule.input.addEventListener("input", () => {
        if (rule.input.closest(".field").classList.contains("is-invalid")) {
          setError(rule.input, isEnabled(rule) ? rule.check() : "");
        }
      });
    });

    /* Trip type: One way / Round trip */
    const setTrip = (trip) => {
      const isRound = trip === "roundtrip";
      grid.classList.toggle("is-round", isRound);
      returnInput.disabled = !isRound;
      tripButtons.forEach((button) => {
        button.setAttribute(
          "aria-pressed",
          String(button.dataset.trip === trip),
        );
      });
      if (isRound) syncReturnDate();
      else setError(returnInput, "");
    };

    tripButtons.forEach((button) => {
      button.addEventListener("click", () => {
        if (button.getAttribute("aria-disabled") === "true") {
          window.Bleet?.toast("Multi-city search is coming soon.");
          return;
        }
        setTrip(button.dataset.trip);
      });
    });

    swapBtn.addEventListener("click", () => {
      [fromInput.value, toInput.value] = [toInput.value, fromInput.value];
    });

    /* Travellers dropdown */
    const trigger = $("travellersBtn");
    const panel = $("travellersPanel");
    const summary = $("travellersSummary");
    const hint = $("travellersHint");
    const cabin = $("cabinClass");

    const state = { adults: 1, children: 0, infants: 0 };

    const total = () => state.adults + state.children + state.infants;

    // Each limit is calculated from the other counts, so the rules always hold
    const bounds = {
      adults: {
        min: () => Math.max(1, state.infants), // at least one adult, one per infant
        max: () => MAX_TRAVELLERS - state.children - state.infants,
      },
      children: {
        min: () => 0,
        max: () => MAX_TRAVELLERS - state.adults - state.infants,
      },
      infants: {
        min: () => 0,
        max: () =>
          Math.min(
            state.adults,
            MAX_TRAVELLERS - state.adults - state.children,
          ),
      },
    };

    const plural = (count, one, many) => `${count} ${count === 1 ? one : many}`;

    const travellersText = () => {
      const parts = [plural(state.adults, "Adult", "Adults")];
      if (state.children)
        parts.push(plural(state.children, "Child", "Children"));
      if (state.infants) parts.push(plural(state.infants, "Infant", "Infants"));
      return parts.join(", ");
    };

    const bump = (node) => {
      node.classList.remove("bump");
      void node.offsetWidth; // restart the CSS animation
      node.classList.add("bump");
    };

    function renderTravellers() {
      Object.keys(state).forEach((type) => {
        const row = panel.querySelector(`.traveller-row[data-type="${type}"]`);
        const output = row.querySelector("output");

        if (output.textContent !== String(state[type])) {
          output.textContent = state[type];
          bump(output);
        }

        row.querySelector('[data-action="dec"]').disabled =
          state[type] <= bounds[type].min();
        row.querySelector('[data-action="inc"]').disabled =
          state[type] >= bounds[type].max();
      });

      summary.textContent = `${travellersText()}, ${cabin.options[cabin.selectedIndex].text}`;

      if (state.infants > 0 && state.infants >= state.adults) {
        hint.textContent = "Each infant needs its own adult.";
      } else if (total() >= MAX_TRAVELLERS) {
        hint.textContent = "Maximum of 10 travellers per booking.";
      } else {
        hint.textContent = "";
      }
    }

    const openTravellers = (open) => {
      panel.classList.toggle("is-open", open);
      trigger.setAttribute("aria-expanded", String(open));
    };

    trigger.addEventListener("click", () => {
      openTravellers(!panel.classList.contains("is-open"));
    });

    $("travellersDone").addEventListener("click", () => {
      openTravellers(false);
      trigger.focus();
    });

    panel.addEventListener("click", (event) => {
      const button = event.target.closest(".counter-btn");
      if (!button || button.disabled) return;

      const type = button.closest(".traveller-row").dataset.type;
      state[type] += button.dataset.action === "inc" ? 1 : -1;
      renderTravellers();
    });

    cabin.addEventListener("change", renderTravellers);

    document.addEventListener("click", (event) => {
      if (!panel.contains(event.target) && !trigger.contains(event.target)) {
        openTravellers(false);
      }
    });

    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && panel.classList.contains("is-open")) {
        openTravellers(false);
        trigger.focus();
      }
    });

    /* Submit */
    form.addEventListener("submit", (event) => {
      event.preventDefault();

      const firstInvalid = validateAll();
      if (firstInvalid) {
        firstInvalid.focus();
        return;
      }

      const trip =
        form.querySelector('.trip-type[aria-pressed="true"]')?.dataset.trip ??
        "oneway";

      const query = new URLSearchParams({
        trip,
        from: fromInput.value.trim(),
        to: toInput.value.trim(),
        date: departInput.value,
        adults: state.adults,
        children: state.children,
        infants: state.infants,
        passengers: total(),
        cabin: cabin.value,
        direct: directOnly.checked ? "1" : "0",
      });

      if (trip === "roundtrip") query.set("return", returnInput.value);

      window.location.href = `results.html?${query}`;
    });

    setTrip("oneway");
    renderTravellers();
  }

  /* ---------- Newsletter ---------- */
  function initNewsletter() {
    const form = $("newsletterForm");
    if (!form) return;

    const email = $("newsletterEmail");

    form.addEventListener("submit", (event) => {
      event.preventDefault();

      if (!email.checkValidity()) {
        email.focus();
        window.Bleet?.toast("Please enter a valid email address.");
        return;
      }

      // TODO: POST the address to the backend (e.g. /api/newsletter)
      form.reset();
      window.Bleet?.toast("Thanks! You're on the list.");
    });
  }

  const searchForm = $("flightSearchForm");
  if (searchForm) initSearch(searchForm);
  initNewsletter();
})();
