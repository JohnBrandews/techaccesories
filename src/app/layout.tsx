import type { Metadata } from "next";
import { CartProvider } from "@/components/cart-provider";
import { getSiteSettings } from "@/lib/site-settings";
import "./globals.css";

export async function generateMetadata(): Promise<Metadata> {
  const { siteName } = await getSiteSettings();
  return { title: `${siteName} | Computing & Tech`, description: `Shop genuine laptops, computer accessories and technology in Kenya with trusted warranty and delivery from ${siteName}.` };
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body><CartProvider>{children}</CartProvider></body>
    </html>
  );
}
