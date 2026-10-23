import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendPaidOrderNotifications } from "@/lib/order-notifications";
import { verifyPayHeroCallbackSignature } from "@/lib/payhero";

export async function POST(request: Request) {
  const url = new URL(request.url);
  const reference = url.searchParams.get("reference") ?? "";
  if (!/^MT-[A-Z0-9]+-[A-F0-9]{6}$/.test(reference) || !verifyPayHeroCallbackSignature(reference, url.searchParams.get("signature"))) {
    return NextResponse.json({ error: "Unauthorized callback." }, { status: 401 });
  }

  let body: { status?: unknown; response?: Record<string, unknown> };
  try { body = await request.json() as typeof body; }
  catch { return NextResponse.json({ error: "Invalid callback." }, { status: 400 }); }
  const payment = body.response;
  if (!payment || payment.ExternalReference !== reference) return NextResponse.json({ error: "Callback reference mismatch." }, { status: 400 });

  const successful = body.status === true && String(payment.Status ?? "").toLowerCase() === "success" && Number(payment.ResultCode) === 0;
  const result = await prisma.$transaction(async tx => {
    const order = await tx.order.findUnique({ where: { reference }, include: { items: true } });
    if (!order || order.paymentMethod !== "payhero") return { outcome: "missing" as const };
    if (order.paymentStatus !== "pending") return { outcome: "already-processed" as const };
    if (successful) {
      const expectedAmount = order.totalMinor / 100;
      if (!Number.isInteger(expectedAmount) || Number(payment.Amount) !== expectedAmount) return { outcome: "amount-mismatch" as const };
      const updated = await tx.order.updateMany({ where: { reference, paymentStatus: "pending" }, data: { paymentStatus: "paid", paymentReceipt: typeof payment.MpesaReceiptNumber === "string" ? payment.MpesaReceiptNumber.slice(0, 80) : null, paymentCheckoutRequestId: typeof payment.CheckoutRequestID === "string" ? payment.CheckoutRequestID.slice(0, 100) : order.paymentCheckoutRequestId } });
      if (updated.count !== 1) return { outcome: "already-processed" as const };
      return { outcome: "paid" as const, order: { ...order, paymentStatus: "paid", paymentReceipt: typeof payment.MpesaReceiptNumber === "string" ? payment.MpesaReceiptNumber.slice(0, 80) : null } };
    }

    const updated = await tx.order.updateMany({ where: { reference, paymentStatus: "pending" }, data: { paymentStatus: "failed", status: "cancelled" } });
    if (updated.count !== 1) return { outcome: "already-processed" as const };
    for (const item of order.items) {
      const product = await tx.product.findUnique({ where: { id: item.productId }, select: { stockQuantity: true } });
      if (!product) continue;
      await tx.product.update({ where: { id: item.productId }, data: { stockQuantity: { increment: item.quantity } } });
      await tx.inventoryMovement.create({ data: { productId: item.productId, delta: item.quantity, previous: product.stockQuantity, next: product.stockQuantity + item.quantity, reason: `PayHero payment failed ${reference}` } });
    }
    return { outcome: "failed" as const };
  });

  if (result.outcome === "missing") return NextResponse.json({ error: "Order not found." }, { status: 404 });
  if (result.outcome === "amount-mismatch") return NextResponse.json({ error: "Callback amount does not match order." }, { status: 400 });
  if (result.outcome === "paid") {
    await sendPaidOrderNotifications(result.order, new URL(request.url).origin);
  }
  return NextResponse.json({ ok: true });
}
