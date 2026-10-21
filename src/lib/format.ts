export function formatPrice(priceMinor: number) {
  return `KSh ${new Intl.NumberFormat("en-KE", { maximumFractionDigits: 0 }).format(priceMinor / 100)}`;
}
