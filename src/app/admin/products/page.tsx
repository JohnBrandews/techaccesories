import { AdminProductForm, ProductEditor, StockAdjustment } from "@/components/admin-actions";
import { formatPrice } from "@/lib/format";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function AdminProductsPage({ searchParams }: { searchParams: Promise<{ stock?: string }> }) {
  const params = await searchParams;
  const [categories, brands, products] = await Promise.all([
    prisma.category.findMany({ where: { isActive: true }, orderBy: { sortOrder: "asc" }, select: { id: true, name: true } }),
    prisma.brand.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
    prisma.product.findMany({ where: params.stock === "low" ? { stockQuantity: { lt: 5 }, isPublished: true } : undefined, orderBy: [{ stockQuantity: "asc" }, { name: "asc" }], include: { brand: true, category: true, images: { orderBy: { sortOrder: "asc" } } }, take: 250 }),
  ]);
  return <div className="admin-page-content">
    <div className="admin-page-intro"><div><span className="admin-overline">CATALOG MANAGEMENT</span><h2>Products</h2><p>Add, edit, publish and manage product stock.</p></div><span className="admin-count-chip">{products.length} products</span></div>
    <details className="admin-card admin-add-product"><summary><span className="admin-add-icon">＋</span><span><strong>Add a product</strong><small>Enter product details, images, specifications and stock.</small></span><span className="admin-add-toggle">Open form</span></summary><div className="admin-add-product-content"><AdminProductForm categories={categories} brands={brands}/></div></details>
    <section className="admin-card admin-products-card"><div className="admin-card-heading"><div><h3>{params.stock === "low" ? "Low stock products" : "Product inventory"}</h3><p>Update quantities or edit full product details.</p></div><a className="admin-text-link" href={params.stock === "low" ? "/admin/products" : "/admin/products?stock=low"}>{params.stock === "low" ? "Show all products" : "Low stock only"}</a></div>{products.length ? <div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>Product</th><th>SKU</th><th>Category</th><th>Price</th><th>Stock</th><th>Visibility</th><th>Actions</th></tr></thead><tbody>{products.map(product => <tr key={product.id}><td><strong>{product.name}</strong><small>{product.brand?.name ?? "Unbranded"}{product.model ? ` · ${product.model}` : ""}</small></td><td>{product.sku}</td><td>{product.category.name}</td><td>{formatPrice(product.priceMinor)}</td><td><StockAdjustment id={product.id} stock={product.stockQuantity}/></td><td><span className={`status-pill ${product.isPublished ? "status-paid" : "status-pending"}`}>{product.stockQuantity === 0 ? "Out of stock" : product.isPublished ? "Published" : "Hidden"}</span></td><td><ProductEditor product={{ id: product.id, name: product.name, slug: product.slug, sku: product.sku, model: product.model, description: product.description, categoryId: product.categoryId, brandId: product.brandId, priceMinor: product.priceMinor, stockQuantity: product.stockQuantity, warrantyMonths: product.warrantyMonths, specifications: product.specifications, isPublished: product.isPublished, isFeatured: product.isFeatured, images: product.images.map(image => ({ url: image.url, altText: image.altText })) }} categories={categories} brands={brands}/></td></tr>)}</tbody></table></div> : <div className="admin-empty-state">No products match this view.</div>}</section>
  </div>;
}
