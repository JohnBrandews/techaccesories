import { PrismaClient } from "@prisma/client";
import { hashPassword } from "../src/lib/password";

const prisma = new PrismaClient();

const categories = [
  { name: "Laptops & MacBooks", slug: "laptops-macbooks", sortOrder: 1 },
  { name: "Workstations", slug: "workstations", sortOrder: 2 },
  { name: "4K Displays", slug: "4k-displays", sortOrder: 3 },
  { name: "Printers & Scanners", slug: "printers-scanners", sortOrder: 4 },
  { name: "Conference AV", slug: "conference-av", sortOrder: 5 },
  { name: "Enterprise Network", slug: "enterprise-network", sortOrder: 6 },
  { name: "NVMe & NAS Storage", slug: "nvme-nas-storage", sortOrder: 7 },
  { name: "PC Accessories", slug: "pc-accessories", sortOrder: 8 },
];

const brands = [
  { name: "Apple", slug: "apple" },
  { name: "Dell", slug: "dell" },
  { name: "Logitech", slug: "logitech" },
  { name: "Samsung", slug: "samsung" },
];

async function main() {
  const adminEmail = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const adminPassword = process.env.ADMIN_PASSWORD;
  if (adminEmail && adminPassword) {
    await prisma.user.upsert({
      where: { email: adminEmail },
      update: { passwordHash: hashPassword(adminPassword), role: "admin" },
      create: { email: adminEmail, passwordHash: hashPassword(adminPassword), role: "admin", name: "Store Admin" },
    });
  }

  for (const category of categories) {
    await prisma.category.upsert({
      where: { slug: category.slug },
      update: category,
      create: category,
    });
  }

  for (const brand of brands) {
    await prisma.brand.upsert({
      where: { slug: brand.slug },
      update: brand,
      create: brand,
    });
  }

  const categoryBySlug = Object.fromEntries(
    (await prisma.category.findMany()).map((category) => [category.slug, category.id]),
  );
  const brandBySlug = Object.fromEntries(
    (await prisma.brand.findMany()).map((brand) => [brand.slug, brand.id]),
  );

  const products = [
    {
      name: 'Apple MacBook Pro 14" M3 Pro',
      slug: "apple-macbook-pro-14-m3-pro",
      description: "A powerful 14-inch MacBook Pro for creative work and demanding everyday tasks.",
      sku: "TA-APL-MBP14-M3P",
      model: "MacBook Pro 14-inch (M3 Pro)",
      categoryId: categoryBySlug["laptops-macbooks"],
      brandId: brandBySlug.apple,
      priceMinor: 28900000,
      compareAtMinor: 30500000,
      stockQuantity: 6,
      warrantyMonths: 12,
      isFeatured: true,
      specifications: JSON.stringify({ processor: "Apple M3 Pro", memory: "18GB unified memory", storage: "512GB SSD", display: "14.2-inch Liquid Retina XDR" }),
      imageUrl: "https://images.unsplash.com/photo-1517336714731-489689fd1ca8?auto=format&fit=crop&w=900&q=85",
      imageAlt: "Silver laptop open on a desk",
    },
    {
      name: "Dell XPS 15 Creator Edition",
      slug: "dell-xps-15-creator-edition",
      description: "A premium creator laptop with a vivid display and performance for professional workflows.",
      sku: "TA-DEL-XPS15-9530",
      model: "XPS 15",
      categoryId: categoryBySlug["laptops-macbooks"],
      brandId: brandBySlug.dell,
      priceMinor: 31500000,
      stockQuantity: 4,
      warrantyMonths: 12,
      isFeatured: true,
      specifications: JSON.stringify({ processor: "Intel Core i7", memory: "32GB DDR5", storage: "1TB SSD", display: "15.6-inch OLED" }),
      imageUrl: "https://images.unsplash.com/photo-1496181133206-80ce9b88a853?auto=format&fit=crop&w=900&q=85",
      imageAlt: "Thin laptop on a clean workspace",
    },
    {
      name: "Samsung Odyssey 32-inch 4K Monitor",
      slug: "samsung-odyssey-32-4k-monitor",
      description: "Immersive 4K detail and smooth performance for gaming, design and productivity.",
      sku: "TA-SAM-OD32-4K",
      model: "Odyssey 32-inch",
      categoryId: categoryBySlug["4k-displays"],
      brandId: brandBySlug.samsung,
      priceMinor: 8450000,
      stockQuantity: 8,
      warrantyMonths: 24,
      isFeatured: true,
      specifications: JSON.stringify({ resolution: "4K UHD", refreshRate: "144Hz", panel: "IPS", size: "32 inches" }),
      imageUrl: "https://images.unsplash.com/photo-1527443224154-c4a3942d3acf?auto=format&fit=crop&w=900&q=85",
      imageAlt: "Large monitor on a desk",
    },
    {
      name: "Logitech MX Master 3S Wireless Mouse",
      slug: "logitech-mx-master-3s",
      description: "Quiet, precise wireless control designed for long workdays and multi-device setups.",
      sku: "TA-LOG-MX3S",
      model: "MX Master 3S",
      categoryId: categoryBySlug["pc-accessories"],
      brandId: brandBySlug.logitech,
      priceMinor: 1650000,
      stockQuantity: 14,
      warrantyMonths: 12,
      isFeatured: true,
      specifications: JSON.stringify({ sensor: "8,000 DPI", connectivity: "Bluetooth / USB receiver", battery: "USB-C rechargeable" }),
      imageUrl: "https://images.unsplash.com/photo-1527814050087-3793815479db?auto=format&fit=crop&w=900&q=85",
      imageAlt: "Wireless computer mouse",
    },
    {
      name: "Apple MacBook Air 15-inch M3",
      slug: "apple-macbook-air-15-m3",
      description: "A light, large-screen laptop with Apple silicon performance for work and study.",
      sku: "TA-APL-MBA15-M3",
      model: "MacBook Air 15-inch (M3)",
      categoryId: categoryBySlug["laptops-macbooks"],
      brandId: brandBySlug.apple,
      priceMinor: 21400000,
      stockQuantity: 9,
      warrantyMonths: 12,
      isFeatured: false,
      specifications: JSON.stringify({ processor: "Apple M3", memory: "16GB unified memory", storage: "512GB SSD", display: "15.3-inch Liquid Retina" }),
      imageUrl: "https://images.unsplash.com/photo-1511385348-a52b4a160dc2?auto=format&fit=crop&w=900&q=85",
      imageAlt: "Open laptop viewed from the front",
    },
    {
      name: "Logitech Brio 4K Webcam",
      slug: "logitech-brio-4k-webcam",
      description: "A crisp 4K webcam for meetings, remote collaboration and streaming.",
      sku: "TA-LOG-BRIO4K",
      model: "Brio 4K",
      categoryId: categoryBySlug["conference-av"],
      brandId: brandBySlug.logitech,
      priceMinor: 2790000,
      stockQuantity: 11,
      warrantyMonths: 12,
      isFeatured: false,
      specifications: JSON.stringify({ resolution: "4K Ultra HD", connection: "USB-C", features: "Autofocus, privacy shutter" }),
      imageUrl: "https://images.unsplash.com/photo-1587825140708-dfaf72ae4b04?auto=format&fit=crop&w=900&q=85",
      imageAlt: "Webcam mounted above a monitor",
    },
  ];

  for (const { imageUrl, imageAlt, ...product } of products) {
    const catalogProduct = { ...product, isPublished: true };
    const savedProduct = await prisma.product.upsert({
      where: { slug: product.slug },
      update: catalogProduct,
      create: catalogProduct,
    });

    await prisma.productImage.deleteMany({
      where: { productId: savedProduct.id },
    });
    await prisma.productImage.create({
      data: {
        productId: savedProduct.id,
        url: imageUrl,
        altText: imageAlt,
        sortOrder: 0,
      },
    });
  }
}

main()
  .catch((error: unknown) => {
    console.error("Failed to seed TechAccesories catalog:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
