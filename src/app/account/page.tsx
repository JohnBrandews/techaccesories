import Link from "next/link";
import { redirect } from "next/navigation";
import { StoreHeader } from "@/components/store-header";
import { formatPrice } from "@/lib/format";
import { getCurrentSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const orderStages = ["pending", "dispatched", "delivered", "completed"];

export default async function AccountPage() {
  const session = await getCurrentSession();
  if (!session) redirect("/login?next=%2Faccount");
  if (session.role === "admin") redirect("/admin");

  const [categories, orders] = await Promise.all([
    prisma.category.findMany({ where: { isActive: true, parentId: null }, orderBy: { sortOrder: "asc" }, select: { id: true, name: true, slug: true } }),
    prisma.order.findMany({ where: { email: session.email }, orderBy: { createdAt: "desc" }, include: { items: true } }),
  ]);

  return <>
    <StoreHeader categories={categories}/>
    <main className="page-shell content-width customer-account-page">
      <span className="eyebrow">YOUR TECHACCESORIES ACCOUNT</span>
      <h1>Welcome{session.name ? `, ${session.name.split(" ")[0]}` : " back"}</h1>
      <p className="page-intro">Review your orders and follow their latest fulfilment status.</p>
      <section className="account-orders-section"><div className="section-heading"><div><span className="eyebrow">ORDER HISTORY</span><h2>Your orders</h2></div><Link className="secondary-button" href="/catalog">Continue shopping</Link></div>
        {orders.length ? <div className="customer-order-list">{orders.map(order => {
          const currentStage = orderStages.indexOf(order.status);
          return <article className="customer-order-card" key={order.id}>
            <div className="customer-order-heading"><div><span className="eyebrow">ORDER REFERENCE</span><strong>{order.reference}</strong></div><div><span className="eyebrow">PLACED</span><strong>{order.createdAt.toLocaleDateString("en-KE", { dateStyle: "medium" })}</strong></div><div><span className="eyebrow">TOTAL</span><strong>{formatPrice(order.totalMinor)}</strong></div></div>
            {order.status === "cancelled" ? <p className="customer-order-cancelled" role="status">This order was cancelled.</p> : <ol className="order-progress" aria-label={`Order ${order.reference} status: ${order.status}`}>
              {orderStages.map((stage, index) => <li className={index <= currentStage ? "is-current" : ""} key={stage}><span>{index < currentStage ? "✓" : index + 1}</span><strong>{stage[0].toUpperCase() + stage.slice(1)}</strong></li>)}
            </ol>}
            <div className="customer-order-items">{order.items.map(item => <div key={item.id}><span>{item.productName} × {item.quantity}</span><strong>{formatPrice(item.lineTotalMinor)}</strong></div>)}</div>
            <p className="customer-order-payment">Payment: <strong>{order.paymentStatus}</strong>{order.status === "pending" ? " · The store will update your order as it is prepared and delivered." : ""}</p>
          </article>;
        })}</div> : <div className="empty-cart"><span className="empty-cart-icon">▢</span><h2>No orders yet</h2><p>When you place an order with this email, its status and details will appear here.</p><Link className="primary-button" href="/catalog">Browse the catalog</Link></div>}
      </section>
    </main>
  </>;
}
