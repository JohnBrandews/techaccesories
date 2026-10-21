"use client";

import Link from "next/link";
import { useState } from "react";
import { useCart } from "@/components/cart-provider";

export function AddProductButton({ product }: { product: { id:string;name:string;slug:string;priceMinor:number;imageUrl:string|null;imageAlt:string;stockQuantity:number } }) {
  const { add } = useCart();
  const [added, setAdded] = useState(false);
  const [quantity,setQuantity]=useState(1);
  if (!product.stockQuantity) return <button className="primary-button" disabled>Out of stock</button>;
  return <><div className="detail-actions"><div className="quantity-control"><button type="button" aria-label="Decrease quantity" disabled={quantity<=1} onClick={()=>setQuantity((value)=>Math.max(1,value-1))}>−</button><input aria-label="Quantity" type="number" min="1" max={product.stockQuantity} value={quantity} onChange={(event)=>setQuantity(Math.max(1,Math.min(product.stockQuantity,Number(event.target.value)||1)))}/><button type="button" aria-label="Increase quantity" disabled={quantity>=product.stockQuantity} onClick={()=>setQuantity((value)=>Math.min(product.stockQuantity,value+1))}>+</button></div><button className="primary-button" onClick={()=>{add(product,quantity);setAdded(true);window.setTimeout(()=>setAdded(false),1800);}}>{added?"Added to cart ✓":"Add to cart"}</button><Link className="secondary-button" href="/cart">View cart</Link></div></>;
}
