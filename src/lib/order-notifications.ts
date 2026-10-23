import "server-only";
import type { Prisma } from "@prisma/client";
import { adminNotificationAddress, emailButton, emailLayout, emailParagraph, publicSiteUrl, sendTransactionalEmail } from "@/lib/email";
import { formatPrice } from "@/lib/format";

type PaidOrder = Prisma.OrderGetPayload<{ include: { items: true } }>;

export async function sendPaidOrderNotifications(order: PaidOrder, requestOrigin: string) {
  const siteUrl = publicSiteUrl(requestOrigin);
  const total = formatPrice(order.totalMinor);
  const adminText = `A paid order has been placed.\nReference: ${order.reference}\nCustomer: ${order.customerName}\nEmail: ${order.email}\nPhone: ${order.phone}\nTotal: ${total}\nPayment status: paid\nFulfilment status: ${order.status}\n\nReview this order in the admin dashboard: ${siteUrl}/admin`;
  const adminHtml = emailLayout(`<h1 style="color:#12345a">New paid order</h1>${emailParagraph(`Order ${order.reference} has been paid by ${order.customerName}.`)}${emailParagraph(`Customer: ${order.customerName} · ${order.email} · ${order.phone}`)}${emailParagraph(`Order total: ${total}. M-Pesa receipt: ${order.paymentReceipt ?? "Pending receipt details"}.`)}${emailButton("Review order in dashboard", `${siteUrl}/admin`)}`);
  const customerText = `Hi ${order.customerName},\n\nYour payment for order ${order.reference} was received. Total: ${total}. You can follow fulfilment here: ${siteUrl}/orders?reference=${encodeURIComponent(order.reference)}&email=${encodeURIComponent(order.email)}`;
  const customerHtml = emailLayout(`<h1 style="color:#12345a">Payment received</h1>${emailParagraph(`Hi ${order.customerName}, we received your payment for order ${order.reference}.`)}${emailParagraph(`Order total: ${total}. M-Pesa receipt: ${order.paymentReceipt ?? "Pending receipt details"}.`)}${emailParagraph("We’ll email you when your order is dispatched and delivered.")}${emailButton("Track your order", `${siteUrl}/orders?reference=${encodeURIComponent(order.reference)}&email=${encodeURIComponent(order.email)}`)}`);
  const results = await Promise.allSettled([
    sendTransactionalEmail({ to: adminNotificationAddress(), name: "Mahir Technology Admin", subject: `Paid order ${order.reference}`, text: adminText, html: adminHtml }),
    sendTransactionalEmail({ to: order.email, name: order.customerName, subject: `Payment received for ${order.reference}`, text: customerText, html: customerHtml }),
  ]);
  for (const result of results) if (result.status === "rejected") console.error("Paid order email could not be sent:", result.reason instanceof Error ? result.reason.message : "Unknown email error");
}
