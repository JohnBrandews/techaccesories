export type ProductImageInput = { url: string; altText: string; sortOrder: number };

export function parseProductImages(value: unknown, fallbackUrl?: unknown, fallbackAlt = "Product image"): ProductImageInput[] | null {
  if (typeof value !== "string") {
    if (typeof fallbackUrl === "string" && fallbackUrl.trim()) {
      const url = fallbackUrl.trim();
      return url.startsWith("/") || url.startsWith("https://") ? [{ url, altText: fallbackAlt, sortOrder: 0 }] : null;
    }
    return [];
  }
  let parsed: unknown;
  try { parsed = JSON.parse(value) as unknown; } catch { return null; }
  if (!Array.isArray(parsed) || parsed.length > 12) return null;
  const images: ProductImageInput[] = [];
  for (const [index, entry] of parsed.entries()) {
    if (!entry || typeof entry !== "object" || Array.isArray(entry)) return null;
    const { url, altText } = entry as Record<string, unknown>;
    if (typeof url !== "string" || !(url.startsWith("/") || url.startsWith("https://")) || url.length > 2048) return null;
    if (typeof altText !== "string" || altText.length > 160) return null;
    images.push({ url, altText: altText.trim() || `${fallbackAlt} ${index + 1}`, sortOrder: index });
  }
  return images;
}
