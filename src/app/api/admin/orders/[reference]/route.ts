import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminRequest } from "@/lib/admin-api";
import { emailButton, emailLayout, emailParagraph, publicSiteUrl, sendTransactionalEmail } from "@/lib/email";

const statuses = ["pending", "dispatched", "delivered", "completed", "cancelled"] as const;
type OrderStatus = typeof statuses[number];

class OrderUpdateError extends Error {}

function statusCopy(status: OrderStatus) {
  switch (status) {
    case "pending": return { label: "pending", detail: "Your order is awaiting fulfilment." };
    case "dispatched": return { label: "dispatched", detail: "Your order is on its way. We’ll let you know when it has been delivered." };
    case "delivered": return { label: "delivered", detail: "Your order is marked as delivered. Thank you for shopping with Mahir Technology." };
    case "completed": return { label: "completed", detail: "Your order is complete. Thank you for shopping with Mahir Technology." };
    case "cancelled": return { label: "cancelled", detail: "Your order has been cancelled. Contact customer care if you have questions." };
  }
}

async function sendStatusEmail({ reference, email, customerName, status, siteUrl }: {
  reference: string; email: string; customerName: string; status: OrderStatus; siteUrl: string;
}) {
  const { label, detail } = statusCopy(status);
  const trackingUrl = `${siteUrl}/orders?reference=${encodeURIComponent(reference)}&email=${encodeURIComponent(email)}`;
  const text = `Hi ${customerName},\n\nYour order ${reference} status has been updated to ${label}. ${detail}\n\nTrack your order here: ${trackingUrl}`;
  const html = emailLayout(`<h1 style="color:#12345a">Your order status was updated</h1>${emailParagraph(`Hi ${customerName}, order ${reference} is now ${label}.`)}${emailParagraph(detail)}${emailButton("Track your order", trackingUrl)}`);
  await sendTransactionalEmail({ to: email, name: customerName, subject: `Order ${reference} ${label}`, text, html });
}

export async function PATCH(request: Request, { params }: { params: Promise<{ reference: string }> }) {
  const auth = requireAdminRequest(request);
  if (auth) return auth;

  const { reference } = await params;
  let requestedStatus: unknown;
  try {
    requestedStatus = (await request.json() as { status?: unknown }).status;
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }
  if (typeof requestedStatus !== "string" || !statuses.includes(requestedStatus as OrderStatus)) {
    return NextResponse.json({ error: "Choose pending, dispatched, delivered, completed or cancelled." }, { status: 400 });
  }

  const status = requestedStatus as OrderStatus;
  const order = await prisma.order.findUnique({
    where: { reference },
    select: { id: true, email: true, customerName: true, status: true, paymentStatus: true },
  });
  if (!order) return NextResponse.json({ error: "Order not found." }, { status: 404 });
  if (order.status === status) return NextResponse.json({ ok: true, unchanged: true });

  try {
    if (status === "cancelled") {
      await prisma.$transaction(async tx => {
        const current = await tx.order.findUnique({ where: { id: order.id }, include: { items: true } });
        if (!current) throw new OrderUpdateError("Order not found.");
        if (current.status !== "pending" || current.paymentStatus !== "pending") {
          throw new OrderUpdateError("Only unpaid pending demo orders can be cancelled here.");
        }
        const changed = await tx.order.updateMany({
          where: { id: current.id, status: "pending", paymentStatus: "pending" },
          data: { status },
        });
        if (changed.count !== 1) throw new OrderUpdateError("Order status changed. Reload and try again.");

        for (const item of current.items) {
          const product = await tx.product.findUnique({ where: { id: item.productId }, select: { stockQuantity: true } });
          if (!product) throw new OrderUpdateError("A product for this order could not be restored to inventory.");
          const next = product.stockQuantity + item.quantity;
          await tx.product.update({ where: { id: item.productId }, data: { stockQuantity: { increment: item.quantity } } });
          await tx.inventoryMovement.create({ data: { productId: item.productId, delta: item.quantity, previous: product.stockQuantity, next, reason: `Cancelled order ${reference}` } });
        }
      });
    } else {
      const changed = await prisma.order.updateMany({ where: { id: order.id, status: order.status }, data: { status } });
      if (!changed.count) return NextResponse.json({ error: "Order status changed. Reload and try again." }, { status: 409 });
    }
  } catch (error) {
    if (error instanceof OrderUpdateError) {
      const notFound = error.message === "Order not found.";
      return NextResponse.json({ error: error.message }, { status: notFound ? 404 : 409 });
    }
    return NextResponse.json({ error: status === "cancelled" ? "Could not cancel the order." : "Could not update the order." }, { status: 500 });
  }

  const siteUrl = publicSiteUrl(new URL(request.url).origin);
  try {
    await sendStatusEmail({ reference, email: order.email, customerName: order.customerName, status, siteUrl });
    return NextResponse.json({ ok: true, emailSent: true });
  } catch (error) {
    console.error("Order status email could not be sent:", error instanceof Error ? error.message : "Unknown email error");
    return NextResponse.json({ ok: true, emailSent: false, message: "The order status was updated, but its email notification could not be sent." });
  }
}
