import { OrderActionsMenu } from "@/components/admin-actions";
import { formatPrice } from "@/lib/format";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function AdminOrdersPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q = "" } = await searchParams;
  const query = q.trim().slice(0, 100);
  const where = query ? { OR: [{ reference: { contains: query, mode: "insensitive" as const } }, { customerName: { contains: query, mode: "insensitive" as const } }, { email: { contains: query, mode: "insensitive" as const } }] } : {};
  const [orders, count] = await Promise.all([
    prisma.order.findMany({ where, orderBy: { createdAt: "desc" }, take: 250, include: { items: { orderBy: { productName: "asc" } } } }),
    prisma.order.count({ where }),
  ]);
  return <div className="admin-page-content">
    <div className="admin-page-intro"><div><span className="admin-overline">FULFILMENT</span><h2>Orders</h2><p>Review payment, customer and delivery details, then update each order.</p></div><span className="admin-count-chip">{count} total orders</span></div>
    <form className="admin-search-form" action="/admin/orders"><input name="q" defaultValue={query} placeholder="Search order ID, customer or email" aria-label="Search orders"/><button className="admin-outline-button">Search orders</button>{query ? <a href="/admin/orders">Clear</a> : null}</form>
    <div className="admin-order-list">{orders.map(order => <article className="admin-order-card" id={order.reference} key={order.reference}>
      <div className="admin-order-card-head"><div><strong>{order.reference}</strong><span>{order.customerName} · <a href={`mailto:${order.email}`}>{order.email}</a></span><small>{new Intl.DateTimeFormat("en-KE", { timeZone: "Africa/Nairobi", dateStyle: "medium", timeStyle: "short" }).format(order.createdAt)}</small></div><div className="admin-order-total"><strong>{formatPrice(order.totalMinor)}</strong><span className={`status-pill status-${order.paymentStatus}`}>Payment: {order.paymentStatus}</span></div></div>
      <div className="admin-delivery-details"><div><span>DELIVER TO</span><strong>{order.customerName}</strong><a href={`tel:${order.phone}`}>{order.phone}</a></div><div><span>DELIVERY LOCATION</span><strong>{[order.address, order.city, order.postalCode, "Kenya"].filter(Boolean).join(", ")}</strong>{order.notes ? <small>Note: {order.notes}</small> : null}</div></div>
      <div className="admin-order-items">{order.items.map(item => <div key={item.id}><span>{item.productName} × {item.quantity} <small>({item.sku})</small></span><strong>{formatPrice(item.lineTotalMinor)}</strong></div>)}</div>
      <div className="admin-order-card-foot"><div><span className={`status-pill status-${order.status}`}>Order: {order.status}</span><small>Paid with {order.paymentMethod}{order.paymentReceipt ? ` · Transaction ${order.paymentReceipt}` : ""}</small></div><OrderActionsMenu reference={order.reference} status={order.status} paymentMethod={order.paymentMethod} paymentStatus={order.paymentStatus}/></div>
    </article>)}{orders.length === 0 ? <div className="admin-empty-state">No orders match your search.</div> : null}</div>
    {count > orders.length ? <p className="admin-note">Showing the latest {orders.length} orders. Search by customer or reference to find older orders.</p> : null}
    <p className="admin-note">Cancelling a paid order returns its items to stock. Process any payment refund separately in Paystack.</p>
  </div>;
}
