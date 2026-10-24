import { NextResponse } from "next/server";
import { settlePaystackOrder } from "@/lib/paystack-settlement";
import { verifyPaystackTransaction } from "@/lib/paystack";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const reference = url.searchParams.get("reference") ?? url.searchParams.get("trxref") ?? "";
  if (!/^MT-[A-Z0-9]+-[A-F0-9]{6}$/.test(reference)) return NextResponse.redirect(new URL("/checkout?payment=invalid", url.origin));
  try {
    const payment = await verifyPaystackTransaction(reference);
    if (payment.reference !== reference) throw new Error("Paystack returned a different transaction reference.");
    const result = await settlePaystackOrder(payment, url.origin);
    if (result === "mismatch" || result === "missing") console.error("Paystack callback could not settle order", { reference, result });
  } catch (error) {
    console.error("Paystack callback verification failed", { reference, error: error instanceof Error ? error.message : "Unknown error" });
  }
  return NextResponse.redirect(new URL(`/orders/confirmed?reference=${encodeURIComponent(reference)}`, url.origin));
}
