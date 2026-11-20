/* =========================================
   BLEET — DESTINATIONS CATALOGUE
   Filters, sorting, counters, cards, private collection,
   detail window (trip facts, flights, itinerary, links, reserve question),
   and the VIP builder with add-on info.
   Every value is written with textContent.
   Prices and flight times are estimates. The server confirms everything.
   ========================================= */
(() => {
  "use strict";

  const root = document.querySelector("[data-catalog]");
  if (!root) return;

  const $ = (id) => document.getElementById(id);
  const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const money = new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  });

  const el = (tag, className, text) => {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  };

  /* Photo file: an explicit `photo` wins, otherwise it is named after the item
     ("Swiss Alps" -> swiss-alps.webp). A missing file is removed, leaving the background. */
  const slug = (name) => name.toLowerCase().replace(/\s+/g, "-");
  const photoFile = (item) => item.photo ?? `${slug(item.name)}.webp`;

  const photo = (file) => {
    const img = el("img");
    img.src = `assets/images/cards/${file}`;
    img.alt = "";
    img.width = 800;
    img.height = 600;
    img.loading = "lazy";
    img.decoding = "async";
    img.onerror = () => img.remove();
    return img;
  };

  /* ---------- Data ---------- */
  const CATALOG = [
    {
      name: "Paris",
      country: "France",
      region: "europe",
      tier: "premium",
      price: 1890,
      rating: 4.8,
      nights: 4,
      desc: "Grand boulevards, world-class museums and riverside dinners.",
      highlights: [
        "Boutique 5-star hotel",
        "Private Louvre tour",
        "Seine dinner cruise",
      ],
    },
    {
      name: "Dubai",
      country: "UAE",
      region: "middle-east",
      tier: "vip",
      price: 3450,
      rating: 4.9,
      nights: 5,
      desc: "Desert dunes, glass skylines and rooftop lounges above the marina.",
      highlights: [
        "Skyline suite with marina view",
        "Desert evening with dinner",
        "Private airport transfers",
      ],
    },
    {
      name: "Istanbul",
      country: "Turkey",
      region: "europe",
      tier: "standard",
      price: 990,
      rating: 4.7,
      nights: 4,
      desc: "Two continents, a Bosphorus sunset and centuries of history.",
      highlights: [
        "Historic district hotel",
        "Bosphorus cruise",
        "Old city walking tour",
      ],
    },
    {
      name: "Tokyo",
      country: "Japan",
      region: "asia",
      tier: "premium",
      price: 2750,
      rating: 4.9,
      nights: 6,
      desc: "Neon districts, quiet temples and sushi counters worth the trip alone.",
      highlights: [
        "Shinjuku city-view room",
        "Sushi omakase evening",
        "Bullet train to Kyoto",
      ],
    },
    {
      name: "Santorini",
      country: "Greece",
      region: "europe",
      tier: "vip",
      price: 2980,
      rating: 4.9,
      nights: 5,
      desc: "Whitewashed cliffs, caldera sunsets and infinity pools.",
      highlights: [
        "Cliffside suite with plunge pool",
        "Private catamaran sunset",
        "Winery tasting",
      ],
    },
    {
      name: "Maldives",
      country: "Maldives",
      region: "asia",
      tier: "vip",
      price: 5600,
      rating: 5.0,
      nights: 5,
      desc: "Overwater villas, turquoise lagoons and total privacy.",
      highlights: [
        "Overwater villa",
        "Private reef snorkelling",
        "Sunset dolphin cruise",
      ],
    },
    {
      name: "Swiss Alps",
      country: "Switzerland",
      region: "europe",
      tier: "premium",
      price: 2400,
      rating: 4.8,
      nights: 4,
      desc: "Glacier railways, alpine chalets and fondue by the fire.",
      highlights: [
        "Chalet with mountain views",
        "Glacier Express tickets",
        "Guided alpine hike",
      ],
    },
    {
      name: "Kyoto",
      country: "Japan",
      region: "asia",
      tier: "standard",
      price: 1650,
      rating: 4.8,
      nights: 3,
      desc: "Ryokan nights, bamboo groves and tea ceremonies.",
      highlights: ["Traditional ryokan", "Tea ceremony", "Bamboo grove walk"],
    },
    {
      name: "Marrakech",
      country: "Morocco",
      region: "africa",
      tier: "standard",
      price: 1120,
      rating: 4.6,
      nights: 4,
      desc: "Riads, spice souks and rooftop mint tea at sunset.",
      highlights: [
        "Private riad with courtyard",
        "Medina guided walk",
        "Atlas Mountains day trip",
      ],
    },
    {
      name: "Bali",
      country: "Indonesia",
      region: "asia",
      tier: "premium",
      price: 1980,
      rating: 4.7,
      nights: 6,
      desc: "Rice terraces, temple ceremonies and cliffside pools.",
      highlights: [
        "Jungle villa with pool",
        "Rice terrace cycling",
        "Balinese spa ritual",
      ],
    },
    {
      name: "Amalfi Coast",
      country: "Italy",
      region: "europe",
      tier: "vip",
      price: 3900,
      rating: 4.9,
      nights: 5,
      desc: "Pastel villages, lemon groves and dramatic coastal roads.",
      highlights: [
        "Clifftop suite",
        "Private boat day",
        "Cooking class in Positano",
      ],
    },
    {
      name: "Cape Town",
      country: "South Africa",
      region: "africa",
      tier: "premium",
      price: 2250,
      rating: 4.7,
      nights: 5,
      desc: "Table Mountain, wine valleys and safari days.",
      highlights: [
        "Atlantic view suite",
        "Winelands private tour",
        "Safari day",
      ],
    },
  ];

  /* Flight estimates for each destination, measured from London (LHR).
     Other origins show the airline and stops, and point to the results page for times. */
  const FLIGHTS = {
    Paris: {
      code: "CDG",
      airline: "Air France",
      hours: "1h 20m",
      stops: "Non-stop",
    },
    Dubai: {
      code: "DXB",
      airline: "Emirates",
      hours: "7h 10m",
      stops: "Non-stop",
    },
    Istanbul: {
      code: "IST",
      airline: "Turkish Airlines",
      hours: "3h 55m",
      stops: "Non-stop",
    },
    Tokyo: {
      code: "HND",
      airline: "Japan Airlines",
      hours: "12h 30m",
      stops: "1 stop",
    },
    Santorini: {
      code: "JTR",
      airline: "Aegean Airlines",
      hours: "4h 30m",
      stops: "1 stop",
    },
    Maldives: {
      code: "MLE",
      airline: "Emirates",
      hours: "9h 40m",
      stops: "1 stop",
    },
    "Swiss Alps": {
      code: "ZRH",
      airline: "Swiss International Air Lines",
      hours: "1h 40m",
      stops: "Non-stop",
    },
    Kyoto: { code: "KIX", airline: "ANA", hours: "13h 00m", stops: "1 stop" },
    Marrakech: {
      code: "RAK",
      airline: "Royal Air Maroc",
      hours: "3h 40m",
      stops: "Non-stop",
    },
    Bali: {
      code: "DPS",
      airline: "Singapore Airlines",
      hours: "15h 00m",
      stops: "1 stop",
    },
    "Amalfi Coast": {
      code: "NAP",
      airline: "ITA Airways",
      hours: "2h 45m",
      stops: "Non-stop",
    },
    "Cape Town": {
      code: "CPT",
      airline: "British Airways",
      hours: "11h 30m",
      stops: "Non-stop",
    },
  };

  const ORIGINS = [
    { city: "London", code: "LHR" },
    { city: "New York", code: "JFK" },
    { city: "Dubai", code: "DXB" },
    { city: "Istanbul", code: "IST" },
  ];

  const PRIVATE = [
    {
      name: "Private yacht charter",
      country: "Amalfi Coast",
      photo: "amalfi-coast.webp",
      price: 85000,
      unit: "per week",
      desc: "A crewed 60-metre yacht, tailored menus and a private swim stop at every bay.",
      highlights: [
        "Crew of 8",
        "Chef-prepared lunch on board",
        "Tender to hidden coves",
      ],
    },
    {
      name: "Overwater villa",
      country: "Maldives",
      photo: "maldives.webp",
      price: 12500,
      unit: "per night",
      desc: "Glass floor, private deck and a lagoon all to yourself.",
      highlights: ["Private plunge pool", "Butler service", "Sunset catamaran"],
    },
    {
      name: "Helicopter skyline tour",
      country: "Dubai",
      photo: "dubai.webp",
      price: 6800,
      unit: "per flight",
      desc: "See the desert, the coast and the skyline from above, with champagne on landing.",
      highlights: ["Private pilot", "Up to 3 guests", "Landing picnic"],
    },
    {
      name: "Private chef dinner",
      country: "Paris",
      photo: "paris.webp",
      price: 4200,
      unit: "per evening",
      desc: "A Michelin-trained chef cooks in your suite, with wine pairings selected for you.",
      highlights: ["Five courses", "Sommelier pairing", "Table for up to 6"],
    },
  ];

  const PACKAGES = [
    {
      id: "essential",
      name: "Essential",
      multiplier: 1,
      note: "Stay, transfers and breakfast",
    },
    {
      id: "signature",
      name: "Signature",
      multiplier: 1.6,
      note: "Adds chef dinner and lounge access",
    },
    {
      id: "ultra",
      name: "Ultra",
      multiplier: 3.2,
      note: "Adds private driver and 24/7 concierge",
    },
  ];

  /* Private amenities, priced per day. */
  const DEFAULT_NOTE =
    "Availability and final rates are confirmed by a concierge before booking.";

  const ADDONS = [
    {
      id: "babysitter",
      name: "Babysitter",
      tagline: "Certified childcare in your residence",
      perDay: 250,
      languages: ["English", "Arabic", "French", "Spanish"],
      includes: [
        "Background-checked and first-aid certified",
        "Up to 10 hours per day",
        "Age-appropriate activities and meals",
        "Backup sitter on standby",
      ],
      note: "Please book at least 24 hours ahead and share the children's ages when you enquire.",
    },
    {
      id: "companion",
      name: "Travel companion",
      tagline: "Multilingual companion for dinners, events and trips",
      perDay: 900,
      languages: [
        "English",
        "Mandarin Chinese",
        "Japanese",
        "Arabic",
        "French",
        "Spanish",
        "Russian",
      ],
      includes: [
        "Fluent in your chosen language",
        "Joins dinners, events and excursions",
        "Discreet and professionally trained",
        "Up to 12 hours per day",
      ],
    },
    {
      id: "driver",
      name: "Personal driver",
      tagline: "Chauffeur-driven luxury vehicle with a professional driver",
      perDay: 450,
      languages: ["English", "Arabic", "French", "Turkish"],
      includes: [
        "Luxury sedan or SUV of your choice",
        "Up to 10 hours of driving",
        "Fuel, tolls and parking included",
        "Airport meet-and-greet",
      ],
    },
    {
      id: "chef",
      name: "Private chef",
      tagline: "Cooks in your residence, three meals a day",
      perDay: 700,
      languages: ["English", "French", "Italian", "Japanese"],
      includes: [
        "Menus planned around your preferences",
        "Groceries sourced fresh each day",
        "Kitchen and service staff included",
        "Dietary requirements covered",
      ],
    },
    {
      id: "tennis",
      name: "Tennis coach",
      tagline: "Certified coach for private sessions on your court",
      perDay: 180,
      languages: ["English", "Spanish", "French", "German"],
      includes: [
        "Certified professional coach",
        "Up to 2 hours of sessions per day",
        "Racquets and balls supplied",
        "Video analysis on request",
      ],
    },
    {
      id: "trainer",
      name: "Personal trainer",
      tagline: "Training plan built around your goals",
      perDay: 220,
      languages: ["English", "Arabic", "Mandarin Chinese", "Hindi"],
      includes: [
        "Assessment on day one",
        "Gym sessions and recovery plans",
        "Nutrition guidance",
        "Equipment provided",
      ],
    },
    {
      id: "spa",
      name: "Spa therapist",
      tagline: "In-residence treatments and massage",
      perDay: 320,
      languages: ["English", "Japanese", "Korean", "French"],
      includes: [
        "Massage and facial treatments",
        "Oils and equipment supplied",
        "Treatments in your suite or spa room",
        "Up to 3 treatments per day",
      ],
    },
    {
      id: "sommelier",
      name: "Sommelier",
      tagline: "Wine pairings and a curated cellar",
      perDay: 400,
      languages: ["English", "French", "Italian", "Spanish"],
      includes: [
        "Wine pairing for each meal",
        "Cellar selection and tasting notes",
        "Champagne and spirits advice",
        "Service staff included",
      ],
    },
    {
      id: "photographer",
      name: "Photographer",
      tagline: "Private photography of your stay",
      perDay: 500,
      languages: ["English", "Mandarin Chinese", "French"],
      includes: [
        "Up to 8 hours of coverage",
        "Edited gallery within 7 days",
        "Drone shots where permitted",
        "Print-ready files",
      ],
    },
    {
      id: "interpreter",
      name: "Interpreter",
      tagline: "Simultaneous interpretation for meetings and events",
      perDay: 350,
      languages: [
        "Mandarin Chinese",
        "Japanese",
        "Korean",
        "Arabic",
        "Russian",
        "Turkish",
        "Hindi",
        "German",
      ],
      includes: [
        "Simultaneous or consecutive interpretation",
        "Meetings, tours and dinners",
        "Available any day of your stay",
        "Professional equipment supplied",
      ],
    },
    {
      id: "security",
      name: "Security detail",
      tagline: "Discreet close protection, vetted team",
      perDay: 1200,
      languages: ["English", "Arabic", "French"],
      includes: [
        "Team of two for up to 12 hours",
        "Threat assessment and route planning",
        "Discreet close protection",
        "Coordination with your residence",
      ],
    },
    {
      id: "yacht",
      name: "Yacht charter",
      tagline: "Crewed 40-metre yacht for half a day",
      perDay: 3500,
      languages: ["English", "Italian", "Spanish"],
      includes: [
        "Captain and deckhand",
        "Refreshments and light lunch",
        "Tender to hidden coves",
        "Up to 8 guests",
      ],
      note: "Half-day use. Weather and marina schedules may change the route.",
    },
    {
      id: "helicopter",
      name: "Helicopter transfers",
      tagline: "Private transfers between airport and residence",
      perDay: 2200,
      languages: ["English", "Arabic", "French"],
      includes: [
        "Pilot included",
        "Airport to residence transfers",
        "Up to 4 passengers",
        "Luggage handling",
      ],
      note: "Flight times depend on weather and airspace approvals.",
    },
  ];

  const TIER_LABEL = { standard: "Standard", premium: "Premium", vip: "VIP" };
  const TIER_RANK = { vip: 3, premium: 2, standard: 1 };

  const SORTERS = {
    featured: (a, b) =>
      TIER_RANK[b.tier] - TIER_RANK[a.tier] || b.rating - a.rating,
    "price-asc": (a, b) => a.price - b.price,
    "price-desc": (a, b) => b.price - a.price,
    rating: (a, b) => b.rating - a.rating,
  };

  const state = { region: "all", vipOnly: false, sort: "featured" };
  let current = null;

  /* ---------- Hero: wrap each word so it can animate in turn ---------- */
  function splitWords(node, start) {
    const words = node.textContent.trim().split(/\s+/);
    node.textContent = "";

    words.forEach((word, i) => {
      const span = el("span", "split-word", word);
      span.style.setProperty("--i", start + i);
      node.append(span);
      if (i < words.length - 1) node.append(" ");
    });

    return start + words.length;
  }

  /* ---------- Counters start when they scroll into view ---------- */
  function animateNumber(node) {
    const target = Number(node.dataset.count) || 0;
    const isMoney = "money" in node.dataset;
    const format = (n) =>
      isMoney ? money.format(n) : Math.round(n).toLocaleString();

    if (reduceMotion) {
      node.textContent = format(target);
      return;
    }

    const start = performance.now();
    const duration = 1200;

    const tick = (now) => {
      const t = Math.min(1, (now - start) / duration);
      node.textContent = format(target * (1 - Math.pow(1 - t, 3)));
      if (t < 1) requestAnimationFrame(tick);
    };

    requestAnimationFrame(tick);
  }

  const counterObserver = new IntersectionObserver(
    (entries, observer) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        observer.unobserve(entry.target);
        animateNumber(entry.target);
      });
    },
    { threshold: 0.6 },
  );

  /* ---------- Destination cards ---------- */
  function renderCard(item, index) {
    const slot = el("div", "dest-item");
    slot.style.setProperty("--d", `${Math.min(index, 10) * 70}ms`);

    const card = el("article", `dest-card tier-${item.tier}`);

    const media = el("div", "dest-media");
    media.append(
      el("span", "dest-tier", TIER_LABEL[item.tier]),
      el("span", "dest-rating", `★ ${item.rating.toFixed(1)}`),
      photo(photoFile(item)),
    );

    const amount = el("strong", "", money.format(0));
    amount.dataset.count = String(item.price);
    amount.dataset.money = "";

    const price = el("div", "dest-price");
    price.append(el("small", "", "From per person"), amount);

    const view = el("button", "cat-btn cat-btn-line", "View");
    view.type = "button";
    view.addEventListener("click", () => openDetail(item));

    const foot = el("div", "dest-foot");
    foot.append(price, view);

    const body = el("div", "dest-body");
    body.append(
      el("p", "dest-meta", `${item.country} · ${item.nights} nights`),
      el("h3", "", item.name),
      el("p", "dest-desc", item.desc),
      foot,
    );

    card.append(media, body);
    slot.append(card);
    counterObserver.observe(amount);
    return slot;
  }

  function visibleItems() {
    return CATALOG.filter(
      (item) =>
        (state.region === "all" || item.region === state.region) &&
        (!state.vipOnly || item.tier === "vip"),
    ).sort(SORTERS[state.sort]);
  }

  function render() {
    const items = visibleItems();
    $("destGrid").replaceChildren(...items.map(renderCard));
    $("catCount").textContent =
      `${items.length} destination${items.length === 1 ? "" : "s"}`;
    $("catEmpty").hidden = items.length > 0;
  }

  /* ---------- Private collection ---------- */
  function renderPrivate() {
    $("privateGrid").replaceChildren(
      ...PRIVATE.map((item, index) => {
        const button = el("button", "private-card");
        button.type = "button";
        button.style.setProperty("--d", `${index * 80}ms`);

        const media = el("div", "dest-media");
        media.append(photo(photoFile(item)));

        const price = el("div", "private-price");
        price.append(
          el("strong", "", money.format(item.price)),
          el("small", "", item.unit),
        );

        const body = el("div", "private-body");
        body.append(
          el("p", "dest-meta", item.country),
          el("h3", "", item.name),
          price,
        );

        button.append(media, body);
        button.addEventListener("click", () => openDetail(item));
        return button;
      }),
    );
  }

  /* ---------- Detail window ---------- */
  const dialog = $("detail");
  const isPrivate = (item) => Boolean(item.unit);

  /* Day-by-day plan: arrival, one highlight per middle day, departure */
  function buildItinerary(item) {
    const days = [
      {
        title: "Arrival",
        text: `Private transfer from the airport to your hotel in ${item.name}.`,
      },
    ];

    for (let day = 1; day < item.nights; day += 1) {
      days.push({
        title: `Day ${day}`,
        text: item.highlights[(day - 1) % item.highlights.length],
      });
    }

    days.push({
      title: "Departure",
      text: "Check-out and private transfer to the airport.",
    });
    return days;
  }

  function renderItinerary(item) {
    $("itinerary").replaceChildren(
      ...buildItinerary(item).map((day, index) => {
        const li = el("li", "itin-day");
        li.style.setProperty("--d", `${index * 60}ms`);
        li.append(el("span", "itin-tag", day.title), el("p", "", day.text));
        return li;
      }),
    );
  }

  function selectedOrigin() {
    return (
      ORIGINS.find((o) => o.code === $("originSelect").value) ?? ORIGINS[0]
    );
  }

  function flightHref(item) {
    const origin = selectedOrigin();
    return `results.html?${new URLSearchParams({ from: origin.city, to: item.name, trip: "oneway" })}`;
  }

  function renderLinks(item) {
    const links = [
      { label: "Search flights", icon: "fa-plane", href: flightHref(item) },
      { label: "Find a stay", icon: "fa-hotel", href: "hotels.html" },
      {
        label: "Explore tours",
        icon: "fa-map-location-dot",
        href: "tours.html",
      },
      { label: "Check visa", icon: "fa-passport", href: "visa.html" },
      { label: "Ask a question", icon: "fa-headset", href: "support.html" },
    ];

    $("tripLinks").replaceChildren(
      ...links.map((link) => {
        const anchor = el("a", "tlink");
        anchor.href = link.href;
        const icon = el("i", `fa-solid ${link.icon}`);
        icon.setAttribute("aria-hidden", "true");
        anchor.append(icon, el("span", "", link.label));
        return anchor;
      }),
    );
  }

  function updateFlight() {
    if (!current) return;
    const flight = FLIGHTS[current.name];
    if (!flight) return;

    const origin = selectedOrigin();
    const fromLondon = origin.code === "LHR";

    $("flightLine").textContent =
      `${flight.airline} to ${current.name} (${flight.code}) from ${origin.city}`;
    $("flightMeta").replaceChildren(
      ...[
        flight.stops,
        fromLondon
          ? `About ${flight.hours} flying time`
          : "Flying time varies by origin",
        "Economy and business fares shown on results",
        "Luggage rules depend on the airline",
      ].map((text) => el("li", "", text)),
    );

    $("reserveFlight").hidden = false;
    $("tripLinks")
      .querySelector(".tlink")
      ?.setAttribute("href", flightHref(current));
    $("reserveFlight").dataset.href = flightHref(current);
  }

  function updateTotal() {
    if (!current) return;

    if (isPrivate(current)) {
      const text = `${money.format(current.price)} ${current.unit}`;
      $("detailTotal").textContent = text;
      $("reserveQ").textContent =
        `Would you like us to arrange ${current.name} for ${text}?`;
      return;
    }

    const choice = dialog.querySelector('input[name="pkg"]:checked');
    const pkg = PACKAGES.find((p) => p.id === choice?.value) ?? PACKAGES[0];
    const total = Math.round(current.price * pkg.multiplier);
    const text = `${money.format(total)} per person · ${current.nights} nights`;

    $("detailTotal").textContent = text;
    $("reserveQ").textContent =
      `Would you like to reserve the ${pkg.name} package for ${current.name}?`;
  }

  function openDetail(item) {
    current = item;
    const priv = isPrivate(item);
    const flight = FLIGHTS[item.name];

    $("detailMedia").replaceChildren(photo(photoFile(item)));
    $("detailKicker").textContent = priv
      ? item.country
      : `${item.country} · ${TIER_LABEL[item.tier]}`;
    $("detailTitle").textContent = item.name;
    $("detailDesc").textContent = item.desc;
    $("detailHighlights").replaceChildren(
      ...item.highlights.map((text) => el("li", "", text)),
    );

    $("factNights").textContent = priv
      ? "Bespoke, per booking"
      : `${item.nights} nights`;
    $("factFlight").textContent = flight
      ? `About ${flight.hours}`
      : "On request";
    $("factAirport").textContent = flight ? `${flight.code}` : item.country;

    $("flightSection").hidden = !flight;
    $("itinerarySection").hidden = priv;
    $("packagesField").hidden = priv;
    $("reserveFlight").hidden = !flight;
    $("detailReserve").textContent = priv ? "Yes, arrange it" : "Yes, reserve";

    if (!priv) {
      $("packageOptions").replaceChildren(
        ...PACKAGES.map((pkg, index) => {
          const wrap = el("div", "package");

          const input = el("input");
          input.type = "radio";
          input.name = "pkg";
          input.value = pkg.id;
          input.id = `pkg-${pkg.id}`;
          input.checked = index === 0;

          const label = el("label");
          label.htmlFor = input.id;
          label.append(
            el("span", "pkg-name", pkg.name),
            el("small", "", pkg.note),
            el(
              "strong",
              "",
              money.format(Math.round(item.price * pkg.multiplier)),
            ),
          );

          wrap.append(input, label);
          return wrap;
        }),
      );

      renderItinerary(item);
    }

    updateFlight();
    renderLinks(item);
    updateTotal();
    dialog.showModal();
  }

  /* ---------- VIP builder ---------- */
  const builder = $("vipBuilder");
  const infoDialog = $("infoDialog");
  const vip = { days: 7 };
  let infoAddon = null;

  const summarizeLanguages = (langs) => {
    const shown = langs.slice(0, 3).join(", ");
    return langs.length > 3 ? `${shown} +${langs.length - 3} more` : shown;
  };

  const addonBox = (id) =>
    builder.querySelector(`input[name="addon"][value="${id}"]`);

  function renderAddons() {
    $("addonList").replaceChildren(
      ...ADDONS.map((addon) => {
        const row = el("div", "addon-row");

        const label = el("label", "addon");
        const input = el("input");
        input.type = "checkbox";
        input.name = "addon";
        input.value = addon.id;

        const main = el("span", "addon-main");
        main.append(
          el("span", "addon-name", addon.name),
          el("small", "", addon.tagline),
          el(
            "small",
            "addon-langs",
            `Speaks: ${summarizeLanguages(addon.languages)}`,
          ),
        );

        const price = el(
          "span",
          "addon-price",
          `+${money.format(addon.perDay)} / day`,
        );
        label.append(input, main, price);

        const info = el("button", "addon-info");
        info.type = "button";
        info.setAttribute("aria-label", `About ${addon.name}`);
        const icon = el("i", "fa-solid fa-circle-info");
        icon.setAttribute("aria-hidden", "true");
        info.append(icon);
        info.addEventListener("click", () => openInfo(addon));

        row.append(label, info);
        return row;
      }),
    );
  }

  function openInfo(addon) {
    infoAddon = addon;
    const selected = addonBox(addon.id)?.checked;

    $("infoTitle").textContent = addon.name;
    $("infoPrice").textContent = `${money.format(addon.perDay)} per day`;
    $("infoDesc").textContent = addon.tagline;
    $("infoLangs").replaceChildren(
      ...addon.languages.map((lang) => el("li", "", lang)),
    );
    $("infoIncludes").replaceChildren(
      ...addon.includes.map((text) => el("li", "", text)),
    );
    $("infoNote").textContent = addon.note ?? DEFAULT_NOTE;
    $("infoAdd").textContent = selected
      ? "Remove from my stay"
      : "Add to my stay";

    infoDialog.showModal();
  }

  function updateVip() {
    const tier = builder.querySelector('input[name="tier"]:checked');
    if (!tier) return;

    const selected = [
      ...builder.querySelectorAll('input[name="addon"]:checked'),
    ]
      .map((box) => ADDONS.find((addon) => addon.id === box.value))
      .filter(Boolean);

    const perDay =
      Number(tier.dataset.perDay) +
      selected.reduce((sum, addon) => sum + addon.perDay, 0);

    $("sumTier").textContent = tier.dataset.name;
    $("sumAddons").textContent = selected.length
      ? selected.map((a) => a.name).join(", ")
      : "None";
    $("sumPerDay").textContent = `${money.format(perDay)} per day`;
    $("sumTotal").textContent = money.format(perDay * vip.days);
    $("daysOut").textContent = String(vip.days);
  }

  builder.addEventListener("change", updateVip);

  builder.querySelectorAll("[data-days]").forEach((button) => {
    button.addEventListener("click", () => {
      vip.days = Math.min(
        30,
        Math.max(1, vip.days + Number(button.dataset.days)),
      );
      updateVip();
    });
  });

  $("vipEnquire").addEventListener("click", () => {
    window.Bleet?.toast("A concierge will contact you to confirm this stay.");
  });

  /* Info window actions */
  $("infoClose").addEventListener("click", () => infoDialog.close());

  infoDialog.addEventListener("click", (event) => {
    if (event.target === infoDialog) infoDialog.close();
  });

  $("infoAdd").addEventListener("click", () => {
    if (!infoAddon) return;
    const box = addonBox(infoAddon.id);
    if (box) {
      box.checked = !box.checked;
      box.dispatchEvent(new Event("change", { bubbles: true }));
    }
    infoDialog.close();
  });

  /* ---------- Init ---------- */
  let order = 0;
  root.querySelectorAll("[data-split]").forEach((node) => {
    order = splitWords(node, order);
  });

  const destinationStat = $("statDestinations");
  destinationStat.dataset.count = String(CATALOG.length);
  destinationStat.textContent = "0";
  counterObserver.observe(destinationStat);

  root.querySelectorAll("[data-region]").forEach((button) => {
    button.addEventListener("click", () => {
      state.region = button.dataset.region;
      root.querySelectorAll("[data-region]").forEach((other) => {
        other.setAttribute("aria-pressed", String(other === button));
      });
      render();
    });
  });

  $("vipOnly").addEventListener("change", (event) => {
    state.vipOnly = event.target.checked;
    render();
  });

  $("sortBy").addEventListener("change", (event) => {
    state.sort = event.target.value;
    render();
  });

  /* Origin picker for the flight section */
  $("originSelect").replaceChildren(
    ...ORIGINS.map((origin) => {
      const option = el("option", "", `${origin.city} (${origin.code})`);
      option.value = origin.code;
      return option;
    }),
  );
  $("originSelect").addEventListener("change", () => {
    updateFlight();
    renderLinks(current);
  });

  $("detailClose").addEventListener("click", () => dialog.close());

  dialog.addEventListener("click", (event) => {
    if (event.target === dialog) dialog.close();
  });

  dialog.addEventListener("change", (event) => {
    if (event.target.name === "pkg") updateTotal();
  });

  $("detailReserve").addEventListener("click", () => {
    if (!current) return;
    const choice = dialog.querySelector('input[name="pkg"]:checked');
    const pkg = PACKAGES.find((p) => p.id === choice?.value);
    window.Bleet?.toast(
      isPrivate(current)
        ? "A concierge will contact you to arrange this experience."
        : `${pkg?.name ?? "Your"} package for ${current.name} is being reserved. We will confirm by email.`,
    );
  });

  $("reserveFlight").addEventListener("click", () => {
    const href = $("reserveFlight").dataset.href;
    if (href) window.location.href = href;
  });

  $("reserveLater").addEventListener("click", () => dialog.close());

  renderPrivate();
  render();
  renderAddons();
  updateVip();
})();
