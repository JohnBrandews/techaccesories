import { AdminCategoryManager } from "@/components/admin-actions";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function AdminCategoriesPage() {
  const categories = await prisma.category.findMany({ orderBy: { sortOrder: "asc" }, select: { id: true, name: true, isActive: true } });
  return <div className="admin-page-content">
    <div className="admin-page-intro"><div><span className="admin-overline">CATALOG ORGANIZATION</span><h2>Categories</h2><p>Group products into clear departments customers can browse.</p></div></div>
    <section className="admin-card admin-category-card"><div className="admin-card-heading"><div><h3>Manage categories</h3><p>Add a department or hide one that is no longer in use.</p></div><span className="admin-count-chip">{categories.length} total</span></div><AdminCategoryManager categories={categories}/></section>
  </div>;
}
