import { prisma } from "@/lib/prisma";
import { sendPaidOrderNotifications } from "@/lib/order-notifications";
import type { verifyPaystackTransaction } from "@/lib/paystack";

type VerifiedPayment = Awaited<ReturnType<typeof verifyPaystackTransaction>>;

export async function settlePaystackOrder(payment: VerifiedPayment, origin: string) {
  if (!payment.reference) return "missing" as const;
  const outcome = await prisma.$transaction(async tx => {
    const order = await tx.order.findUnique({ where: { reference: payment.reference }, include: { items: true } });
    if (!order || order.paymentMethod !== "paystack") return { state: "missing" as const };
    if (order.paymentStatus !== "pending") return { state: "processed" as const };

    if (payment.status.toLowerCase() === "success") {
      if (payment.amount !== order.totalMinor || payment.currency.toUpperCase() !== "KES") return { state: "mismatch" as const };
      const updated = await tx.order.updateMany({ where: { reference: order.reference, paymentStatus: "pending" }, data: {
        paymentStatus: "paid", paymentProviderReference: payment.reference, paymentReceipt: payment.receipt,
      } });
      return { state: updated.count ? "paid" as const : "processed" as const, order: { ...order, paymentStatus: "paid", paymentReceipt: payment.receipt } };
    }

    if (["failed", "abandoned"].includes(payment.status.toLowerCase())) {
      const updated = await tx.order.updateMany({ where: { reference: order.reference, paymentStatus: "pending" }, data: { paymentStatus: "failed", status: "cancelled" } });
      if (!updated.count) return { state: "processed" as const };
      for (const item of order.items) {
        const product = await tx.product.findUnique({ where: { id: item.productId }, select: { stockQuantity: true } });
        if (!product) continue;
        await tx.product.update({ where: { id: item.productId }, data: { stockQuantity: { increment: item.quantity } } });
        await tx.inventoryMovement.create({ data: { productId: item.productId, delta: item.quantity, previous: product.stockQuantity, next: product.stockQuantity + item.quantity, reason: `Paystack payment failed ${order.reference}` } });
      }
      return { state: "failed" as const };
    }
    return { state: "pending" as const };
  }, { maxWait: 10_000, timeout: 15_000 });

  if (outcome.state === "paid") await sendPaidOrderNotifications(outcome.order, origin);
  return outcome.state;
}
