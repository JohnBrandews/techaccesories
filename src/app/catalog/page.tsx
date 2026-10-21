import { StoreHeader } from "@/components/store-header";
import Link from "next/link";
import { ProductCard } from "@/components/product-card";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";

export const dynamic = "force-dynamic";
type SearchParams = Promise<{ q?: string; brand?: string; sort?: string; available?: string; page?: string; minPrice?: string; maxPrice?: string }>;

export default async function CatalogPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const q = params.q?.trim().slice(0, 120) ?? "";
  const pageNumber = Math.max(1, Math.min(10000, Number.parseInt(params.page ?? "1", 10) || 1));
  const pageSize = 24;
  const minKsh = params.minPrice && Number.isFinite(Number(params.minPrice)) && Number(params.minPrice) >= 0 && Number(params.minPrice) <= 20_000_000 ? Number(params.minPrice) : undefined;
  const maxKsh = params.maxPrice && Number.isFinite(Number(params.maxPrice)) && Number(params.maxPrice) >= 0 && Number(params.maxPrice) <= 20_000_000 ? Number(params.maxPrice) : undefined;
  const where: Prisma.ProductWhereInput = {
    isPublished: true,
    category: { isActive: true },
    ...(q ? { OR: [{ name: { contains: q } }, { description: { contains: q } }, { model: { contains: q } }, { sku: { contains: q } }, { brand: { name: { contains: q } } }] } : {}),
    ...(params.brand ? { brand: { slug: params.brand } } : {}),
    ...(params.available === "1" ? { stockQuantity: { gt: 0 } } : {}),
    ...(minKsh !== undefined || maxKsh !== undefined ? { priceMinor: { ...(minKsh !== undefined ? { gte: Math.round(minKsh * 100) } : {}), ...(maxKsh !== undefined ? { lte: Math.round(maxKsh * 100) } : {}) } } : {}),
  };
  const [categories, brands, products, totalProducts] = await Promise.all([
    prisma.category.findMany({ where: { isActive: true, parentId: null }, orderBy: { sortOrder: "asc" }, select: { id: true, name: true, slug: true } }),
    prisma.brand.findMany({ where: { products: { some: { isPublished: true } } }, orderBy: { name: "asc" } }),
    prisma.product.findMany({ where, orderBy: params.sort === "price-low" ? { priceMinor: "asc" } : params.sort === "price-high" ? { priceMinor: "desc" } : params.sort === "newest" ? { createdAt: "desc" } : [{ isFeatured: "desc" }, { createdAt: "desc" }], include: { brand: true, category: true, images: { orderBy: { sortOrder: "asc" }, take: 1 } }, skip: (pageNumber - 1) * pageSize, take: pageSize }),
    prisma.product.count({ where }),
  ]);
  const pageCount = Math.max(1, Math.ceil(totalProducts / pageSize));
  const pageUrl = (page: number) => {
    const search = new URLSearchParams();
    if (q) search.set("q", q);
    if (params.brand) search.set("brand", params.brand);
    if (params.sort) search.set("sort", params.sort);
    if (params.available) search.set("available", params.available);
    if (params.minPrice) search.set("minPrice", params.minPrice);
    if (params.maxPrice) search.set("maxPrice", params.maxPrice);
    search.set("page", String(page));
    return `/catalog?${search.toString()}`;
  };
  return <><StoreHeader categories={categories}/><main className="page-shell content-width"><div className="breadcrumbs"><Link href="/">Home</Link> / Catalog</div><div className="section-heading"><div><span className="eyebrow">TECHACCESORIES CATALOG</span><h1>Shop technology</h1><p className="page-intro">Search and browse genuine hardware stocked for customers and teams across Kenya.</p></div></div><div className="catalog-layout"><aside className="filter-panel"><h2>Departments</h2>{categories.map((category)=><a className="filter-link" key={category.id} href={`/category/${category.slug}`}>{category.name}</a>)}<form action="/catalog" className="catalog-filters"><input type="hidden" name="q" value={q}/><label>Brand<select name="brand" defaultValue={params.brand ?? ""}><option value="">All brands</option>{brands.map((brand)=><option value={brand.slug} key={brand.id}>{brand.name}</option>)}</select></label><div className="price-filter"><label>Min price (KSh)<input name="minPrice" type="number" min="0" defaultValue={minKsh}/></label><label>Max price (KSh)<input name="maxPrice" type="number" min="0" defaultValue={maxKsh}/></label></div><label>Sort by<select name="sort" defaultValue={params.sort ?? "relevant"}><option value="relevant">Recommended</option><option value="newest">Newest</option><option value="price-low">Price: low to high</option><option value="price-high">Price: high to low</option></select></label><label className="check-filter"><input type="checkbox" name="available" value="1" defaultChecked={params.available === "1"}/> In stock only</label><button className="secondary-button">Apply filters</button></form></aside><section className="catalog-results"><form action="/catalog" className="catalog-search"><input name="q" defaultValue={q} placeholder="Search products, brands or model numbers" aria-label="Search catalog"/><button className="primary-button">Search</button></form><p className="results-count">{totalProducts} {totalProducts === 1 ? "product" : "products"}{q ? ` matching “${q}”` : " available"}</p>{products.length ? <div className="product-grid">{products.map((product)=><ProductCard key={product.id} product={{ id:product.id,name:product.name,slug:product.slug,brand:product.brand?.name??"TechAccesories",category:product.category.name,description:product.description,priceMinor:product.priceMinor,compareAtMinor:product.compareAtMinor,stockQuantity:product.stockQuantity,imageUrl:product.images[0]?.url??null,imageAlt:product.images[0]?.altText??product.name }}/>)}</div> : <div className="empty-state">No products found. Try a different search or filter.</div>}{pageCount>1?<nav className="pagination" aria-label="Catalog pages">{pageNumber>1?<a href={pageUrl(pageNumber-1)}>← Previous</a>:<span/>}<span>Page {pageNumber} of {pageCount}</span>{pageNumber<pageCount?<a href={pageUrl(pageNumber+1)}>Next →</a>:<span/>}</nav>:null}</section></div></main></>;
}
