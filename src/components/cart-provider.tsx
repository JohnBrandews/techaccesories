"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

export type CartItem = { id: string; slug: string; name: string; priceMinor: number; imageUrl: string | null; imageAlt: string; stockQuantity: number; quantity: number };
type CartContextValue = { items: CartItem[]; add: (item: Omit<CartItem, "quantity">, quantity?:number) => void; setQuantity: (id: string, quantity: number) => void; remove: (id: string) => void; clear: () => void; count: number };
const CartContext = createContext<CartContextValue | null>(null);
const STORAGE_KEY = "techaccesories-cart-v1";

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed: unknown = JSON.parse(saved);
        if (Array.isArray(parsed)) setItems(parsed.filter((item): item is CartItem => Boolean(item && typeof item.id === "string" && typeof item.slug === "string" && typeof item.name === "string" && Number.isSafeInteger(item.priceMinor) && item.priceMinor >= 0 && Number.isInteger(item.stockQuantity) && item.stockQuantity > 0 && Number.isInteger(item.quantity) && item.quantity > 0 && item.quantity <= item.stockQuantity && (item.imageUrl === null || typeof item.imageUrl === "string") && typeof item.imageAlt === "string")));
      }
    } catch { localStorage.removeItem(STORAGE_KEY); }
    setHydrated(true);
  }, []);
  useEffect(() => { if (hydrated) localStorage.setItem(STORAGE_KEY, JSON.stringify(items)); }, [items, hydrated]);
  const add = useCallback((product: Omit<CartItem, "quantity">, quantity=1) => setItems((current) => {
    const existing = current.find((item) => item.id === product.id);
    if (existing) return current.map((item) => item.id === product.id ? { ...item, ...product, quantity: Math.min(item.quantity + quantity, product.stockQuantity) } : item);
    return product.stockQuantity > 0 ? [...current, { ...product, quantity: Math.min(quantity, product.stockQuantity) }] : current;
  }), []);
  const setQuantity = useCallback((id: string, quantity: number) => setItems((current) => current.map((item) => item.id === id ? { ...item, quantity: Math.max(1, Math.min(quantity, item.stockQuantity)) } : item)), []);
  const remove = useCallback((id: string) => setItems((current) => current.filter((item) => item.id !== id)), []);
  const clear = useCallback(() => setItems([]), []);
  const count = items.reduce((total, item) => total + item.quantity, 0);
  const value = useMemo(() => ({ items, add, setQuantity, remove, clear, count }), [items, add, setQuantity, remove, clear, count]);
  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) throw new Error("useCart must be used inside CartProvider");
  return context;
}
