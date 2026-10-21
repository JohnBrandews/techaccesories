"use client";

import { useState } from "react";

export function ProductInformation({ description, specifications }: { description: string; specifications: Record<string, string> }) {
  const [active, setActive] = useState<"description" | "specifications">("description");
  const entries = Object.entries(specifications);
  return <section className="product-information-grid" aria-label="Product information">
    <div className="product-information-tabs" role="tablist" aria-label="Product details">
      <button id="description-tab" role="tab" aria-selected={active === "description"} aria-controls="description-panel" onClick={() => setActive("description")}>Description</button>
      <button id="specifications-tab" role="tab" aria-selected={active === "specifications"} aria-controls="specifications-panel" onClick={() => setActive("specifications")}>Specifications</button>
    </div>
    <article id="description-panel" role="tabpanel" aria-labelledby="description-tab" className={`description-panel${active === "description" ? " is-active" : ""}`}>
      <span className="eyebrow">ABOUT THIS PRODUCT</span><h2>Product description</h2><p>{description}</p>
    </article>
    <section id="specifications-panel" role="tabpanel" aria-labelledby="specifications-tab" className={`spec-section${active === "specifications" ? " is-active" : ""}`}>
      <span className="eyebrow">PRODUCT INFORMATION</span><h2>Specifications</h2>
      {entries.length ? <dl className="spec-table">{entries.map(([key, value]) => <div key={key}><dt>{key.replace(/([A-Z])/g, " $1")}</dt><dd>{value}</dd></div>)}</dl> : <p className="muted-copy">No additional specifications have been provided for this product.</p>}
    </section>
  </section>;
}
