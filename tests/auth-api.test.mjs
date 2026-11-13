import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { createServer } from "node:net";
import { after, before, test } from "node:test";
import path from "node:path";

let serverProcess;
let baseUrl;

async function getFreePort() {
  const server = createServer();
  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("Could not reserve a test port.");
  await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  return address.port;
}

before(async () => {
  const port = await getFreePort();
  baseUrl = `http://127.0.0.1:${port}`;
  const nextEntrypoint = path.join(process.cwd(), "node_modules", "next", "dist", "bin", "next");
  serverProcess = spawn(process.execPath, [nextEntrypoint, "start", "-p", String(port)], {
    cwd: process.cwd(),
    env: process.env,
    stdio: "ignore",
  });

  for (let attempt = 0; attempt < 80; attempt += 1) {
    if (serverProcess.exitCode !== null) {
      throw new Error(`Next.js test server exited with code ${serverProcess.exitCode}. Run npm run build first.`);
    }
    try {
      const response = await fetch(baseUrl, { signal: AbortSignal.timeout(1000) });
      if (response.ok) return;
    } catch {
      await new Promise((resolve) => setTimeout(resolve, 250));
    }
  }

  serverProcess.kill();
  throw new Error("Next.js test server did not become ready.");
});

after(async () => {
  if (!serverProcess || serverProcess.exitCode !== null) return;
  serverProcess.kill();
  await new Promise((resolve) => serverProcess.once("exit", resolve));
});

test("anonymous users cannot read outage, location, or report data", async () => {
  const requests = [
    fetch(`${baseUrl}/api/outages`),
    fetch(`${baseUrl}/api/areas/nearest?latitude=9.79&longitude=125.49`),
    fetch(`${baseUrl}/api/reports`),
  ];
  const responses = await Promise.all(requests);
  assert.deepEqual(responses.map((response) => response.status), [401, 401, 401]);
});

test("anonymous users cannot submit an outage report", async () => {
  const response = await fetch(`${baseUrl}/api/reports`, {
    method: "POST",
    body: new FormData(),
  });
  assert.equal(response.status, 401);
  assert.match((await response.json()).error, /sign in/i);
});
