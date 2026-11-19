/* =========================================
   BLEET — HOME PAGE
   Flight search form and newsletter signup
   ========================================= */
(() => {
  "use strict";

  const $ = (id) => document.getElementById(id);
  const pad = (n) => String(n).padStart(2, "0");

  // Local date as YYYY-MM-DD (avoids the UTC off-by-one from toISOString)
  const toISO = (date) =>
    `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;

  /* ---------- Flight search ---------- */
  const form = $("flightSearchForm");

  if (form) {
    const fromInput = $("fromCity");
    const toInput = $("toCity");
    const dateInput = $("departureDate");
    const paxSelect = $("passengerCount");
    const swapBtn = $("swapCities");
    const tripButtons = form.querySelectorAll(".trip-type");

    // Earliest allowed date is today; default to one week ahead
    const todayISO = toISO(new Date());
    dateInput.min = todayISO;

    if (!dateInput.value || dateInput.value < todayISO) {
      const nextWeek = new Date();
      nextWeek.setDate(nextWeek.getDate() + 7);
      dateInput.value = toISO(nextWeek);
    }

    /* Trip type tabs */
    tripButtons.forEach((button) => {
      button.addEventListener("click", () => {
        if (button.getAttribute("aria-disabled") === "true") {
          window.Bleet?.toast("Multi-city search is coming soon.");
          return;
        }
        tripButtons.forEach((other) => {
          other.setAttribute("aria-pressed", String(other === button));
        });
      });
    });

    /* Swap departure and destination */
    swapBtn.addEventListener("click", () => {
      [fromInput.value, toInput.value] = [toInput.value, fromInput.value];
    });

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
            return "Destination must be different from departure.";
          }
          return "";
        },
      },
      {
        input: dateInput,
        check: () => {
          if (!dateInput.value) return "Choose a departure date.";
          if (dateInput.value < todayISO) return "Date can't be in the past.";
          return "";
        },
      },
    ];

    const validate = () => {
      let firstInvalid = null;
      rules.forEach(({ input, check }) => {
        const message = check();
        setError(input, message);
        if (message && !firstInvalid) firstInvalid = input;
      });
      return firstInvalid;
    };

    // Refresh an error while the user is fixing it
    rules.forEach(({ input, check }) => {
      input.addEventListener("input", () => {
        if (input.closest(".field").classList.contains("is-invalid")) {
          setError(input, check());
        }
      });
    });

    /* Submit: validate, then send the query to the results page */
    form.addEventListener("submit", (event) => {
      event.preventDefault();

      const firstInvalid = validate();
      if (firstInvalid) {
        firstInvalid.focus();
        return;
      }

      const activeTrip = form.querySelector('.trip-type[aria-pressed="true"]');
      const query = new URLSearchParams({
        from: fromInput.value.trim(),
        to: toInput.value.trim(),
        date: dateInput.value,
        passengers: paxSelect.value,
        trip: activeTrip?.dataset.trip ?? "oneway",
      });

      window.location.href = `results.html?${query}`;
    });
  }

  /* ---------- Newsletter ---------- */
  const newsletter = $("newsletterForm");

  if (newsletter) {
    const email = $("newsletterEmail");

    newsletter.addEventListener("submit", (event) => {
      event.preventDefault();

      if (!email.checkValidity()) {
        email.focus();
        window.Bleet?.toast("Please enter a valid email address.");
        return;
      }

      // TODO: POST the address to the backend (e.g. /api/newsletter) and handle the response.
      newsletter.reset();
      window.Bleet?.toast("Thanks! You're on the list.");
    });
  }
})();
