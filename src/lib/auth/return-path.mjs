const appOrigin = "https://gridsight.invalid";

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

export function authHref(route, returnTo) {
  const authRoute = route === "/register" ? "/register" : "/login";
  return `${authRoute}?next=${encodeURIComponent(safeReturnPath(returnTo))}`;
}
