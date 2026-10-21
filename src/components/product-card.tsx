"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { useCart } from "@/components/cart-provider";
import { formatPrice } from "@/lib/format";

export type ProductCardData = { id: string; name: string; slug: string; brand: string; category: string; description?: string; priceMinor: number; compareAtMinor: number | null; stockQuantity: number; imageUrl: string | null; imageAlt: string };
export function ProductCard({ product }: { product: ProductCardData }) {
  const { add } = useCart();
  const [added, setAdded] = useState(false);
  function addToCart() {
    add({ ...product });
    setAdded(true);
    window.setTimeout(() => setAdded(false), 1800);
  }
  return <article className="product-card">
    <Link className="product-image-wrap" href={`/products/${product.slug}`} aria-label={`View ${product.name}`}>
      {product.imageUrl ? <Image src={product.imageUrl} alt={product.imageAlt} fill sizes="(max-width: 700px) 50vw, 280px" className="product-image" unoptimized /> : <span className="image-placeholder">TECHACCESORIES</span>}
      {product.compareAtMinor && product.compareAtMinor > product.priceMinor ? <span className="product-badge sale-badge">DEAL</span> : null}
    </Link>
    <div className="product-details">
      <span className="product-brand">{product.brand} · {product.category}</span>
      <Link href={`/products/${product.slug}`} className="product-title-link"><h3>{product.name}</h3></Link>
      {product.description ? <p className="product-card-description">{product.description}</p> : null}
      <div className="product-stock"><span>●</span> {product.stockQuantity > 0 ? `In stock · ${product.stockQuantity} units` : "Out of stock"}</div>
      <div className="price-row"><strong>{formatPrice(product.priceMinor)}</strong>{product.compareAtMinor ? <del>{formatPrice(product.compareAtMinor)}</del> : null}</div>
      <button className="add-button" disabled={product.stockQuantity < 1} onClick={addToCart}>{added ? "Added to cart ✓" : "+ Add to cart"}</button>
    </div>
  </article>;
}
