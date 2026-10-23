import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";

const PAYHERO_API = "https://backend.payhero.co.ke/api/v2";

export class PayHeroUncertainError extends Error {}

function config() {
  const token = process.env.PAYHERO_BASIC_TOKEN?.trim();
  const channelId = Number(process.env.PAYHERO_CHANNEL_ID);
  const callback = process.env.PAYHERO_CALLBACK_URL?.trim();
  if (!token || !Number.isSafeInteger(channelId) || channelId < 1 || !callback) {
    throw new Error("PayHero is not configured. Set PAYHERO_BASIC_TOKEN, PAYHERO_CHANNEL_ID, and PAYHERO_CALLBACK_URL.");
  }
  let callbackUrl: URL;
  try { callbackUrl = new URL(callback); } catch { throw new Error("PAYHERO_CALLBACK_URL must be a valid HTTPS URL."); }
  if (callbackUrl.protocol !== "https:") throw new Error("PAYHERO_CALLBACK_URL must use HTTPS.");
  if (callbackUrl.pathname === "/") callbackUrl.pathname = "/api/payments/payhero/callback";
  // PayHero's API key is normally the base64 part of a Basic auth header.
  // Also accept a raw username:password pair to make Vercel env setup less error-prone.
  const credential = token.replace(/^Basic\s+/i, "");
  const basicToken = credential.includes(":") ? Buffer.from(credential).toString("base64") : credential;
  return { token: basicToken, channelId, callbackUrl };
}

export function assertPayHeroConfigured() { config(); }

function signature(reference: string, token: string) {
  return createHmac("sha256", token).update(`payhero:${reference}`).digest("hex");
}

export function verifyPayHeroCallbackSignature(reference: string, received: string | null) {
  if (!received || !/^[a-f0-9]{64}$/i.test(received)) return false;
  const expected = Buffer.from(signature(reference, config().token), "hex");
  const supplied = Buffer.from(received, "hex");
  return expected.length === supplied.length && timingSafeEqual(expected, supplied);
}

export function normalizeKenyanPhone(value: string) {
  const digits = value.replace(/[\s()-]/g, "").replace(/^\+/, "");
  const national = digits.startsWith("254") ? digits.slice(3) : digits.startsWith("0") ? digits.slice(1) : "";
  if (!/^([17])\d{8}$/.test(national)) return null;
  return `254${national}`;
}

export async function requestPayHeroStk({ amount, phone, reference, customerName }: { amount: number; phone: string; reference: string; customerName: string }) {
  const settings = config();
  const callbackUrl = new URL(settings.callbackUrl);
  callbackUrl.searchParams.set("reference", reference);
  callbackUrl.searchParams.set("signature", signature(reference, settings.token));

  let response: Response;
  try {
    response = await fetch(`${PAYHERO_API}/payments`, {
      method: "POST",
      headers: { Authorization: `Basic ${settings.token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ amount, phone_number: phone, channel_id: settings.channelId, provider: "m-pesa", external_reference: reference, customer_name: customerName, callback_url: callbackUrl.toString() }),
      cache: "no-store",
      signal: AbortSignal.timeout(20_000),
    });
  } catch {
    throw new PayHeroUncertainError("We could not confirm whether PayHero received the request.");
  }

  const responseText = await response.text();
  let payload: { success?: unknown; status?: unknown; reference?: unknown; CheckoutRequestID?: unknown; error?: unknown; message?: unknown; detail?: unknown } | null = null;
  try { payload = JSON.parse(responseText); } catch { /* Some gateway errors are not JSON. */ }
  if (!response.ok || payload?.success !== true) {
    const providerError = [payload?.error, payload?.message, payload?.detail]
      .find((value): value is string => typeof value === "string");
    console.error("PayHero rejected STK request", {
      httpStatus: response.status,
      providerStatus: typeof payload?.status === "string" || typeof payload?.status === "number" ? payload.status : undefined,
      providerError: providerError?.slice(0, 300) ?? (!payload ? responseText.slice(0, 300) : undefined),
    });
    throw new Error("PayHero could not start the M-Pesa prompt. Check the phone number and payment settings, then try again.");
  }
  return {
    status: typeof payload.status === "string" ? payload.status : "QUEUED",
    providerReference: typeof payload.reference === "string" ? payload.reference : null,
    checkoutRequestId: typeof payload.CheckoutRequestID === "string" ? payload.CheckoutRequestID : null,
  };
}
