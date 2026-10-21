import { Storefront } from "@/components/storefront";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const [categories, products] = await Promise.all([
    prisma.category.findMany({
      where: { isActive: true, parentId: null },
      orderBy: { sortOrder: "asc" },
      include: { _count: { select: { products: { where: { isPublished: true } } } } },
    }),
    prisma.product.findMany({
      where: { isPublished: true, category: { isActive: true } },
      orderBy: [{ isFeatured: "desc" }, { createdAt: "desc" }],
      take: 8,
      include: {
        brand: true,
        images: { orderBy: { sortOrder: "asc" }, take: 1 },
        category: true,
      },
    }),
  ]);

  return (
    <Storefront
      categories={categories.map((category) => ({
        id: category.id,
        name: category.name,
        slug: category.slug,
        count: category._count.products,
      }))}
      products={products.map((product) => ({
        id: product.id,
        name: product.name,
        slug: product.slug,
        brand: product.brand?.name ?? "TechAccesories",
        category: product.category.name,
        description: product.description,
        priceMinor: product.priceMinor,
        compareAtMinor: product.compareAtMinor,
        stockQuantity: product.stockQuantity,
        imageUrl: product.images[0]?.url ?? null,
        imageAlt: product.images[0]?.altText ?? product.name,
      }))}
    />
  );
}
