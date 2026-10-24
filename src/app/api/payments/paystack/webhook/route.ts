import { NextResponse } from "next/server";
import { settlePaystackOrder } from "@/lib/paystack-settlement";
import { verifyPaystackTransaction, verifyPaystackWebhookSignature } from "@/lib/paystack";

export async function POST(request: Request) {
  const rawBody = await request.text();
  if (!verifyPaystackWebhookSignature(rawBody, request.headers.get("x-paystack-signature"))) {
    return NextResponse.json({ error: "Invalid signature." }, { status: 401 });
  }
  let event: { event?: unknown; data?: { reference?: unknown } };
  try { event = JSON.parse(rawBody) as typeof event; }
  catch { return NextResponse.json({ error: "Invalid payload." }, { status: 400 }); }
  if (event.event !== "charge.success" && event.event !== "charge.failed") return NextResponse.json({ received: true });
  const reference = typeof event.data?.reference === "string" ? event.data.reference : "";
  if (!/^MT-[A-Z0-9]+-[A-F0-9]{6}$/.test(reference)) return NextResponse.json({ received: true });
  try {
    const payment = await verifyPaystackTransaction(reference);
    if (payment.reference !== reference) return NextResponse.json({ error: "Reference mismatch." }, { status: 400 });
    const result = await settlePaystackOrder(payment, new URL(request.url).origin);
    if (result === "mismatch") return NextResponse.json({ error: "Amount or currency mismatch." }, { status: 400 });
    if (result === "missing") return NextResponse.json({ error: "Order not found." }, { status: 404 });
  } catch (error) {
    console.error("Paystack webhook processing failed", { reference, error: error instanceof Error ? error.message : "Unknown error" });
    return NextResponse.json({ error: "Webhook processing failed." }, { status: 500 });
  }
  return NextResponse.json({ received: true });
}
