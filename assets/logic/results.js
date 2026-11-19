/* =========================================
   BLEET — RESULTS PAGE
   Reads the search from the URL and renders sample flights.
   Later: replace generateSampleFlights() with a fetch() to the Spring Boot API.
   ========================================= */
(() => {
  "use strict";

  const list = document.getElementById("flightList");
  if (!list) return;

  const $ = (id) => document.getElementById(id);
  const pad = (n) => String(n).padStart(2, "0");

  /* Read and clamp the query string (the server must validate again later) */
  const params = new URLSearchParams(location.search);
  const from = (params.get("from") || "").trim();
  const to = (params.get("to") || "").trim();
  const date = params.get("date") || "";
  const deal = params.get("deal");
  const trip = params.get("trip") === "roundtrip" ? "Round trip" : "One way";
  const passengers = Math.min(
    3,
    Math.max(1, Number(params.get("passengers")) || 1),
  );

  const DEALS = {
    international: "International flights",
    weekend: "Weekend getaways",
  };

  const AIRLINES = [
    "Bleet Air",
    "Skyline",
    "Aurora Airways",
    "Nimbus",
    "Horizon Jet",
    "Blue Meridian",
  ];

  /* Small helper: builds elements with textContent, so user input is never parsed as HTML */
  const el = (tag, className, text) => {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  };

  const formatClock = (minutes) =>
    `${pad(Math.floor(minutes / 60) % 24)}:${pad(minutes % 60)}`;
  const formatDuration = (minutes) =>
    `${Math.floor(minutes / 60)}h ${pad(minutes % 60)}m`;

  const formatDate = (value) => {
    const date = new Date(`${value}T00:00:00`);
    return Number.isNaN(date.getTime())
      ? "Any date"
      : date.toLocaleDateString(undefined, {
          weekday: "short",
          day: "numeric",
          month: "short",
          year: "numeric",
        });
  };

  /* Deterministic sample data: the same search always shows the same flights */
  function generateSampleFlights(seedText) {
    let seed = [...seedText].reduce(
      (hash, char) => (Math.imul(hash, 31) + char.charCodeAt(0)) >>> 0,
      7,
    );

    const random = () => {
      seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
      return seed / 4294967296;
    };

    return AIRLINES.map((airline) => ({
      airline,
      departure: 6 * 60 + Math.floor(random() * 14 * 60), // minutes after midnight, 06:00–20:00
      duration: 95 + Math.floor(random() * 600),
      stops: random() > 0.6 ? 1 : 0,
      price: Math.round((89 + random() * 520) * passengers),
    }));
  }

  function renderFlight(flight) {
    const card = el("article", "flight-card");

    const info = el("div", "flight-info");
    info.append(
      el("div", "flight-airline", flight.airline),
      el(
        "div",
        "flight-meta",
        `${flight.stops ? "1 stop" : "Non-stop"} · ${formatDuration(flight.duration)}`,
      ),
    );

    const arrival = flight.departure + flight.duration;
    const nextDay = arrival >= 24 * 60 ? " +1" : "";

    const route = el("div", "flight-route");
    route.append(
      el("span", "", formatClock(flight.departure)),
      el("span", "flight-line"),
      el("span", "", formatClock(arrival) + nextDay),
    );

    const buy = el("div", "flight-buy");
    const price = el("p", "flight-price");
    const paxLabel = passengers === 1 ? "1 adult" : `${passengers} adults`;
    price.append(
      el("strong", "", `$${flight.price}`),
      el("span", "", `Total · ${paxLabel}`),
    );

    const select = el("button", "btn btn-primary", "Select");
    select.type = "button";
    select.addEventListener("click", () =>
      window.Bleet?.toast("Booking is coming soon."),
    );

    buy.append(price, select);
    card.append(info, route, buy);
    return card;
  }

  const SORTERS = {
    price: (a, b) => a.price - b.price,
    duration: (a, b) => a.duration - b.duration,
    departure: (a, b) => a.departure - b.departure,
  };

  const sortSelect = $("sortBy");
  const count = $("resultsCount");

  function render(flights) {
    const sorted = [...flights].sort(SORTERS[sortSelect.value]);

    list.replaceChildren(
      ...sorted.map((flight, index) => {
        const card = renderFlight(flight);
        card.style.animationDelay = `${index * 60}ms`;
        return card;
      }),
    );

    count.textContent = `${sorted.length} flights found`;
  }

  /* Header text */
  const origin = from || "Anywhere";
  const destination = to || "Anywhere";

  if (!from && !to && !deal) {
    $("resultsKicker").textContent = "No search yet";
    $("resultsRoute").textContent = "Search for a route";
    $("resultsMeta").textContent =
      "Go to the home page and enter a departure and destination.";
    list.replaceChildren(el("p", "muted", "No flights to show yet."));
    count.textContent = "";
    sortSelect.disabled = true;
    return;
  }

  $("resultsKicker").textContent = deal
    ? (DEALS[deal] ?? "Special offer")
    : "Search results";
  $("resultsRoute").textContent = `${origin} → ${destination}`;
  $("resultsMeta").textContent =
    `${formatDate(date)} · ${paxLabel()} · ${trip}`;

  function paxLabel() {
    return passengers === 1 ? "1 adult" : `${passengers} adults`;
  }

  const flights = generateSampleFlights(
    `${origin}|${destination}|${date}|${deal ?? ""}`,
  );

  sortSelect.addEventListener("change", () => render(flights));
  render(flights);
})();
