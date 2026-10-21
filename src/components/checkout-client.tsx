"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { useCart } from "@/components/cart-provider";
import { formatPrice } from "@/lib/format";

export default function CheckoutClient() {
  const { items, count, clear } = useCart();
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const subtotal = items.reduce((sum, item) => sum + item.priceMinor * item.quantity, 0);

  async function placeOrder(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSubmitting(true);
    const form = new FormData(event.currentTarget);
    const payload = {
      customerName: form.get("customerName"), email: form.get("email"), phone: form.get("phone"),
      address: form.get("address"), city: form.get("city"), postalCode: form.get("postalCode"),
      notes: form.get("notes"), items: items.map(({ id, quantity }) => ({ productId: id, quantity })),
    };

    try {
      const response = await fetch("/api/orders", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload),
      });
      const result = await response.json() as { reference?: string; error?: string };
      if (!response.ok || !result.reference) throw new Error(result.error ?? "We could not place your order.");
      clear();
      window.location.assign(`/orders/confirmed?reference=${encodeURIComponent(result.reference)}`);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "We could not place your order. Please try again.");
      setSubmitting(false);
    }
  }

  return <main className="page-shell content-width">
    <div className="breadcrumbs"><Link href="/">Home</Link> / <Link href="/cart">Cart</Link> / Checkout</div>
    <span className="eyebrow">SECURE ORDER DETAILS</span><h1>Checkout</h1>
    <div className="checkout-notice">Demo checkout: this saves a pending test order and does not charge a payment method.</div>
    {!items.length ? <div className="empty-state">Your cart is empty. <Link href="/catalog">Browse products</Link></div> :
      <div className="checkout-layout">
        <form className="checkout-form" onSubmit={placeOrder}>
          <section><h2>Delivery details</h2><div className="form-grid">
            <label className="form-wide">Full name<input required name="customerName" autoComplete="name" maxLength={100} /></label>
            <label>Email address<input required type="email" name="email" autoComplete="email" maxLength={254} /></label>
            <label>Phone number<input required type="tel" name="phone" autoComplete="tel" placeholder="+254 7XX XXX XXX" maxLength={30} /></label>
            <label className="form-wide">Street address<input required name="address" autoComplete="street-address" maxLength={240} /></label>
            <label>City / town<input required name="city" autoComplete="address-level2" defaultValue="Nairobi" maxLength={80} /></label>
            <label>Postal code<input name="postalCode" autoComplete="postal-code" maxLength={20} /></label>
            <label className="form-wide">Delivery notes (optional)<textarea name="notes" rows={3} maxLength={500} /></label>
          </div></section>
          <section><h2>Payment</h2><div className="demo-payment"><strong>Payment is not connected yet</strong><p>Your order will be saved with payment status “pending”. M-Pesa and card payments will be enabled after merchant credentials are configured.</p></div></section>
          {error ? <div className="form-error" role="alert">{error}</div> : null}
          <button className="primary-button full-button" disabled={submitting}>{submitting ? "Placing order…" : "Place demo order"}</button>
        </form>
        <aside className="order-summary"><h2>Order summary</h2>
          {items.map(item => <div key={item.id}><span>{item.name} × {item.quantity}</span><strong>{formatPrice(item.priceMinor * item.quantity)}</strong></div>)}
          <div className="summary-total"><span>Subtotal ({count} items)</span><strong>{formatPrice(subtotal)}</strong></div>
          <p>Delivery arrangements and any delivery fee are confirmed by the store. The demo order total currently shows product subtotal only.</p>
        </aside>
      </div>}
  </main>;
}
