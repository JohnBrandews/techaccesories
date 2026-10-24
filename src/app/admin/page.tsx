import Link from "next/link";
import { formatPrice } from "@/lib/format";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

function partsInNairobi(date: Date) {
  return Object.fromEntries(new Intl.DateTimeFormat("en-CA", { timeZone: "Africa/Nairobi", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(date).map(part => [part.type, part.value]));
}
function dayKey(date: Date) {
  const parts = partsInNairobi(date);
  return `${parts.year}-${parts.month}-${parts.day}`;
}
function nairobiMidnight(date: Date) {
  const parts = partsInNairobi(date);
  return new Date(Date.UTC(Number(parts.year), Number(parts.month) - 1, Number(parts.day)) - 3 * 60 * 60 * 1000);
}

export default async function AdminPage() {
  const now = new Date();
  const todayStart = nairobiMidnight(now);
  const trendStart = new Date(todayStart.getTime() - 13 * 86_400_000);
  const [products, todayOrders, customerCount, revenue, recentOrders, trendOrders] = await Promise.all([
    prisma.product.aggregate({ _count: { id: true }, _sum: { stockQuantity: true } }),
    prisma.order.count({ where: { createdAt: { gte: todayStart } } }),
    prisma.user.count({ where: { role: "customer" } }),
    prisma.order.aggregate({ where: { paymentStatus: "paid", status: { not: "cancelled" } }, _sum: { totalMinor: true } }),
    prisma.order.findMany({ orderBy: { createdAt: "desc" }, take: 8, select: { reference: true, customerName: true, status: true, paymentStatus: true, totalMinor: true, createdAt: true } }),
    prisma.order.findMany({ where: { paymentStatus: "paid", status: { not: "cancelled" }, createdAt: { gte: trendStart } }, select: { totalMinor: true, createdAt: true } }),
  ]);
  const lowStockCount = await prisma.product.count({ where: { isPublished: true, stockQuantity: { lt: 5 } } });
  const byDay = new Map<string, number>();
  for (const order of trendOrders) byDay.set(dayKey(order.createdAt), (byDay.get(dayKey(order.createdAt)) ?? 0) + order.totalMinor);
  const days = Array.from({ length: 14 }, (_, index) => {
    const date = new Date(todayStart.getTime() + index * 86_400_000);
    const key = dayKey(date);
    return { key, label: new Intl.DateTimeFormat("en-KE", { timeZone: "Africa/Nairobi", weekday: "short", day: "numeric" }).format(date), value: byDay.get(key) ?? 0 };
  });
  const maxSales = Math.max(1, ...days.map(day => day.value));

  return <div className="admin-page-content">
    <div className="admin-page-intro"><div><span className="admin-overline">STORE SUMMARY</span><h2>Overview</h2><p>Your store performance and latest activity at a glance.</p></div><span className="admin-date-chip">{new Intl.DateTimeFormat("en-KE", { timeZone: "Africa/Nairobi", dateStyle: "full" }).format(now)}</span></div>
    <section className="admin-metrics" aria-label="Store metrics">
      <article><span>Total revenue</span><strong>{formatPrice(revenue._sum.totalMinor ?? 0)}</strong><small>Paid orders, excluding cancellations</small></article>
      <article><span>Orders today</span><strong>{todayOrders}</strong><small>Orders placed today</small></article>
      <article><span>Total customers</span><strong>{customerCount}</strong><small>Registered customer accounts</small></article>
      <article className={lowStockCount ? "metric-alert" : ""}><span>Low stock alerts</span><strong>{lowStockCount}</strong><small>{lowStockCount ? <Link href="/admin/products?stock=low">Review products below 5 units</Link> : "All published items are stocked"}</small></article>
    </section>
    <section className="admin-dashboard-grid">
      <article className="admin-card sales-card"><div className="admin-card-heading"><div><h3>Sales trend</h3><p>Daily paid sales · last 14 days</p></div><span className="sales-total">{formatPrice(days.reduce((sum, day) => sum + day.value, 0))}</span></div><div className="sales-chart" role="img" aria-label="Daily paid revenue over the last 14 days">{days.map((day, index) => <div className="sales-chart-day" key={day.key} title={`${day.label}: ${formatPrice(day.value)}`}><span className="sales-bar-value">{day.value ? formatPrice(day.value) : ""}</span><div className="sales-bar-track"><span style={{ height: `${day.value ? Math.max(4, (day.value / maxSales) * 100) : 2}%` }}/></div><small>{index % 2 === 0 || index === days.length - 1 ? day.label : ""}</small></div>)}</div></article>
      <article className="admin-card inventory-card"><div className="admin-card-heading"><div><h3>Inventory overview</h3><p>Current catalog availability</p></div><span className="inventory-icon">▣</span></div><div className="inventory-total"><strong>{products._sum.stockQuantity ?? 0}</strong><span>units on hand</span></div><div className="inventory-divider"/><div className="inventory-row"><span>Products in catalog</span><strong>{products._count.id}</strong></div><div className="inventory-row"><span>Items needing attention</span><strong className={lowStockCount ? "text-danger" : ""}>{lowStockCount}</strong></div><Link className="admin-text-link" href="/admin/products">Manage products →</Link></article>
    </section>
    <section className="admin-card recent-orders-card"><div className="admin-card-heading"><div><h3>Recent orders</h3><p>Latest customer activity</p></div><Link className="admin-text-link" href="/admin/orders">View all orders →</Link></div>{recentOrders.length ? <div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>Order ID</th><th>Customer</th><th>Date</th><th>Total</th><th>Payment</th><th>Order status</th><th/></tr></thead><tbody>{recentOrders.map(order => <tr key={order.reference}><td><strong>{order.reference}</strong></td><td>{order.customerName}</td><td>{new Intl.DateTimeFormat("en-KE", { timeZone: "Africa/Nairobi", dateStyle: "medium" }).format(order.createdAt)}</td><td><strong>{formatPrice(order.totalMinor)}</strong></td><td><span className={`status-pill status-${order.paymentStatus}`}>{order.paymentStatus}</span></td><td><span className={`status-pill status-${order.status}`}>{order.status}</span></td><td><Link className="admin-view-link" href={`/admin/orders#${encodeURIComponent(order.reference)}`}>View</Link></td></tr>)}</tbody></table></div> : <div className="admin-empty-state">Orders will appear here when customers check out.</div>}</section>
  </div>;
}
