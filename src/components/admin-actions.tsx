"use client";

import { useState, type FormEvent } from "react";
import Image from "next/image";

type Choice = { id: string; name: string };

const commonBrands = ["Acer", "Anker", "ASUS", "Beats", "Canon", "Corsair", "Dell", "Epson", "Google", "HP", "Huawei", "Infinix", "JBL", "Lenovo", "Logitech", "Microsoft", "MSI", "OnePlus", "Razer", "Samsung", "Sony", "Tecno", "TP-Link", "Xiaomi"];
const specificationOptions = ["Processor / CPU", "RAM / Memory", "Storage", "Graphics", "Display size", "Resolution", "Refresh rate", "Keyboard", "Operating system", "Camera", "Battery", "Connectivity", "Ports", "Color", "Weight"];

function BrandField({ brands, defaultValue = "" }: { brands: Choice[]; defaultValue?: string }) {
  const [selected, setSelected] = useState(defaultValue);
  const knownNames = new Set(brands.map(brand => brand.name.toLowerCase()));
  const showCustom = selected === "__custom";
  return <>
    <label>Brand<select name="brandId" value={selected} onChange={event => setSelected(event.target.value)}><option value="">{defaultValue ? "Unbranded" : "Select or type a brand"}</option>{brands.map(brand => <option key={brand.id} value={brand.id}>{brand.name}</option>)}{commonBrands.filter(name => !knownNames.has(name.toLowerCase())).map(name => <option key={name} value={`new:${name}`}>{name}</option>)}<option value="__custom">Type another brand…</option></select></label>
    {showCustom ? <label>Brand name<input name="brandName" maxLength={80} placeholder="Enter brand name" required/></label> : null}
  </>;
}

function SpecificationFields({ defaultValue = "{}" }: { defaultValue?: string }) {
  let initial: Record<string, string> = {};
  try { const value = JSON.parse(defaultValue) as unknown; if (value && typeof value === "object" && !Array.isArray(value)) initial = Object.fromEntries(Object.entries(value).filter((entry): entry is [string, string] => typeof entry[1] === "string")); } catch { /* Start with empty specifications for invalid legacy data. */ }
  const [values, setValues] = useState(initial);
  const [newName, setNewName] = useState("");
  const [customFields, setCustomFields] = useState<string[]>(Object.keys(initial).filter(key => !specificationOptions.includes(key)));
  const toggle = (name: string, checked: boolean) => setValues(current => { const next = { ...current }; if (checked) next[name] = next[name] ?? ""; else delete next[name]; return next; });
  function addCustomField() { const name = newName.trim().slice(0, 80); if (!name || specificationOptions.includes(name) || customFields.includes(name)) return; setCustomFields(current => [...current, name]); toggle(name, true); setNewName(""); }
  return <fieldset className="specification-fields form-wide"><legend>Product specifications</legend><p>Select the details that apply, then enter their values.</p><div className="specification-checkboxes">{specificationOptions.map(name => <label className="check-filter" key={name}><input type="checkbox" checked={Object.hasOwn(values, name)} onChange={event => toggle(name, event.target.checked)}/>{name}</label>)}</div>
    {[...specificationOptions.filter(name => Object.hasOwn(values, name)), ...customFields.filter(name => Object.hasOwn(values, name))].map(name => <label className="specification-value" key={name}><span>{name}</span><input value={values[name] ?? ""} maxLength={240} onChange={event => setValues(current => ({ ...current, [name]: event.target.value }))}/></label>)}
    <div className="custom-specification"><label>Other detail<input value={newName} maxLength={80} onChange={event => setNewName(event.target.value)} placeholder="e.g. Included accessories"/></label><button className="secondary-button" type="button" onClick={addCustomField}>Add detail</button></div>
    {customFields.map(name => <button className="text-button" type="button" key={name} onClick={() => { toggle(name, false); setCustomFields(current => current.filter(item => item !== name)); }}>Remove {name}</button>)}
    <input type="hidden" name="specifications" value={JSON.stringify(Object.fromEntries(Object.entries(values).filter(([, value]) => value.trim())))}/>
  </fieldset>;
}

type ProductImageValue = { url: string; altText: string };
function CloudinaryProductImagesField({ defaultValue = [] }: { defaultValue?: ProductImageValue[] }) {
  const [images, setImages] = useState(defaultValue);
  const [message, setMessage] = useState("");
  const [uploading, setUploading] = useState(false);

  async function upload(files: FileList) {
    setUploading(true); setMessage("");
    try {
      const uploaded: ProductImageValue[] = [];
      for (const file of Array.from(files)) {
        const data = new FormData(); data.set("file", file);
        const response = await fetch("/api/admin/uploads", { method: "POST", body: data });
        const result = await response.json() as { url?: string; error?: string };
        if (!response.ok || !result.url) throw new Error(result.error ?? `Could not upload ${file.name}.`);
        uploaded.push({ url: result.url, altText: "" });
      }
      setImages(current => [...current, ...uploaded]);
      setMessage(`${uploaded.length} image${uploaded.length === 1 ? "" : "s"} uploaded. Add a color or angle label to each image.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not upload the image.");
    } finally { setUploading(false); }
  }

  function move(index: number, direction: -1 | 1) {
    setImages(current => {
      const target = index + direction;
      if (target < 0 || target >= current.length) return current;
      const next = [...current]; [next[index], next[target]] = [next[target], next[index]]; return next;
    });
  }

  return <div className="form-wide image-upload-field">
    <label>Upload product photos to Cloudinary<input type="file" multiple accept="image/jpeg,image/png,image/webp,image/avif" disabled={uploading} onChange={event => { const files = event.target.files; if (files?.length) void upload(files); event.target.value = ""; }}/><small>Upload multiple colors or product angles. JPG, PNG, WebP or AVIF, up to 8 MB each.</small></label>
    {uploading ? <small role="status">Uploading images?</small> : null}
    {message ? <small role="status">{message}</small> : null}
    {images.length ? <div className="admin-image-list">{images.map((image, index) => <div className="admin-image-item" key={`${image.url}-${index}`}><Image className="product-image-preview" src={image.url} alt={image.altText || `Product image ${index + 1}`} width={108} height={90} unoptimized/><label><span>{index === 0 ? "Main photo" : `Photo ${index + 1}`} ? label / color</span><input value={image.altText} maxLength={160} placeholder={index === 0 ? "e.g. Silver, front view" : "e.g. Midnight black, side view"} onChange={event => setImages(current => current.map((item, i) => i === index ? { ...item, altText: event.target.value } : item))}/></label><div className="admin-image-actions"><button className="secondary-button" type="button" disabled={index === 0} aria-label="Move photo earlier" onClick={() => move(index, -1)}>?</button><button className="secondary-button" type="button" disabled={index === images.length - 1} aria-label="Move photo later" onClick={() => move(index, 1)}>?</button><button className="text-button" type="button" onClick={() => setImages(current => current.filter((_, i) => i !== index))}>Remove</button></div></div>)}</div> : null}
    <input type="hidden" name="productImages" value={JSON.stringify(images)}/>
  </div>;
}

export function AdminProductForm({ categories, brands }: { categories: Choice[]; brands: Choice[] }) {
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setSaving(true); setMessage("");
    const form = event.currentTarget; const data = new FormData(form);
    const payload: Record<string, FormDataEntryValue | boolean> = Object.fromEntries(data.entries());
    payload.isFeatured = data.get("isFeatured") === "on";
    try {
      const response = await fetch("/api/admin/products", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      const result = await response.json() as { error?: string };
      if (!response.ok) throw new Error(result.error ?? "Could not create product.");
      window.location.reload();
    } catch (error) { setMessage(error instanceof Error ? error.message : "Could not create product."); setSaving(false); }
  }
  return <form className="admin-product-form" onSubmit={submit}>
    <label>Product name<input name="name" required maxLength={160}/></label>
    <label>Slug (optional)<input name="slug" placeholder="generated-from-name" maxLength={180}/></label>
    <label>SKU<input name="sku" required maxLength={64}/></label>
    <label>Model<input name="model" maxLength={100}/></label>
    <BrandField brands={brands}/>
    <label>Category<select name="categoryId" required defaultValue=""><option value="">Select category</option>{categories.map(category => <option key={category.id} value={category.id}>{category.name}</option>)}</select></label>
    <label>Price (KSh)<input name="priceKsh" type="number" min="1" step="0.01" required/></label>
    <label>Initial stock<input name="stockQuantity" type="number" min="0" max="100000" defaultValue="0" required/></label>
    <label>Warranty (months)<input name="warrantyMonths" type="number" min="0" max="120"/></label>
    <CloudinaryProductImagesField/>
    <label className="form-wide">Description<textarea name="description" rows={4} required maxLength={8000}/></label>
    <SpecificationFields/>
    <label className="check-filter form-wide"><input name="isFeatured" type="checkbox"/> Feature on the storefront</label>
    <button className="primary-button" disabled={saving}>{saving ? "Saving…" : "Create product"}</button>
    {message ? <p className="admin-form-message" role="alert">{message}</p> : null}
  </form>;
}

export function StockAdjustment({ id, stock }: { id: string; stock: number }) {
  const [value, setValue] = useState(String(stock)); const [message, setMessage] = useState(""); const [saving, setSaving] = useState(false);
  async function save() {
    setSaving(true); setMessage("");
    try {
      const response = await fetch(`/api/admin/products/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ stockQuantity: Number(value), reason: "Admin dashboard adjustment" }) });
      const result = await response.json() as { error?: string };
      if (!response.ok) throw new Error(result.error ?? "Could not update stock.");
      window.location.reload();
    } catch (error) { setMessage(error instanceof Error ? error.message : "Could not update stock."); setSaving(false); }
  }
  return <span className="stock-editor"><input aria-label="Set stock quantity" type="number" min="0" max="100000" value={value} onChange={event => setValue(event.target.value)}/><button className="secondary-button" disabled={saving || Number(value) === stock} onClick={save}>{saving ? "Saving" : "Save"}</button>{message ? <small role="alert">{message}</small> : null}</span>;
}

type EditableProduct = { id: string; name: string; slug: string; sku: string; model: string | null; description: string; categoryId: string; brandId: string | null; priceMinor: number; stockQuantity: number; warrantyMonths: number | null; specifications: string; isPublished: boolean; isFeatured: boolean; images: ProductImageValue[] };
export function ProductEditor({ product, categories, brands }: { product: EditableProduct; categories: Choice[]; brands: Choice[] }) {
  const [message, setMessage] = useState(""); const [saving, setSaving] = useState(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setSaving(true); setMessage("");
    const data = new FormData(event.currentTarget); const body: Record<string, FormDataEntryValue | boolean> = Object.fromEntries(data.entries());
    body.isPublished = data.get("isPublished") === "on"; body.isFeatured = data.get("isFeatured") === "on";
    try {
      const response = await fetch(`/api/admin/products/${product.id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const result = await response.json() as { error?: string };
      if (!response.ok) throw new Error(result.error ?? "Could not update product.");
      window.location.reload();
    } catch (error) { setMessage(error instanceof Error ? error.message : "Could not update product."); setSaving(false); }
  }
  return <details className="product-editor"><summary>Edit details</summary><form className="admin-product-form" onSubmit={submit}>
    <label>Name<input name="name" required defaultValue={product.name} maxLength={160}/></label>
    <label>Slug<input name="slug" required defaultValue={product.slug} maxLength={180}/></label>
    <label>SKU<input name="sku" required defaultValue={product.sku} maxLength={64}/></label>
    <label>Model<input name="model" defaultValue={product.model ?? ""} maxLength={100}/></label>
    <BrandField brands={brands} defaultValue={product.brandId ?? ""}/>
    <label>Category<select name="categoryId" defaultValue={product.categoryId}>{categories.map(category => <option key={category.id} value={category.id}>{category.name}</option>)}</select></label>
    <label>Price (KSh)<input name="priceKsh" type="number" min="1" step="0.01" defaultValue={(product.priceMinor / 100).toFixed(2)} required/></label>
    <label>Stock<input name="stockQuantity" type="number" min="0" max="100000" defaultValue={product.stockQuantity} required/></label>
    <label>Warranty (months)<input name="warrantyMonths" type="number" min="0" max="120" defaultValue={product.warrantyMonths ?? ""}/></label>
    <CloudinaryProductImagesField defaultValue={product.images}/>
    <label className="form-wide">Description<textarea name="description" rows={3} defaultValue={product.description} required maxLength={8000}/></label>
    <SpecificationFields defaultValue={product.specifications}/>
    <label className="check-filter"><input name="isPublished" type="checkbox" defaultChecked={product.isPublished}/> Published</label>
    <label className="check-filter"><input name="isFeatured" type="checkbox" defaultChecked={product.isFeatured}/> Featured</label>
    <button className="primary-button" disabled={saving}>{saving ? "Saving…" : "Save product"}</button>
    {message ? <p className="admin-form-message" role="alert">{message}</p> : null}
  </form><DeleteProductButton id={product.id} name={product.name}/></details>;
}

export function DeleteProductButton({ id, name }: { id: string; name: string }) {
  const [message, setMessage] = useState(""); const [busy, setBusy] = useState(false);
  async function remove() {
    if (!window.confirm(`Delete ${name}? This cannot be undone.`)) return;
    setBusy(true); setMessage("");
    try {
      const response = await fetch(`/api/admin/products/${id}`, { method: "DELETE" }); const result = await response.json() as { error?: string; archived?: boolean };
      if (!response.ok) throw new Error(result.error ?? "Could not delete product.");
      if (result.archived) window.alert("This product has stock or order history, so it was archived and removed from the storefront.");
      window.location.reload();
    } catch (error) { setMessage(error instanceof Error ? error.message : "Could not delete product."); setBusy(false); }
  }
  return <div className="delete-product-row"><button type="button" className="text-button" disabled={busy} onClick={remove}>{busy ? "Deleting…" : "Delete product"}</button>{message ? <small role="alert">{message}</small> : null}</div>;
}

export function CancelDemoOrder({ reference, status, paymentStatus, paymentMethod }: { reference: string; status: string; paymentStatus: string; paymentMethod: string }) {
  const [message, setMessage] = useState(""); const [saving, setSaving] = useState(false);
  async function cancel() {
    if (!window.confirm(`Cancel ${reference} and return its reserved stock?`)) return;
    setSaving(true);
    try { const response = await fetch(`/api/admin/orders/${encodeURIComponent(reference)}`, { method: "PATCH" }); const result = await response.json() as { error?: string }; if (!response.ok) throw new Error(result.error ?? "Could not cancel this order."); window.location.reload(); }
    catch (error) { setMessage(error instanceof Error ? error.message : "Could not cancel this order."); setSaving(false); }
  }
  return status === "pending" && paymentStatus === "pending" && paymentMethod === "demo" ? <span className="stock-editor"><button className="secondary-button" disabled={saving} onClick={cancel}>{saving ? "Cancelling…" : "Cancel & restock"}</button>{message ? <small role="alert">{message}</small> : null}</span> : null;
}

export function OrderStatusEditor({ reference, status, paymentMethod, paymentStatus }: { reference: string; status: string; paymentMethod: string; paymentStatus: string }) {
  const [value, setValue] = useState(status); const [message, setMessage] = useState(""); const [saving, setSaving] = useState(false);
  async function save() {
    setSaving(true); setMessage("");
    try { const response = await fetch(`/api/admin/orders/${encodeURIComponent(reference)}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status: value }) }); const result = await response.json() as { error?: string }; if (!response.ok) throw new Error(result.error ?? "Could not update order status."); window.location.reload(); }
    catch (error) { setMessage(error instanceof Error ? error.message : "Could not update order status."); setSaving(false); }
  }
  if (status === "cancelled") return <span className="order-cancelled">Cancelled</span>;
  if (paymentMethod === "payhero" && paymentStatus !== "paid") return <span className="muted-copy">Awaiting payment</span>;
  return <span className="stock-editor order-status-editor"><select aria-label={`Status for order ${reference}`} value={value} onChange={event => setValue(event.target.value)}><option value="pending">Pending</option><option value="dispatched">Dispatched</option><option value="delivered">Delivered</option><option value="completed">Completed</option></select><button className="secondary-button" disabled={saving || value === status} onClick={save}>{saving ? "Saving" : "Update"}</button>{message ? <small role="alert">{message}</small> : null}</span>;
}

export function AdminCategoryManager({ categories }: { categories: (Choice & { isActive: boolean })[] }) {
  const [message, setMessage] = useState(""); const [saving, setSaving] = useState(false);
  async function create(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setSaving(true); setMessage(""); const form = event.currentTarget; const body = Object.fromEntries(new FormData(form).entries());
    try { const response = await fetch("/api/admin/categories", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }); const result = await response.json() as { error?: string }; if (!response.ok) throw new Error(result.error ?? "Could not add category."); window.location.reload(); }
    catch (error) { setMessage(error instanceof Error ? error.message : "Could not add category."); setSaving(false); }
  }
  async function toggle(id: string, active: boolean) {
    setSaving(true); setMessage("");
    try { const response = await fetch(`/api/admin/categories/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ isActive: !active }) }); const result = await response.json() as { error?: string }; if (!response.ok) throw new Error(result.error ?? "Could not update category."); window.location.reload(); }
    catch (error) { setMessage(error instanceof Error ? error.message : "Could not update category."); setSaving(false); }
  }
  return <div className="category-admin"><form className="admin-category-form" onSubmit={create}><label>Category name<input name="name" required maxLength={100}/></label><label>URL slug (optional)<input name="slug" placeholder="generated-from-name" maxLength={120}/></label><label>Description<input name="description" maxLength={500}/></label><button className="primary-button" disabled={saving}>{saving ? "Saving…" : "Add category"}</button></form><div className="category-admin-list">{categories.map(category => <div key={category.id}><span>{category.name}</span><span className="category-admin-actions"><small>{category.isActive ? "Active" : "Hidden"}</small><button className="secondary-button" disabled={saving} onClick={() => toggle(category.id, category.isActive)}>{category.isActive ? "Deactivate" : "Activate"}</button></span></div>)}</div>{message ? <p className="form-error" role="alert">{message}</p> : null}</div>;
}
