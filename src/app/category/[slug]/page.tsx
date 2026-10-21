import { notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { StoreHeader } from "@/components/store-header";
import { ProductCard } from "@/components/product-card";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export async function generateMetadata({params}:{params:Promise<{slug:string}>}):Promise<Metadata>{const {slug}=await params;const category=await prisma.category.findUnique({where:{slug},select:{name:true,description:true,isActive:true}});if(!category?.isActive)return {title:"Department not found | Mahir Technology"};return {title:`${category.name} | Mahir Technology`,description:category.description??`Browse ${category.name} at Mahir Technology.`};}
export default async function CategoryPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const [categories, category] = await Promise.all([prisma.category.findMany({ where:{isActive:true,parentId:null},orderBy:{sortOrder:"asc"},select:{id:true,name:true,slug:true} }),prisma.category.findUnique({where:{slug},include:{products:{where:{isPublished:true},orderBy:[{isFeatured:"desc"},{createdAt:"desc"}],include:{brand:true,category:true,images:{orderBy:{sortOrder:"asc"},take:1}}}}})]);
  if (!category?.isActive) notFound();
  return <><StoreHeader categories={categories}/><main className="page-shell content-width"><div className="breadcrumbs"><Link href="/">Home</Link> / <Link href="/catalog">Catalog</Link> / {category.name}</div><span className="eyebrow">DEPARTMENT</span><h1>{category.name}</h1><p className="page-intro">{category.description ?? `Browse ${category.name.toLowerCase()} from Mahir Technology.`}</p>{category.products.length ? <div className="product-grid category-products">{category.products.map((product)=><ProductCard key={product.id} product={{id:product.id,name:product.name,slug:product.slug,brand:product.brand?.name??"Mahir Technology",category:category.name,description:product.description,priceMinor:product.priceMinor,compareAtMinor:product.compareAtMinor,stockQuantity:product.stockQuantity,imageUrl:product.images[0]?.url??null,imageAlt:product.images[0]?.altText??product.name}}/>)}</div> : <div className="empty-state">No published products in this department yet.</div>}</main></>;
}
