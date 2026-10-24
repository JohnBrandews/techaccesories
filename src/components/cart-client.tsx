"use client";

import Link from "next/link";
import Image from "next/image";
import { useCart } from "@/components/cart-provider";
import { formatPrice } from "@/lib/format";

export default function CartClient() {
  const { items, count, setQuantity, remove } = useCart();
  const subtotal = items.reduce((sum, item) => sum + item.priceMinor * item.quantity, 0);

  return <main className="page-shell content-width">
    <div className="breadcrumbs"><Link href="/">Home</Link> / Your cart</div><h1>Your shopping cart</h1>
    {items.length ? <div className="cart-layout">
      <section className="cart-items">{items.map(item => <article className="cart-item" key={item.id}>
        <Link href={`/products/${item.slug}`} className="cart-thumb">{item.imageUrl ? <Image src={item.imageUrl} alt={item.imageAlt} fill sizes="110px" unoptimized /> : <span>TA</span>}</Link>
        <div className="cart-item-copy"><Link href={`/products/${item.slug}`}><strong>{item.name}</strong></Link>
          <small>{formatPrice(item.priceMinor)} each · {item.stockQuantity} in stock</small>
          <div className="quantity-control"><button aria-label="Decrease quantity" onClick={() => setQuantity(item.id, item.quantity - 1)}>−</button>
            <input aria-label={`Quantity of ${item.name}`} type="number" min="1" max={item.stockQuantity} value={item.quantity} onChange={event => setQuantity(item.id, Number(event.target.value) || 1)} />
            <button aria-label="Increase quantity" disabled={item.quantity >= item.stockQuantity} onClick={() => setQuantity(item.id, item.quantity + 1)}>+</button>
          </div>
        </div>
        <div className="cart-item-end"><strong>{formatPrice(item.priceMinor * item.quantity)}</strong><button className="text-button" onClick={() => remove(item.id)}>Remove</button></div>
      </article>)}</section>
      <aside className="order-summary"><h2>Order summary</h2><div><span>Items ({count})</span><strong>{formatPrice(subtotal)}</strong></div>
        <div><span>Delivery</span><strong>Arranged separately</strong></div><div className="summary-total"><span>Product subtotal</span><strong>{formatPrice(subtotal)}</strong></div>
        <p>Paystack checkout will show the product subtotal. The store will confirm delivery arrangements separately.</p>
        <Link className="primary-button full-button" href="/checkout">Continue to checkout</Link><Link className="continue-shopping" href="/catalog">Continue shopping</Link>
      </aside>
    </div> : <div className="empty-cart"><span className="empty-cart-icon">▢</span><h2>Your cart is empty</h2><p>Browse the catalog and add products you need.</p><Link className="primary-button" href="/catalog">Shop the catalog</Link></div>}
  </main>;
}
