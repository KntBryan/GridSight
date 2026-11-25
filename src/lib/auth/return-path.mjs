const appOrigin = "https://gridsight.invalid";

/**
 * Validates and sanitizes a post-login return URL path to prevent open redirect vulnerabilities.
 *
 * @param {string | null | undefined} value - Candidate redirect path.
 * @returns {string} Safe relative path or root `'/'` fallback.
 *
 * @remarks
 * Enforces:
 * - Must start with a single `/` (rejects scheme-relative `//` and backslash `\` Windows path bypasses).
 * - Must resolve to the identical origin when parsed with dummy base URL.
 */
export function safeReturnPath(value) {
  if (
    typeof value !== "string" ||
    !value.startsWith("/") ||
    value.startsWith("//") ||
    value.includes("\\")
  ) {
    return "/";
  }

  try {
    const destination = new URL(value, appOrigin);
    if (destination.origin !== appOrigin) return "/";
    return `${destination.pathname}${destination.search}${destination.hash}`;
  } catch {
    return "/";
  }
}

/**
 * Builds a secure authentication link with encoded `next` destination parameter.
 *
 * @param {"/login" | "/register"} route - Target authentication page.
 * @param {string | null | undefined} returnTo - Intended post-login destination URL path.
 * @returns {string} Formatted authentication URI with sanitized redirect parameter.
 */
export function authHref(route, returnTo) {
  const authRoute = route === "/register" ? "/register" : "/login";
  return `${authRoute}?next=${encodeURIComponent(safeReturnPath(returnTo))}`;
}
