import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { requireAdminRequest } from "@/lib/admin-api";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const auth = requireAdminRequest(request);
  if (auth) return auth;
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;
  if (!cloudName || !apiKey || !apiSecret) return NextResponse.json({ error: "Cloudinary is not configured. Add its cloud name, API key and API secret to .env." }, { status: 503 });

  let incoming: FormData;
  try { incoming = await request.formData(); } catch { return NextResponse.json({ error: "Choose an image to upload." }, { status: 400 }); }
  const file = incoming.get("file");
  if (!(file instanceof File)) return NextResponse.json({ error: "Choose an image file." }, { status: 400 });
  if (!new Set(["image/jpeg", "image/png", "image/webp", "image/avif"]).has(file.type)) return NextResponse.json({ error: "Upload a JPG, PNG, WebP or AVIF image." }, { status: 400 });
  if (file.size < 1 || file.size > 8 * 1024 * 1024) return NextResponse.json({ error: "Product images must be smaller than 8 MB." }, { status: 400 });

  const timestamp = Math.floor(Date.now() / 1000).toString();
  const folder = "techaccesories/products";
  const signature = createHash("sha1").update(`folder=${folder}&timestamp=${timestamp}${apiSecret}`).digest("hex");
  const payload = new FormData();
  payload.set("file", file, file.name);
  payload.set("api_key", apiKey);
  payload.set("timestamp", timestamp);
  payload.set("folder", folder);
  payload.set("signature", signature);
  try {
    const response = await fetch(`https://api.cloudinary.com/v1_1/${encodeURIComponent(cloudName)}/image/upload`, { method: "POST", body: payload, cache: "no-store" });
    const result = await response.json() as { secure_url?: string; error?: { message?: string } };
    if (!response.ok || !result.secure_url) return NextResponse.json({ error: result.error?.message ?? "Cloudinary could not upload this image." }, { status: 502 });
    return NextResponse.json({ url: result.secure_url });
  } catch {
    return NextResponse.json({ error: "Cloudinary could not be reached. Check the server connection and try again." }, { status: 502 });
  }
}
