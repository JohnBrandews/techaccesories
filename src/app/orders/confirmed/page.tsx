import Link from "next/link";
import { notFound } from "next/navigation";
import { StoreHeader } from "@/components/store-header";
import { formatPrice } from "@/lib/format";
import { prisma } from "@/lib/prisma";

export const dynamic="force-dynamic";
export default async function OrderConfirmedPage({searchParams}:{searchParams:Promise<{reference?:string}>}) {
  const {reference}=await searchParams;
  if(!reference||reference.length>40)notFound();
  const [categories,order]=await Promise.all([prisma.category.findMany({where:{isActive:true,parentId:null},orderBy:{sortOrder:"asc"},select:{id:true,name:true,slug:true}}),prisma.order.findUnique({where:{reference},include:{items:true}})]);
  if(!order)notFound();
  return <><StoreHeader categories={categories}/><main className="page-shell content-width"><div className="confirmation-card"><span className="confirmation-icon">✓</span><span className="eyebrow">ORDER RECEIVED</span><h1>Thanks, {order.customerName.split(" ")[0]}.</h1><p>Your demo order <strong>{order.reference}</strong> has been saved.</p><div className="checkout-notice">Payment status: pending. No payment was collected. The store will confirm delivery arrangements.</div><div className="confirmation-lines">{order.items.map(item=><div key={item.id}><span>{item.productName} × {item.quantity}</span><strong>{formatPrice(item.lineTotalMinor)}</strong></div>)}<div className="summary-total"><span>Order subtotal</span><strong>{formatPrice(order.totalMinor)}</strong></div></div><p className="muted-copy">A confirmation reference is shown here for your records. Use it with your email on the order lookup page.</p><div className="detail-actions"><Link className="primary-button" href={`/orders?reference=${encodeURIComponent(order.reference)}`}>View order status</Link><Link className="secondary-button" href="/catalog">Continue shopping</Link></div></div></main></>;
}
