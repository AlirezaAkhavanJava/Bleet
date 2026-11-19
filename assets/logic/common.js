/* =========================================
   BLEET — SHARED BEHAVIOUR
   Runs on every page: mobile menu, header shadow,
   scroll reveal, toast notifications.
   ========================================= */
(() => {
  "use strict";

  // Enables CSS that only hides content when JavaScript is available
  document.documentElement.classList.add("js");

  /* Mobile menu */
  const toggle = document.querySelector(".menu-toggle");
  const nav = document.getElementById("mainNav");

  if (toggle && nav) {
    const setOpen = (open) => {
      toggle.setAttribute("aria-expanded", String(open));
      toggle.setAttribute("aria-label", open ? "Close menu" : "Open menu");
      nav.classList.toggle("is-open", open);
    };

    toggle.addEventListener("click", () => {
      setOpen(toggle.getAttribute("aria-expanded") !== "true");
    });

    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape") setOpen(false);
    });

    document.addEventListener("click", (event) => {
      if (!nav.contains(event.target) && !toggle.contains(event.target)) {
        setOpen(false);
      }
    });
  }

  /* Header shadow once the page scrolls */
  const header = document.querySelector(".site-header");
  if (header) {
    const onScroll = () =>
      header.classList.toggle("is-scrolled", window.scrollY > 8);
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
  }

  /* Scroll reveal */
  const revealItems = document.querySelectorAll(".reveal");

  if ("IntersectionObserver" in window) {
    const observer = new IntersectionObserver(
      (entries, obs) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          entry.target.classList.add("is-visible");
          obs.unobserve(entry.target);
        });
      },
      { threshold: 0.12, rootMargin: "0px 0px -40px 0px" },
    );
    revealItems.forEach((item) => observer.observe(item));
  } else {
    revealItems.forEach((item) => item.classList.add("is-visible"));
  }

  /* Toast: window.Bleet.toast("message") */
  const toastEl = document.createElement("div");
  toastEl.className = "toast";
  toastEl.setAttribute("role", "status");
  toastEl.setAttribute("aria-live", "polite");
  document.body.append(toastEl);

  let hideTimer;
  const toast = (message) => {
    toastEl.textContent = message;
    toastEl.classList.add("is-visible");
    clearTimeout(hideTimer);
    hideTimer = setTimeout(() => toastEl.classList.remove("is-visible"), 2800);
  };

  window.Bleet = { ...(window.Bleet ?? {}), toast };
})();
