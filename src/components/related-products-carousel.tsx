"use client";

import { useRef } from "react";
import { ProductCard, type ProductCardData } from "@/components/product-card";

export function RelatedProductsCarousel({ products }: { products: ProductCardData[] }) {
  const rail = useRef<HTMLDivElement>(null);
  function move(direction: -1 | 1) {
    const firstCard = rail.current?.querySelector<HTMLElement>(".product-card");
    rail.current?.scrollBy({ left: direction * ((firstCard?.offsetWidth ?? 260) + 16), behavior: "smooth" });
  }
  return <div className="related-carousel-wrap">
    <div className="related-carousel-controls"><button type="button" aria-label="Previous related products" onClick={() => move(-1)}>←</button><button type="button" aria-label="Next related products" onClick={() => move(1)}>→</button></div>
    <div className="related-carousel" ref={rail} aria-label="Related products">{products.map(product => <div className="related-carousel-item" key={product.id}><ProductCard product={product}/></div>)}</div>
  </div>;
}
