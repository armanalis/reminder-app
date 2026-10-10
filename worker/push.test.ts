import { describe, expect, it } from "vitest";
import { parseVapidKey } from "./push";

const jwk = { kty: "EC", crv: "P-256", d: "abc", x: "x", y: "y" };
const raw = JSON.stringify(jwk);

describe("parseVapidKey", () => {
  it("accepts plain JSON", () => expect(parseVapidKey(raw)).toEqual(jwk));
  it("strips single quotes and whitespace", () => expect(parseVapidKey(`  '${raw}'\n`)).toEqual(jwk));
  it("accepts a JSON-encoded string", () => expect(parseVapidKey(JSON.stringify(raw))).toEqual(jwk));
  it("accepts the whole .dev.vars line", () => expect(parseVapidKey(`VAPID_PRIVATE_KEY='${raw}'`)).toEqual(jwk));
  it("rejects missing, truncated or wrong keys", () => {
    expect(parseVapidKey(undefined)).toBeNull();
    expect(parseVapidKey(raw.slice(0, 40))).toBeNull();
    expect(parseVapidKey(JSON.stringify({ kty: "RSA" }))).toBeNull();
  });
});
