import { StoreHeader } from "@/components/store-header";
import { AdminCategoryManager, AdminProductForm, CancelDemoOrder, OrderStatusEditor, ProductEditor, StockAdjustment } from "@/components/admin-actions";
import { SignOutButton } from "@/components/sign-out-button";
import { formatPrice } from "@/lib/format";
import { requireAdminPage } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const session = await requireAdminPage();
  const [categories, allCategories, brands, products, orders, counts, paidSales] = await Promise.all([
    prisma.category.findMany({ where: { isActive: true, parentId: null }, orderBy: { sortOrder: "asc" }, select: { id: true, name: true, slug: true } }),
    prisma.category.findMany({ orderBy: { sortOrder: "asc" }, select: { id: true, name: true, isActive: true } }),
    prisma.brand.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
    prisma.product.findMany({ orderBy: [{ stockQuantity: "asc" }, { name: "asc" }], include: { brand: true, category: true, images: { orderBy: { sortOrder: "asc" } } }, take: 100 }),
    prisma.order.findMany({ orderBy: { createdAt: "desc" }, take: 50, select: { reference: true, customerName: true, status: true, paymentStatus: true, totalMinor: true, createdAt: true } }),
    prisma.product.aggregate({ _count: { id: true }, _sum: { stockQuantity: true } }),
    prisma.order.aggregate({ where: { paymentStatus: "paid" }, _count: { reference: true }, _sum: { totalMinor: true } }),
  ]);
  const lowStock = products.filter(product => product.stockQuantity < 5).length;

  return <>
    <StoreHeader categories={categories}/>
    <main className="page-shell content-width admin-page">
      <div className="admin-heading-row"><div><span className="eyebrow">STORE OPERATIONS</span><h1>Inventory dashboard</h1></div><div className="admin-user"><span>{session.email}</span><SignOutButton/></div></div>
      <p className="page-intro">Manage your catalog, inventory and customer orders.</p>
      <div className="admin-metrics"><article><span>Catalog products</span><strong>{counts._count.id}</strong></article><article><span>Total units on hand</span><strong>{counts._sum.stockQuantity ?? 0}</strong></article><article><span>Low stock (&lt; 5 units)</span><strong>{lowStock}</strong></article><article><span>Verified paid sales</span><strong>{formatPrice(paidSales._sum.totalMinor ?? 0)}</strong><small>{paidSales._count.reference} paid orders</small></article></div>

      <section className="admin-panel"><div className="section-heading"><div><span className="eyebrow">PRODUCT MANAGEMENT</span><h2>Add a catalog product</h2></div><span className="demo-label">Local catalog</span></div><AdminProductForm categories={categories} brands={brands}/></section>
      <section className="admin-panel"><div className="section-heading"><div><span className="eyebrow">CATEGORY MANAGEMENT</span><h2>Store departments</h2></div></div><AdminCategoryManager categories={allCategories}/></section>
      <section className="admin-panel"><div className="section-heading"><div><span className="eyebrow">INVENTORY CONTROL</span><h2>Stock levels &amp; products</h2></div></div><div className="table-scroll"><table className="admin-table"><thead><tr><th>Product</th><th>SKU</th><th>Category</th><th>Price</th><th>Units</th><th>Manage</th></tr></thead><tbody>{products.map(product => <tr key={product.id}><td><strong>{product.name}</strong><small>{product.brand?.name ?? "Unbranded"} · {product.stockQuantity === 0 ? "Out of stock" : product.isPublished ? "Published" : "Archived"}</small></td><td>{product.sku}</td><td>{product.category.name}</td><td>{formatPrice(product.priceMinor)}</td><td><StockAdjustment id={product.id} stock={product.stockQuantity}/></td><td><ProductEditor product={{ id: product.id, name: product.name, slug: product.slug, sku: product.sku, model: product.model, description: product.description, categoryId: product.categoryId, brandId: product.brandId, priceMinor: product.priceMinor, stockQuantity: product.stockQuantity, warrantyMonths: product.warrantyMonths, specifications: product.specifications, isPublished: product.isPublished, isFeatured: product.isFeatured, images: product.images.map(image => ({ url: image.url, altText: image.altText })) }} categories={categories} brands={brands}/></td></tr>)}</tbody></table></div></section>
      <section className="admin-panel"><div className="section-heading"><div><span className="eyebrow">CUSTOMER ACTIVITY</span><h2>Order tracking</h2></div></div>{orders.length ? <div className="table-scroll"><table className="admin-table"><thead><tr><th>Reference</th><th>Customer</th><th>Date</th><th>Fulfilment</th><th>Payment</th><th>Total</th><th>Update status</th></tr></thead><tbody>{orders.map(order => <tr key={order.reference}><td>{order.reference}</td><td>{order.customerName}</td><td>{order.createdAt.toLocaleDateString("en-KE")}</td><td><OrderStatusEditor reference={order.reference} status={order.status}/></td><td>{order.paymentStatus}</td><td>{formatPrice(order.totalMinor)}</td><td><CancelDemoOrder reference={order.reference} status={order.status} paymentStatus={order.paymentStatus}/></td></tr>)}</tbody></table></div> : <p className="muted-copy">New customer orders will appear here.</p>}</section>
      <p className="admin-note">Demo orders are not paid through a live gateway. Payment credentials can be connected when the checkout integration is ready.</p>
    </main>
  </>;
}
