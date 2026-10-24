"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useCart } from "@/components/cart-provider";
import { SignOutButton } from "@/components/sign-out-button";

const kenyaCounties = [
  "Nairobi", "Mombasa", "Kwale", "Kilifi", "Tana River", "Lamu", "Taita Taveta", "Garissa", "Wajir", "Mandera", "Marsabit", "Isiolo", "Meru", "Tharaka-Nithi", "Embu", "Kitui", "Machakos", "Makueni", "Nyandarua", "Nyeri", "Kirinyaga", "Murang'a", "Kiambu", "Turkana", "West Pokot", "Samburu", "Trans Nzoia", "Uasin Gishu", "Elgeyo-Marakwet", "Nandi", "Baringo", "Laikipia", "Nakuru", "Narok", "Kajiado", "Kericho", "Bomet", "Kakamega", "Vihiga", "Bungoma", "Busia", "Siaya", "Kisumu", "Homa Bay", "Migori", "Kisii", "Nyamira",
];

type Account = { email: string; name: string | null; role: string };

export function StoreHeaderClient({ categories, account, siteName }: { categories: { id: string; name: string; slug: string }[]; account: Account | null; siteName: string }) {
  const { count } = useCart();
  const [countyIndex, setCountyIndex] = useState(0);
  const [menuOpen, setMenuOpen] = useState(false);
  useEffect(() => {
    const timer = window.setInterval(() => setCountyIndex(current => (current + 1) % kenyaCounties.length), 3500);
    return () => window.clearInterval(timer);
  }, []);

  const dashboardHref = account?.role === "admin" ? "/admin" : "/account";
  const profileName = account?.name?.trim() || account?.email.split("@")[0] || "My account";

  return <>
    <div className="announcement"><div className="announcement-inner"><span>✦ Kenya delivery options</span><span className="announcement-divider">|</span><span>Local product catalog</span><span className="announcement-divider">|</span><span className="announcement-warranty">✓ Product warranty details shown on each listing</span><span className="announcement-payment">Payment integrations are being configured</span><a href="#footer">Customer support</a></div></div>
    <header className="site-header"><div className="header-main content-width">
      <Link href="/" className="brand" aria-label={`${siteName} home`}><span className="brand-mark"><span>{siteName.slice(0, 2).toUpperCase()}</span></span><span className="brand-copy"><strong>{siteName.toUpperCase()}</strong><small>COMPUTING &amp; TECH</small></span></Link>
      <form action="/catalog" className="search-box"><input name="q" aria-label="Search products" placeholder="Search laptops, monitors, accessories..."/><button aria-label="Search">⌕</button></form>
      <div className="header-action delivery-action"><span>⌖</span><div><small>DELIVER TO</small><strong key={countyIndex} className="delivery-county" aria-live="polite">{kenyaCounties[countyIndex]}, KE</strong></div></div>
      {account ? <details className="account-menu"><summary className="header-action account-action"><span className="profile-avatar">{profileName.slice(0, 1).toUpperCase()}</span><div><small>MY PROFILE</small><strong>{profileName}</strong></div><span className="profile-caret">⌄</span></summary><div className="account-dropdown"><span className="account-email">{account.email}</span><Link className="account-dashboard-link" href={dashboardHref}>Dashboard</Link><SignOutButton/></div></details> : <Link className="header-action account-action" href="/login"><span className="profile-avatar">♙</span><div><small>ACCOUNT</small><strong>Log in / Sign up</strong></div></Link>}
      <Link className="cart-action" href="/cart"><span className="cart-icon">▢<i>{count}</i></span><strong>Cart</strong></Link>
      <button className="mobile-menu-toggle" type="button" aria-label={menuOpen ? "Close menu" : "Open menu"} aria-expanded={menuOpen} aria-controls="main-category-nav" onClick={() => setMenuOpen(open => !open)}><span/><span/><span/></button>
    </div><nav id="main-category-nav" className={`category-nav content-width${menuOpen ? " is-open" : ""}`} aria-label="Main categories" onClick={() => setMenuOpen(false)}><Link className="all-departments" href="/catalog">All Departments</Link>{categories.slice(0, 7).map(category => <Link key={category.id} href={`/category/${category.slug}`}>{category.name}</Link>)}<Link href="/orders">Track an order</Link></nav></header>
  </>;
}
