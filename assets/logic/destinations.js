/* =========================================
   BLEET — DESTINATIONS CATALOGUE
   Filters, sorting, counters, cards, private collection,
   detail window and the VIP builder.
   Every value is written with textContent.
   Prices are sample values. The server calculates and confirms every price.
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
    // Wrapper handles the entrance animation; the card handles the hover lift
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

  function updateTotal() {
    if (!current) return;

    if (isPrivate(current)) {
      $("detailTotal").textContent =
        `${money.format(current.price)} ${current.unit}`;
      return;
    }

    const choice = dialog.querySelector('input[name="pkg"]:checked');
    const pkg = PACKAGES.find((p) => p.id === choice?.value) ?? PACKAGES[0];
    const total = Math.round(current.price * pkg.multiplier);
    $("detailTotal").textContent =
      `${money.format(total)} per person · ${current.nights} nights`;
  }

  function openDetail(item) {
    current = item;
    const priv = isPrivate(item);

    $("detailMedia").replaceChildren(photo(photoFile(item)));
    $("detailKicker").textContent = priv
      ? item.country
      : `${item.country} · ${TIER_LABEL[item.tier]}`;
    $("detailTitle").textContent = item.name;
    $("detailDesc").textContent = item.desc;
    $("detailHighlights").replaceChildren(
      ...item.highlights.map((text) => el("li", "", text)),
    );
    $("detailReserve").textContent = priv ? "Enquire" : "Reserve";
    $("packagesField").hidden = priv;

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
    }

    updateTotal();
    dialog.showModal();
  }

  /* ---------- VIP builder ---------- */
  const builder = $("vipBuilder");
  const vip = { days: 7 };

  function updateVip() {
    const tier = builder.querySelector('input[name="tier"]:checked');
    if (!tier) return;

    const addons = [...builder.querySelectorAll('input[name="addon"]:checked')];
    const perDay =
      Number(tier.dataset.perDay) +
      addons.reduce((sum, addon) => sum + Number(addon.dataset.perDay), 0);

    $("sumTier").textContent = tier.dataset.name;
    $("sumAddons").textContent = addons.length
      ? addons.map((a) => a.dataset.name).join(", ")
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

  $("detailClose").addEventListener("click", () => dialog.close());

  dialog.addEventListener("click", (event) => {
    if (event.target === dialog) dialog.close();
  });

  dialog.addEventListener("change", updateTotal);

  $("detailReserve").addEventListener("click", () => {
    if (!current) return;
    window.Bleet?.toast(
      isPrivate(current)
        ? "A concierge will contact you to confirm this experience."
        : `${current.name} reservations are coming soon.`,
    );
  });

  renderPrivate();
  render();
  updateVip();
})();
