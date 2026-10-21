import { randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { adminNotificationAddress, emailButton, emailLayout, emailParagraph, publicSiteUrl, sendTransactionalEmail } from "@/lib/email";
import { formatPrice } from "@/lib/format";

type RequestItem={productId:string;quantity:number};
class OrderConflict extends Error {}
export async function POST(request:Request) {
  let body:Record<string,unknown>;
  try { body=await request.json() as Record<string,unknown>; } catch { return NextResponse.json({error:"Invalid request."},{status:400}); }
  const customerName=typeof body.customerName==="string"?body.customerName.trim():"";
  const email=typeof body.email==="string"?body.email.trim().toLowerCase():"";
  const phone=typeof body.phone==="string"?body.phone.trim():"";
  const address=typeof body.address==="string"?body.address.trim():"";
  const city=typeof body.city==="string"?body.city.trim():"";
  const postalCode=typeof body.postalCode==="string"?body.postalCode.trim():"";
  const notes=typeof body.notes==="string"?body.notes.trim():"";
  if (!customerName||customerName.length>100||!/^\S+@\S+\.\S+$/.test(email)||email.length>254||!phone||phone.length>30||!address||address.length>240||!city||city.length>80||postalCode.length>20||notes.length>500) return NextResponse.json({error:"Check your contact and delivery details."},{status:400});
  if(!Array.isArray(body.items)||body.items.length<1||body.items.length>30) return NextResponse.json({error:"Your cart is empty or has too many items."},{status:400});
  const quantities=new Map<string,number>();
  for(const raw of body.items as RequestItem[]) { if(!raw||typeof raw.productId!=="string"||raw.productId.length>30||!Number.isInteger(raw.quantity)||raw.quantity<1||raw.quantity>20) return NextResponse.json({error:"One or more cart quantities are invalid."},{status:400}); quantities.set(raw.productId,(quantities.get(raw.productId)??0)+raw.quantity); }
  if([...quantities.values()].some(quantity=>quantity>20)) return NextResponse.json({error:"Maximum quantity is 20 per product."},{status:400});
  try {
    const reference=`TA-${Date.now().toString(36).toUpperCase()}-${randomBytes(3).toString("hex").toUpperCase()}`;
    const createdOrder=await prisma.$transaction(async(tx)=>{
      const products=await tx.product.findMany({where:{id:{in:[...quantities.keys()]},isPublished:true,category:{isActive:true}},include:{category:true}});
      if(products.length!==quantities.size)throw new OrderConflict("A product in your cart is no longer available.");
      let subtotalMinor=0;
      const orderItems=products.map(product=>{const quantity=quantities.get(product.id)!;if(product.stockQuantity<quantity)throw new OrderConflict(`${product.name} no longer has enough stock.`);const lineTotalMinor=product.priceMinor*quantity;if(!Number.isSafeInteger(lineTotalMinor)||lineTotalMinor>2_000_000_000)throw new OrderConflict("An item total is above the supported demo checkout limit.");subtotalMinor+=lineTotalMinor;if(subtotalMinor>2_000_000_000)throw new OrderConflict("This order is above the supported demo checkout limit.");return {productId:product.id,productName:product.name,sku:product.sku,quantity,unitPriceMinor:product.priceMinor,lineTotalMinor};});
      for(const product of products){const quantity=quantities.get(product.id)!;const updated=await tx.product.updateMany({where:{id:product.id,isPublished:true,stockQuantity:{gte:quantity}},data:{stockQuantity:{decrement:quantity}}});if(updated.count!==1)throw new OrderConflict(`${product.name} stock changed. Please review your cart.`);await tx.inventoryMovement.create({data:{productId:product.id,delta:-quantity,previous:product.stockQuantity,next:product.stockQuantity-quantity,reason:`Demo order ${reference}`}});}
      return tx.order.create({data:{reference,customerName,email,phone,address,city,postalCode:postalCode||null,notes:notes||null,paymentMethod:"demo",paymentStatus:"pending",status:"pending",subtotalMinor,deliveryMinor:0,totalMinor:subtotalMinor,items:{create:orderItems}},include:{items:true}});
    });
    const siteUrl=publicSiteUrl(new URL(request.url).origin);
    const total=formatPrice(createdOrder.totalMinor);
    const adminText=`A new order has been placed.\nReference: ${reference}\nCustomer: ${customerName}\nEmail: ${email}\nPhone: ${phone}\nTotal: ${total}\nPayment status: ${createdOrder.paymentStatus}\nFulfilment status: ${createdOrder.status}\n\nReview this order in the admin dashboard: ${siteUrl}/admin`;
    const adminHtml=emailLayout(`<h1 style="color:#12345a">New order received</h1>${emailParagraph(`Order ${reference} has been placed by ${customerName}.`)}${emailParagraph(`Customer: ${customerName} · ${email} · ${phone}`)}${emailParagraph(`Order total: ${total}`)}${emailParagraph(`Payment status: ${createdOrder.paymentStatus}. Fulfilment status: ${createdOrder.status}.`)}${emailButton("Review order in dashboard",`${siteUrl}/admin`)}`);
    const customerText=`Hi ${customerName},\n\nYour order ${reference} has been placed. Total: ${total}. Payment status: ${createdOrder.paymentStatus}. You can follow its status here: ${siteUrl}/orders?reference=${encodeURIComponent(reference)}&email=${encodeURIComponent(email)}`;
    const customerHtml=emailLayout(`<h1 style="color:#12345a">Your order has been placed</h1>${emailParagraph(`Hi ${customerName}, we received your order ${reference}.`)}${emailParagraph(`Order total: ${total}. Payment status: ${createdOrder.paymentStatus}.`)}${emailParagraph("We’ll email you when your order is dispatched and delivered.")}${emailButton("Track your order",`${siteUrl}/orders?reference=${encodeURIComponent(reference)}&email=${encodeURIComponent(email)}`)}`);
    const emailResults=await Promise.allSettled([
      sendTransactionalEmail({to:adminNotificationAddress(),name:"TechAccesories Admin",subject:`New order ${reference} received`,text:adminText,html:adminHtml}),
      sendTransactionalEmail({to:email,name:customerName,subject:`Order ${reference} received`,text:customerText,html:customerHtml}),
    ]);
    for(const result of emailResults)if(result.status==="rejected")console.error("Order email could not be sent:",result.reason instanceof Error?result.reason.message:"Unknown email error");
    return NextResponse.json({reference},{status:201});
  } catch(error) { if(error instanceof OrderConflict)return NextResponse.json({error:error.message},{status:409});return NextResponse.json({error:"Could not place this order. Please try again."},{status:500}); }
}
