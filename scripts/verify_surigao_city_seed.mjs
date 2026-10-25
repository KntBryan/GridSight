import { readFileSync } from "node:fs";

const env = Object.fromEntries(
  readFileSync(".env.local", "utf8")
    .split(/\r?\n/)
    .filter((line) => line.includes("="))
    .map((line) => {
      const separator = line.indexOf("=");
      return [line.slice(0, separator), line.slice(separator + 1)];
    }),
);

const expectedCodes = [...readFileSync("src/lib/surigao-city-barangays.ts", "utf8").matchAll(/code: "([^"]+)"/g)]
  .map((match) => match[1]);
const url = new URL("/rest/v1/areas", env.NEXT_PUBLIC_SUPABASE_URL);
url.search = new URLSearchParams({
  select: "psgc_code,name",
  area_type: "eq.barangay",
  city: "eq.Surigao City",
}).toString();

const response = await fetch(url, {
  headers: {
    apikey: env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    Prefer: "count=exact",
    Range: "0-999",
  },
});

if (!response.ok) {
  console.error(`Supabase query failed with HTTP ${response.status}.`);
  process.exit(1);
}

const rows = await response.json();
const presentCodes = new Set(rows.map((row) => row.psgc_code));
const missingCodes = expectedCodes.filter((code) => !presentCodes.has(code));
const extraRows = rows.filter((row) => !expectedCodes.includes(row.psgc_code));

console.log(`Expected barangays: ${expectedCodes.length}`);
console.log(`Found in Supabase: ${rows.length}`);
console.log(`Missing PSGC codes: ${missingCodes.length ? missingCodes.join(", ") : "none"}`);
console.log(`Unexpected rows: ${extraRows.length}`);

const lookupUrl = new URL("/rest/v1/rpc/find_barangay_at_location", env.NEXT_PUBLIC_SUPABASE_URL);
const lookupHeaders = {
  apikey: env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  "Content-Type": "application/json",
};
const inCityResponse = await fetch(lookupUrl, {
  method: "POST",
  headers: lookupHeaders,
  body: JSON.stringify({ p_latitude: 9.88245198, p_longitude: 125.51931173 }),
});
const inCityResult = inCityResponse.ok ? await inCityResponse.json() : null;
const inCityMatches = Array.isArray(inCityResult) && inCityResult[0]?.name === "Alang-alang";

const outsideCityResponse = await fetch(lookupUrl, {
  method: "POST",
  headers: lookupHeaders,
  body: JSON.stringify({ p_latitude: 14.5995, p_longitude: 120.9842 }),
});
const outsideCityResult = outsideCityResponse.ok ? await outsideCityResponse.json() : null;
const outsideCityRejected = Array.isArray(outsideCityResult) && outsideCityResult.length === 0;

console.log(`In-city GPS lookup: ${inCityResponse.status} ${inCityMatches ? "matched Alang-alang" : "unexpected result"}`);
console.log(`Outside-city GPS lookup: ${outsideCityResponse.status} ${outsideCityRejected ? "correctly returned no barangay" : "unexpected result"}`);

if (missingCodes.length || extraRows.length || !inCityMatches || !outsideCityRejected) {
  process.exitCode = 1;
}
