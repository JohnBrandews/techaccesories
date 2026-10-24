import { randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { assertPaystackConfigured, initializePaystackPayment, PaystackUncertainError } from "@/lib/paystack";

type RequestItem = { productId: string; quantity: number };
class OrderConflict extends Error {}
function normalizeKenyanPhone(value: string) {
  const digits = value.replace(/[\s()-]/g, "").replace(/^\+/, "");
  const national = digits.startsWith("254") ? digits.slice(3) : digits.startsWith("0") ? digits.slice(1) : "";
  return /^([17])\d{8}$/.test(national) ? `254${national}` : null;
}

export async function POST(request: Request) {
  let body: Record<string, unknown>;
  try { body = await request.json() as Record<string, unknown>; }
  catch { return NextResponse.json({ error: "Invalid request." }, { status: 400 }); }

  const customerName = typeof body.customerName === "string" ? body.customerName.trim() : "";
  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  const phoneInput = typeof body.phone === "string" ? body.phone.trim() : "";
  const phone = normalizeKenyanPhone(phoneInput);
  const address = typeof body.address === "string" ? body.address.trim() : "";
  const city = typeof body.city === "string" ? body.city.trim() : "";
  const postalCode = typeof body.postalCode === "string" ? body.postalCode.trim() : "";
  const notes = typeof body.notes === "string" ? body.notes.trim() : "";
  if (!customerName || customerName.length > 100 || !/^\S+@\S+\.\S+$/.test(email) || email.length > 254 || !phone || phoneInput.length > 30 || !address || address.length > 240 || !city || city.length > 80 || postalCode.length > 20 || notes.length > 500) {
    return NextResponse.json({ error: "Check your name, email, Kenyan phone number, and delivery details." }, { status: 400 });
  }
  if (!Array.isArray(body.items) || body.items.length < 1 || body.items.length > 30) return NextResponse.json({ error: "Your cart is empty or has too many items." }, { status: 400 });
  const quantities = new Map<string, number>();
  for (const raw of body.items as RequestItem[]) {
    if (!raw || typeof raw.productId !== "string" || raw.productId.length > 30 || !Number.isInteger(raw.quantity) || raw.quantity < 1 || raw.quantity > 20) return NextResponse.json({ error: "One or more cart quantities are invalid." }, { status: 400 });
    quantities.set(raw.productId, (quantities.get(raw.productId) ?? 0) + raw.quantity);
  }
  if ([...quantities.values()].some(quantity => quantity > 20)) return NextResponse.json({ error: "Maximum quantity is 20 per product." }, { status: 400 });
  try { assertPaystackConfigured(); }
  catch { return NextResponse.json({ error: "Paystack checkout is not configured yet. Please contact the store." }, { status: 503 }); }

  const reference = `MT-${Date.now().toString(36).toUpperCase()}-${randomBytes(3).toString("hex").toUpperCase()}`;
  try {
    const order = await prisma.$transaction(async tx => {
      const products = await tx.product.findMany({ where: { id: { in: [...quantities.keys()] }, isPublished: true, category: { isActive: true } }, include: { category: true } });
      if (products.length !== quantities.size) throw new OrderConflict("A product in your cart is no longer available.");
      let subtotalMinor = 0;
      const orderItems = products.map(product => {
        const quantity = quantities.get(product.id)!;
        if (product.stockQuantity < quantity) throw new OrderConflict(`${product.name} no longer has enough stock.`);
        const lineTotalMinor = product.priceMinor * quantity;
        if (!Number.isSafeInteger(lineTotalMinor) || lineTotalMinor > 2_000_000_000) throw new OrderConflict("An item total is above the checkout limit.");
        subtotalMinor += lineTotalMinor;
        if (subtotalMinor > 2_000_000_000) throw new OrderConflict("This order is above the checkout limit.");
        return { productId: product.id, productName: product.name, sku: product.sku, quantity, unitPriceMinor: product.priceMinor, lineTotalMinor };
      });
      for (const product of products) {
        const quantity = quantities.get(product.id)!;
        const updated = await tx.product.updateMany({ where: { id: product.id, isPublished: true, stockQuantity: { gte: quantity } }, data: { stockQuantity: { decrement: quantity } } });
        if (updated.count !== 1) throw new OrderConflict(`${product.name} stock changed. Please review your cart.`);
        await tx.inventoryMovement.create({ data: { productId: product.id, delta: -quantity, previous: product.stockQuantity, next: product.stockQuantity - quantity, reason: `Paystack payment pending ${reference}` } });
      }
      return tx.order.create({
        data: { reference, customerName, email, phone, address, city, postalCode: postalCode || null, notes: notes || null, paymentMethod: "paystack", paymentStatus: "pending", status: "pending", subtotalMinor, deliveryMinor: 0, totalMinor: subtotalMinor, items: { create: orderItems } },
        include: { items: true },
      });
    }, { maxWait: 10_000, timeout: 15_000 });

    let authorizationUrl: string;
    try {
      const initialized = await initializePaystackPayment({ email, amount: order.totalMinor, reference, callbackUrl: `${new URL(request.url).origin}/api/payments/paystack/callback`, customerName, phone });
      authorizationUrl = initialized.authorizationUrl;
    } catch (error) {
      if (error instanceof PaystackUncertainError) {
        console.error("Paystack initialize outcome uncertain; order left pending.", { reference });
        return NextResponse.json({ reference, paymentStatus: "pending", message: error.message }, { status: 202 });
      }
      await prisma.$transaction(async tx => {
        const pending = await tx.order.findUnique({ where: { reference }, include: { items: true } });
        if (!pending || pending.paymentStatus !== "pending") return;
        await tx.order.update({ where: { reference }, data: { paymentStatus: "failed", status: "cancelled" } });
        for (const item of pending.items) {
          const product = await tx.product.findUnique({ where: { id: item.productId }, select: { stockQuantity: true } });
          if (!product) continue;
          await tx.product.update({ where: { id: item.productId }, data: { stockQuantity: { increment: item.quantity } } });
          await tx.inventoryMovement.create({ data: { productId: item.productId, delta: item.quantity, previous: product.stockQuantity, next: product.stockQuantity + item.quantity, reason: `Paystack initialization failed ${reference}` } });
        }
      }, { maxWait: 10_000, timeout: 15_000 });
      throw error;
    }
    await prisma.order.update({ where: { reference }, data: { paymentProviderReference: reference } });
    return NextResponse.json({ reference, authorizationUrl, paymentStatus: "pending" }, { status: 201 });
  } catch (error) {
    if (error instanceof OrderConflict) return NextResponse.json({ error: error.message }, { status: 409 });
    if (error instanceof Error && error.message.startsWith("Paystack could not start")) return NextResponse.json({ error: error.message }, { status: 502 });
    console.error("Paystack order checkout failed:", error instanceof Error ? error.message : "Unknown error");
    return NextResponse.json({ error: "Could not start payment. If you reached Paystack checkout, do not submit again; contact the store with your order reference." }, { status: 500 });
  }
}
