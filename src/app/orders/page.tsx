import Link from "next/link";
import { StoreHeader } from "@/components/store-header";
import { formatPrice } from "@/lib/format";
import { prisma } from "@/lib/prisma";

export const dynamic="force-dynamic";
export default async function OrdersPage({searchParams}:{searchParams:Promise<{reference?:string;email?:string}>}) {
  const params=await searchParams;const reference=params.reference?.trim()??"";const email=params.email?.trim().toLowerCase()??"";
  const [categories,order]=await Promise.all([prisma.category.findMany({where:{isActive:true,parentId:null},orderBy:{sortOrder:"asc"},select:{id:true,name:true,slug:true}}),reference&&email?prisma.order.findFirst({where:{reference,email},include:{items:true}}):Promise.resolve(null)]);
  return <><StoreHeader categories={categories}/><main className="page-shell content-width"><div className="breadcrumbs"><Link href="/">Home</Link> / Track an order</div><span className="eyebrow">ORDER SUPPORT</span><h1>Track your order</h1><p className="page-intro">Enter the order reference and email address used at checkout.</p><form className="order-lookup" action="/orders"><label>Order reference<input name="reference" required defaultValue={reference} placeholder="TA-…"/></label><label>Email address<input type="email" name="email" required defaultValue={email} placeholder="you@example.com"/></label><button className="primary-button">Find order</button></form>{reference&&email?(order?<section className="lookup-result"><span className="eyebrow">{order.reference}</span><h2>Order status: {order.status}</h2><p>Payment: {order.paymentStatus} · Placed {order.createdAt.toLocaleDateString("en-KE")}</p>{order.items.map(item=><div key={item.id} className="order-line"><span>{item.productName} × {item.quantity}</span><strong>{formatPrice(item.lineTotalMinor)}</strong></div>)}</section>:<p className="form-error" role="status">We couldn’t find an order matching those details.</p>):null}</main></>;
}
