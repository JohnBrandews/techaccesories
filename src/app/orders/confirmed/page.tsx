import Link from "next/link";
import { notFound } from "next/navigation";
import { StoreHeader } from "@/components/store-header";
import { formatPrice } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import { OrderPaymentRefresh } from "@/components/order-payment-refresh";

export const dynamic="force-dynamic";
export default async function OrderConfirmedPage({searchParams}:{searchParams:Promise<{reference?:string}>}) {
  const {reference}=await searchParams;
  if(!reference||reference.length>40)notFound();
  const [categories,order]=await Promise.all([prisma.category.findMany({where:{isActive:true,parentId:null},orderBy:{sortOrder:"asc"},select:{id:true,name:true,slug:true}}),prisma.order.findUnique({where:{reference},include:{items:true}})]);
  if(!order)notFound();
  const paymentMessage = order.paymentStatus === "paid" ? "M-Pesa payment confirmed. Your order is now being processed." : order.paymentStatus === "failed" || order.status === "cancelled" ? "The M-Pesa payment was not completed. The order was cancelled and reserved stock was released. Please return to checkout to try again." : "Check your phone and complete the M-Pesa prompt. This page will update when PayHero confirms your payment.";
  return <><StoreHeader categories={categories}/><main className="page-shell content-width"><div className="confirmation-card"><span className="confirmation-icon">✓</span><span className="eyebrow">ORDER RECEIVED</span><h1>Thanks, {order.customerName.split(" ")[0]}.</h1><p>Your order <strong>{order.reference}</strong> has been saved.</p><div className="checkout-notice">Payment status: {order.paymentStatus}. {paymentMessage}</div><OrderPaymentRefresh pending={order.paymentStatus === "pending"}/><div className="confirmation-lines">{order.items.map(item=><div key={item.id}><span>{item.productName} × {item.quantity}</span><strong>{formatPrice(item.lineTotalMinor)}</strong></div>)}<div className="summary-total"><span>Order total</span><strong>{formatPrice(order.totalMinor)}</strong></div></div><p className="muted-copy">Use your order reference and checkout email on the order tracking page.</p><div className="detail-actions"><Link className="primary-button" href={`/orders?reference=${encodeURIComponent(order.reference)}&email=${encodeURIComponent(order.email)}`}>View order status</Link><Link className="secondary-button" href="/catalog">Continue shopping</Link></div></div></main></>;
}
