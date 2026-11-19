/* =========================================
   BLEET — INNER PAGES
   Renders page.html?p=<key>. Add a key here to add a page.
   ========================================= */
(() => {
  "use strict";

  const PAGES = {
    trains: {
      title: "Trains",
      eyebrow: "Coming soon",
      text: "Search and book rail tickets across partner networks.",
    },
    buses: {
      title: "Buses",
      eyebrow: "Coming soon",
      text: "Compare intercity coaches and book seats in a few taps.",
    },
    hotels: {
      title: "Hotels",
      eyebrow: "Coming soon",
      text: "Find stays near your destination at transparent prices.",
    },
    tours: {
      title: "Tours",
      eyebrow: "Coming soon",
      text: "Guided days out and small-group experiences in one place.",
    },
    visa: {
      title: "Visa",
      eyebrow: "Coming soon",
      text: "Check visa requirements for your route before you book.",
    },
    "agency-panel": {
      title: "Agency Panel",
      eyebrow: "For partners",
      text: "Manage bookings, clients and commissions from one dashboard.",
    },
    more: {
      title: "More Services",
      eyebrow: "Explore",
      text: "Travel extras and add-ons, all in one place.",
    },
    login: {
      title: "Log in",
      eyebrow: "Your account",
      text: "Sign in to manage your bookings.",
      form: "login",
    },
    support: {
      title: "Support",
      eyebrow: "Available 24/7",
      text: "Send us a message and our team will get back to you.",
      form: "contact",
    },
    about: {
      title: "About Us",
      eyebrow: "Company",
      text: "Bleet makes every journey simpler.",
    },
    careers: {
      title: "Careers",
      eyebrow: "Company",
      text: "No open roles right now. Check back soon.",
    },
    contact: {
      title: "Contact Us",
      eyebrow: "Company",
      text: "Tell us what you need and we'll reply.",
      form: "contact",
    },
    partner: {
      title: "Become a Partner",
      eyebrow: "Company",
      text: "Bring your airline, hotel or agency onto Bleet.",
    },
    help: {
      title: "Help Center",
      eyebrow: "Support",
      text: "Answers to the most common questions.",
    },
    "booking-info": {
      title: "Booking Information",
      eyebrow: "Support",
      text: "How bookings, payments and confirmations work.",
    },
    cancellation: {
      title: "Cancellation Policy",
      eyebrow: "Support",
      text: "Understand refunds and changes before you travel.",
    },
    privacy: {
      title: "Privacy Policy",
      eyebrow: "Legal",
      text: "How we collect, use and protect your data.",
    },
    guides: {
      title: "Travel Guides",
      eyebrow: "Inspiration",
      text: "Destination guides are on their way.",
    },
    notfound: {
      title: "Page not found",
      eyebrow: "404",
      text: "The page you're looking for doesn't exist.",
      note: "Check the address or head back to the home page.",
    },
  };

  const FORMS = {
    login: {
      submit: "Log in",
      success:
        "Login isn't connected yet. This form will call the API once the backend is ready.",
      fields: [
        { name: "email", label: "Email", type: "email", autocomplete: "email" },
        {
          name: "password",
          label: "Password",
          type: "password",
          autocomplete: "current-password",
        },
      ],
    },
    contact: {
      submit: "Send message",
      success:
        "Thanks! Your message is ready to send once the backend is connected.",
      fields: [
        {
          name: "name",
          label: "Full name",
          type: "text",
          autocomplete: "name",
        },
        { name: "email", label: "Email", type: "email", autocomplete: "email" },
        {
          name: "message",
          label: "How can we help?",
          multiline: true,
          minLength: 10,
        },
      ],
    },
  };

  const el = (tag, className, text) => {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  };

  function buildForm(config) {
    const form = el("form", "card form-stack");
    form.noValidate = true;

    config.fields.forEach((field) => {
      const wrap = el("div", "form-field");

      const label = el("label", "", field.label);
      label.htmlFor = field.name;

      const input = field.multiline ? el("textarea") : el("input");
      if (!field.multiline) input.type = field.type;
      input.id = field.name;
      input.name = field.name;
      input.required = true;
      if (field.minLength) input.minLength = field.minLength;
      if (field.autocomplete) input.autocomplete = field.autocomplete;

      const error = el("p", "form-error");
      error.setAttribute("aria-live", "polite");

      wrap.append(label, input, error);
      form.append(wrap);
    });

    const submit = el(
      "button",
      "btn btn-primary btn-lg btn-block",
      config.submit,
    );
    submit.type = "submit";
    form.append(submit);

    form.addEventListener("submit", (event) => {
      event.preventDefault();

      let firstInvalid = null;

      form.querySelectorAll(".form-field").forEach((wrap) => {
        const input = wrap.querySelector("input, textarea");
        const valid = input.checkValidity();

        wrap.classList.toggle("is-invalid", !valid);
        wrap.querySelector(".form-error").textContent = valid
          ? ""
          : input.validationMessage;

        if (!valid && !firstInvalid) firstInvalid = input;
      });

      if (firstInvalid) {
        firstInvalid.focus();
        return;
      }

      // TODO: send to the backend here. Never store passwords in JavaScript or localStorage.
      window.Bleet?.toast(config.success);
      form.reset();
    });

    return form;
  }

  /* Render */
  const key = new URLSearchParams(location.search).get("p");
  const page = PAGES[key] ?? PAGES.notfound;

  document.title = `${page.title} · Bleet`;
  document.getElementById("pageEyebrow").textContent = page.eyebrow;
  document.getElementById("pageTitle").textContent = page.title;
  document.getElementById("pageText").textContent = page.text;

  const body = document.getElementById("pageBody");

  if (page.form) {
    body.append(buildForm(FORMS[page.form]));
  } else {
    const card = el("div", "card");
    card.append(
      el(
        "p",
        "muted",
        page.note ??
          "This section is on the way. In the meantime, search flights from the home page.",
      ),
      Object.assign(el("a", "btn btn-primary btn-block", "Back to home"), {
        href: "index.html",
      }),
    );
    body.append(card);
  }
})();
