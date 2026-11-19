/* =========================================
   BLEET — RESULTS PAGE
   Reads the search from the URL and renders sample flights.
   Later: replace generateOutbound() with a fetch() to the Spring Boot API.
   ========================================= */
(() => {
  "use strict";

  const list = document.getElementById("flightList");
  if (!list) return;

  const $ = (id) => document.getElementById(id);
  const pad = (n) => String(n).padStart(2, "0");

  /* Read the query string. The server must validate these again. */
  const params = new URLSearchParams(location.search);
  const from = (params.get("from") || "").trim();
  const to = (params.get("to") || "").trim();
  const date = params.get("date") || "";
  const returnDate = params.get("return") || "";
  const isRound = params.get("trip") === "roundtrip";
  const deal = params.get("deal");
  const cabinKey = params.get("cabin") || "economy";
  const directOnly = params.get("direct") === "1";

  const clamp = (value, min, max) =>
    Math.min(max, Math.max(min, Number(value) || 0));
  const adults = clamp(params.get("adults"), 1, 10);
  const children = clamp(params.get("children"), 0, 10);
  const infants = clamp(params.get("infants"), 0, adults);

  const CABIN = {
    economy: { label: "Economy", factor: 1 },
    premium: { label: "Premium Economy", factor: 1.5 },
    business: { label: "Business", factor: 3 },
    first: { label: "First", factor: 5 },
  };
  const cabin = CABIN[cabinKey] ?? CABIN.economy;

  // Infants usually pay about 10% of an adult fare
  const paxWeight = adults + children + infants * 0.1;

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
    const parsed = new Date(`${value}T00:00:00`);
    return Number.isNaN(parsed.getTime())
      ? "Any date"
      : parsed.toLocaleDateString(undefined, {
          weekday: "short",
          day: "numeric",
          month: "short",
          year: "numeric",
        });
  };

  const travellersText = () => {
    const parts = [`${adults} adult${adults > 1 ? "s" : ""}`];
    if (children) parts.push(`${children} child${children > 1 ? "ren" : ""}`);
    if (infants) parts.push(`${infants} infant${infants > 1 ? "s" : ""}`);
    return parts.join(", ");
  };

  /* Deterministic sample data: the same search always shows the same flights */
  function generateOutbound(seedText) {
    let seed = [...seedText].reduce(
      (hash, char) => (Math.imul(hash, 31) + char.charCodeAt(0)) >>> 0,
      7,
    );

    const random = () => {
      seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
      return seed / 4294967296;
    };

    return AIRLINES.map((airline) => {
      const baseFare = 89 + random() * 520;
      return {
        airline,
        departure: 6 * 60 + Math.floor(random() * 14 * 60), // 06:00 to 20:00
        duration: 95 + Math.floor(random() * 600),
        stops: random() > 0.6 ? 1 : 0,
        price: Math.round(baseFare * cabin.factor * paxWeight),
      };
    }).filter((flight) => !directOnly || flight.stops === 0);
  }

  function renderFlight(flight) {
    const card = el("article", "flight-card");

    const info = el("div", "flight-info");
    info.append(
      el("div", "flight-airline", flight.airline),
      el(
        "div",
        "flight-meta",
        `${flight.stops ? "1 stop" : "Non-stop"} · ${formatDuration(flight.duration)} · ${cabin.label}`,
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
    price.append(
      el("strong", "", `$${flight.price}`),
      el("span", "", `Total · ${travellersText()}`),
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
    if (!flights.length) {
      list.replaceChildren(
        el(
          "p",
          "empty-state",
          "No flights match these filters. Try turning off “Direct flights only”.",
        ),
      );
      count.textContent = "0 flights found";
      return;
    }

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

  /* Header */
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

  const origin = from || "Anywhere";
  const destination = to || "Anywhere";
  const tripText =
    isRound && returnDate
      ? `Round trip, return ${formatDate(returnDate)}`
      : "One way";

  $("resultsKicker").textContent = deal
    ? (DEALS[deal] ?? "Special offer")
    : "Search results";
  $("resultsRoute").textContent = `${origin} → ${destination}`;
  $("resultsMeta").textContent =
    `${formatDate(date)} · ${travellersText()} · ${cabin.label} · ${tripText}`;

  const flights = generateOutbound(
    `${origin}|${destination}|${date}|${deal ?? ""}|${cabinKey}`,
  );

  sortSelect.addEventListener("change", () => render(flights));
  render(flights);
})();
