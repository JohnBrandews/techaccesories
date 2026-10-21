import type { Prisma } from "@prisma/client";

export async function resolveProductBrand(tx: Prisma.TransactionClient, selectedId: string | null, typedName: unknown) {
  const nameFromOption = selectedId?.startsWith("new:") ? selectedId.slice(4) : "";
  const name = (selectedId === "__custom" ? (typeof typedName === "string" ? typedName : "") : nameFromOption).trim().slice(0, 80);
  if (selectedId && !name && selectedId !== "__custom") {
    const existing = await tx.brand.findUnique({ where: { id: selectedId }, select: { id: true } });
    if (!existing) throw new Error("Choose a valid brand.");
    return existing.id;
  }
  if (!name) return null;
  const sameName = await tx.brand.findUnique({ where: { name }, select: { id: true } });
  if (sameName) return sameName.id;
  const baseSlug = name.toLowerCase().normalize("NFKD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 70) || "brand";
  let slug = baseSlug;
  let suffix = 2;
  while (await tx.brand.findUnique({ where: { slug }, select: { id: true } })) slug = `${baseSlug}-${suffix++}`;
  return (await tx.brand.create({ data: { name, slug }, select: { id: true } })).id;
}
