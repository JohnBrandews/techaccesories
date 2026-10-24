"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { SignOutButton } from "@/components/sign-out-button";

const sections = [
  { href: "/admin", label: "Dashboard", icon: "▦" },
  { href: "/admin/products", label: "Products", icon: "▣" },
  { href: "/admin/orders", label: "Orders", icon: "🛒" },
  { href: "/admin/customers", label: "Customers", icon: "♙" },
  { href: "/admin/categories", label: "Categories", icon: "▤" },
  { href: "/admin/settings", label: "Settings", icon: "⚙" },
];

const pageTitles: Record<string, string> = {
  "/admin": "Overview", "/admin/products": "Products", "/admin/orders": "Orders",
  "/admin/customers": "Customers", "/admin/categories": "Categories", "/admin/settings": "Settings",
};

export function AdminShell({ children, siteName, email }: { children: React.ReactNode; siteName: string; email: string }) {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const title = pageTitles[pathname] ?? "Store operations";
  return <div className="admin-shell">
    {menuOpen ? <button className="admin-sidebar-backdrop" aria-label="Close navigation" onClick={() => setMenuOpen(false)}/> : null}
    <aside className={`admin-sidebar${menuOpen ? " is-open" : ""}`}>
      <Link className="admin-sidebar-brand" href="/admin" onClick={() => setMenuOpen(false)}><strong>{siteName}</strong><span>ADMIN CONSOLE</span></Link>
      <nav aria-label="Admin navigation">{sections.map(section => {
        const active = section.href === "/admin" ? pathname === section.href : pathname.startsWith(section.href);
        return <Link key={section.href} className={active ? "is-active" : ""} aria-current={active ? "page" : undefined} href={section.href} onClick={() => setMenuOpen(false)}><span aria-hidden="true">{section.icon}</span>{section.label}</Link>;
      })}</nav>
      <div className="admin-sidebar-bottom"><Link className="admin-store-link" href="/">↗ <span>View storefront</span></Link><div className="admin-sidebar-logout"><SignOutButton/></div></div>
    </aside>
    <div className="admin-workspace">
      <header className="admin-topbar"><button className="admin-menu-toggle" aria-label="Open navigation" aria-expanded={menuOpen} onClick={() => setMenuOpen(true)}>☰</button><div className="admin-topbar-title"><h1>{title}</h1><p>Welcome back. Here&apos;s what&apos;s happening today.</p></div><div className="admin-topbar-user"><span>{email.slice(0, 1).toUpperCase()}</span><div><strong>{email}</strong><small>Administrator</small></div></div></header>
      <main className="admin-content">{children}</main>
    </div>
  </div>;
}
