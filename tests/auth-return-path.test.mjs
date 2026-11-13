import assert from "node:assert/strict";
import test from "node:test";
import { authHref, safeReturnPath } from "../src/lib/auth/return-path.mjs";

test("keeps protected destinations and report intent through authentication", () => {
  const destination = "/?tab=map&report=1";
  assert.equal(safeReturnPath(destination), destination);
  assert.equal(authHref("/login", destination), "/login?next=%2F%3Ftab%3Dmap%26report%3D1");
  assert.equal(authHref("/register", destination), "/register?next=%2F%3Ftab%3Dmap%26report%3D1");
});

test("allows protected route return paths", () => {
  assert.equal(safeReturnPath("/notifications"), "/notifications");
  assert.equal(safeReturnPath("/reports?report=1"), "/reports?report=1");
});

test("rejects external and malformed return paths", () => {
  assert.equal(safeReturnPath("https://example.com"), "/");
  assert.equal(safeReturnPath("//example.com"), "/");
  assert.equal(safeReturnPath("/\\example.com"), "/");
  assert.equal(safeReturnPath(null), "/");
});
