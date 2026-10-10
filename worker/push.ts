import { buildPushHTTPRequest } from "@pushforge/builder";

export type PushPayload = {
  title: string;
  body: string;
  tag?: string;
  data?: Record<string, string>;
  actions?: { action: string; title: string }[];
};

export type SendResult = "sent" | "gone" | "failed";

/**
 * VAPID anahtarını okur. `wrangler secret put` ile yapıştırırken tırnak, boşluk ya da
 * .dev.vars satırının tamamı gelebiliyor; bunları temizler. Geçersizse null döner.
 */
export function parseVapidKey(raw: string | undefined): JsonWebKey | null {
  if (!raw) return null;
  let s = raw.trim().replace(/^VAPID_PRIVATE_KEY\s*=\s*/, "");
  for (let i = 0; i < 2 && typeof s === "string"; i++) {
    try {
      const v: unknown = JSON.parse(s);
      if (typeof v === "string") {
        s = v; // JSON içinde JSON: '"{...}"'
        continue;
      }
      const jwk = v as JsonWebKey;
      return jwk && jwk.kty === "EC" && typeof jwk.d === "string" ? jwk : null;
    } catch {
      const unquoted = s.replace(/^'(.*)'$/s, "$1");
      if (unquoted === s) return null;
      s = unquoted;
    }
  }
  return null;
}

export async function sendPush(env: Env, subscriptionJson: string, payload: PushPayload): Promise<SendResult> {
  const privateJWK = parseVapidKey(env.VAPID_PRIVATE_KEY);
  if (!privateJWK) {
    console.error("push error: VAPID_PRIVATE_KEY missing or invalid — run `npx wrangler secret put VAPID_PRIVATE_KEY`");
    return "failed";
  }
  try {
    const { endpoint, headers, body } = await buildPushHTTPRequest({
      privateJWK,
      subscription: JSON.parse(subscriptionJson),
      message: {
        payload,
        adminContact: env.VAPID_SUBJECT,
        options: { ttl: 3600, urgency: "high", topic: payload.tag },
      },
    });
    const res = await fetch(endpoint, { method: "POST", headers, body });
    if (res.status === 404 || res.status === 410) return "gone";
    if (!res.ok) {
      console.error("push failed", res.status, await res.text());
      return "failed";
    }
    return "sent";
  } catch (err) {
    console.error("push error", err);
    return "failed";
  }
}
