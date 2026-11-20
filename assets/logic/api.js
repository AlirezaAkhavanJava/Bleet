/* =========================================
   BLEET — API CLIENT
   Same-origin fetch wrapper: CSRF header on writes, timeouts,
   typed errors, and a safe redirect helper.
   No tokens or passwords are ever stored in JavaScript.
   ========================================= */
(() => {
  "use strict";

  const API_BASE = "/api";
  const TIMEOUT_MS = 15000;

  const MESSAGES = {
    400: "Please check the form and try again.",
    401: "Please log in to continue.",
    403: "You don't have access to this page.",
    404: "We couldn't find that.",
    409: "That already exists.",
    429: "Too many attempts. Please wait a moment.",
  };

  class ApiError extends Error {
    constructor(message, status, fields = {}, retryAfter = 0) {
      super(message);
      this.name = "ApiError";
      this.status = status;
      this.fields = fields;
      this.retryAfter = retryAfter;
    }
  }

  const readCookie = (name) => {
    const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
    return match ? decodeURIComponent(match[1]) : "";
  };

  async function request(path, { method = "GET", body } = {}) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

    const headers = { Accept: "application/json" };
    if (body !== undefined) headers["Content-Type"] = "application/json";
    if (method !== "GET") headers["X-XSRF-TOKEN"] = readCookie("XSRF-TOKEN");

    let response;
    try {
      response = await fetch(API_BASE + path, {
        method,
        headers,
        body: body === undefined ? undefined : JSON.stringify(body),
        credentials: "same-origin",
        cache: "no-store",
        signal: controller.signal,
      });
    } catch (error) {
      throw new ApiError(
        error.name === "AbortError"
          ? "The server took too long to respond."
          : "Network problem. Check your connection.",
        0,
      );
    } finally {
      clearTimeout(timer);
    }

    const data =
      response.status === 204 ? null : await response.json().catch(() => null);

    if (!response.ok) {
      throw new ApiError(
        data?.detail ||
          MESSAGES[response.status] ||
          "Something went wrong. Please try again.",
        response.status,
        data?.errors ?? {},
        Number(response.headers.get("Retry-After")) || 0,
      );
    }

    return data;
  }

  const api = {
    get: (path) => request(path),
    post: (path, body) => request(path, { method: "POST", body }),
    patch: (path, body) => request(path, { method: "PATCH", body }),
    del: (path) => request(path, { method: "DELETE" }),
  };

  /* Only same-site .html paths are allowed after login, which blocks open redirects */
  const SAFE_PATH =
    /^\/?(?!\/)[A-Za-z0-9_\-./]+\.html(\?[A-Za-z0-9_\-.=&%]*)?$/;

  function safeNext(value, fallback = "account.html") {
    if (!value) return fallback;
    return SAFE_PATH.test(value) ? value : fallback;
  }

  window.Bleet = { ...(window.Bleet ?? {}), api, ApiError, safeNext };
})();
