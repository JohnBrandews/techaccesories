import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function AdminCustomersPage() {
  const [accounts, orderGroups, recentBuyers] = await Promise.all([
    prisma.user.findMany({ where: { role: "customer" }, select: { email: true, name: true, createdAt: true } }),
    prisma.order.groupBy({ by: ["email"], _count: { _all: true }, _min: { createdAt: true }, _max: { createdAt: true } }),
    prisma.order.findMany({ orderBy: { createdAt: "desc" }, select: { email: true, customerName: true, phone: true }, distinct: ["email"] }),
  ]);
  const accountMap = new Map(accounts.map(user => [user.email.toLowerCase(), user]));
  const buyerMap = new Map(recentBuyers.map(order => [order.email.toLowerCase(), order]));
  const ordersByEmail = new Map(orderGroups.map(group => [group.email.toLowerCase(), group]));
  const emails = new Set([...accountMap.keys(), ...ordersByEmail.keys()]);
  const customers = [...emails].map(email => {
    const account = accountMap.get(email);
    const orders = ordersByEmail.get(email);
    const buyer = buyerMap.get(email);
    return { email, name: account?.name?.trim() || buyer?.customerName || email.split("@")[0], phone: buyer?.phone ?? null, orderCount: orders?._count._all ?? 0, joined: account?.createdAt ?? orders?._min.createdAt ?? new Date(), lastOrder: orders?._max.createdAt ?? null };
  }).sort((a, b) => b.orderCount - a.orderCount || b.joined.getTime() - a.joined.getTime());
  return <div className="admin-page-content">
    <div className="admin-page-intro"><div><span className="admin-overline">CUSTOMER DIRECTORY</span><h2>Customers</h2><p>Registered accounts and customers who have placed guest orders.</p></div><span className="admin-count-chip">{customers.length} customers</span></div>
    <section className="admin-card"><div className="admin-card-heading"><div><h3>All customers</h3><p>Order counts include all orders associated with the email address.</p></div></div>{customers.length ? <div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>Customer</th><th>Email</th><th>Phone</th><th>Orders</th><th>Joined</th><th>Last order</th></tr></thead><tbody>{customers.map(customer => <tr key={customer.email}><td><strong>{customer.name}</strong></td><td><a href={`mailto:${customer.email}`}>{customer.email}</a></td><td>{customer.phone ? <a href={`tel:${customer.phone}`}>{customer.phone}</a> : "—"}</td><td><span className="admin-count-chip">{customer.orderCount}</span></td><td>{new Intl.DateTimeFormat("en-KE", { timeZone: "Africa/Nairobi", dateStyle: "medium" }).format(customer.joined)}</td><td>{customer.lastOrder ? new Intl.DateTimeFormat("en-KE", { timeZone: "Africa/Nairobi", dateStyle: "medium" }).format(customer.lastOrder) : "No orders"}</td></tr>)}</tbody></table></div> : <div className="admin-empty-state">Customer accounts and orders will appear here.</div>}</section>
  </div>;
}
