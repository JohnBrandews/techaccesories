import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";

const API = "https://api.paystack.co";

export class PaystackUncertainError extends Error {}

function config() {
  const secret = process.env.PAYSTACK_SECRET_KEY?.trim();
  const subaccount = process.env.PAYSTACK_SUBACCOUNT_CODE?.trim();
  if (!secret || !secret.startsWith("sk_") || !subaccount) {
    throw new Error("Set a valid PAYSTACK_SECRET_KEY and PAYSTACK_SUBACCOUNT_CODE.");
  }
  return { secret, subaccount };
}

export function assertPaystackConfigured() { config(); }

export async function initializePaystackPayment({ email, amount, reference, callbackUrl, customerName, phone }: {
  email: string; amount: number; reference: string; callbackUrl: string; customerName: string; phone: string;
}) {
  const settings = config();
  let response: Response;
  try {
    response = await fetch(`${API}/transaction/initialize`, {
      method: "POST",
      headers: { Authorization: `Bearer ${settings.secret}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        email, amount: String(amount), currency: "KES", reference, callback_url: callbackUrl,
        subaccount: settings.subaccount,
        metadata: { order_reference: reference, customer_name: customerName, phone },
        // Omit channels so Paystack Checkout shows every payment method enabled for this account.
      }),
      cache: "no-store",
      signal: AbortSignal.timeout(20_000),
    });
  } catch {
    throw new PaystackUncertainError("Paystack could not be reached. The order may have been created; contact the store with your reference before retrying.");
  }
  const raw = await response.text();
  let result: { status?: unknown; message?: unknown; data?: { authorization_url?: unknown; reference?: unknown } } | null = null;
  try { result = JSON.parse(raw); } catch { /* Report a safe generic error below. */ }
  if (!response.ok || result?.status !== true || typeof result.data?.authorization_url !== "string") {
    console.error("Paystack transaction initialization failed", { httpStatus: response.status, message: typeof result?.message === "string" ? result.message.slice(0, 300) : raw.slice(0, 300) });
    throw new Error("Paystack could not start checkout. Verify the secret key, subaccount code, and account settings.");
  }
  return { authorizationUrl: result.data.authorization_url };
}

export async function verifyPaystackTransaction(reference: string) {
  const { secret, subaccount } = config();
  const response = await fetch(`${API}/transaction/verify/${encodeURIComponent(reference)}`, {
    headers: { Authorization: `Bearer ${secret}` }, cache: "no-store", signal: AbortSignal.timeout(15_000),
  });
  const result = await response.json().catch(() => null) as {
    status?: unknown; message?: unknown; data?: { status?: unknown; reference?: unknown; amount?: unknown; currency?: unknown; subaccount?: unknown; gateway_response?: unknown; id?: unknown };
  } | null;
  if (!response.ok || result?.status !== true || !result.data) throw new Error("Paystack transaction verification failed.");
  const data = result.data;
  const actualSubaccount = typeof data.subaccount === "string" ? data.subaccount : data.subaccount && typeof data.subaccount === "object" && "subaccount_code" in data.subaccount ? String((data.subaccount as { subaccount_code: unknown }).subaccount_code) : null;
  if (actualSubaccount && actualSubaccount !== subaccount) throw new Error("Paystack transaction subaccount does not match.");
  return {
    status: typeof data.status === "string" ? data.status : "",
    reference: typeof data.reference === "string" ? data.reference : "",
    amount: typeof data.amount === "number" ? data.amount : Number.NaN,
    currency: typeof data.currency === "string" ? data.currency : "",
    receipt: typeof data.id === "number" ? String(data.id) : null,
  };
}

export function verifyPaystackWebhookSignature(rawBody: string, received: string | null) {
  if (!received || !/^[a-f0-9]{128}$/i.test(received)) return false;
  const { secret } = config();
  const expected = Buffer.from(createHmac("sha512", secret).update(rawBody).digest("hex"), "hex");
  const supplied = Buffer.from(received, "hex");
  return timingSafeEqual(expected, supplied);
}
