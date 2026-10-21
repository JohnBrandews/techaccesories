import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireAdminRequest } from "@/lib/admin-api";
import { resolveProductBrand } from "@/lib/brand";
import { parseProductImages } from "@/lib/product-images";

class StockUpdateError extends Error {}
export async function PATCH(request:Request,{params}:{params:Promise<{id:string}>}) {
  const auth=requireAdminRequest(request);if(auth)return auth;
  const {id}=await params;let body:Record<string,unknown>;
  try{body=await request.json() as Record<string,unknown>;}catch{return NextResponse.json({error:"Invalid request."},{status:400});}
  const stockQuantity=Number(body.stockQuantity);const reason=typeof body.reason==="string"?body.reason.trim():"Manual stock adjustment";
  if(!Number.isInteger(stockQuantity)||stockQuantity<0||stockQuantity>100000||reason.length<3||reason.length>120)return NextResponse.json({error:"Enter a valid stock count and reason."},{status:400});
  try{
    await prisma.$transaction(async(tx)=>{
      const product=await tx.product.findUnique({where:{id},select:{stockQuantity:true}});if(!product)throw new StockUpdateError("Product not found.");
      const updated=await tx.product.updateMany({where:{id,stockQuantity:product.stockQuantity},data:{stockQuantity}});if(updated.count!==1)throw new StockUpdateError("Stock changed while you were editing. Reload and try again.");
      if(stockQuantity!==product.stockQuantity)await tx.inventoryMovement.create({data:{productId:id,delta:stockQuantity-product.stockQuantity,previous:product.stockQuantity,next:stockQuantity,reason}});
    });
    return NextResponse.json({ok:true});
  }catch(error){if(error instanceof StockUpdateError)return NextResponse.json({error:error.message},{status:409});return NextResponse.json({error:"Could not update stock."},{status:500});}
}

export async function PUT(request:Request,{params}:{params:Promise<{id:string}>}){
  const auth=requireAdminRequest(request);if(auth)return auth;
  const {id}=await params;let body:Record<string,unknown>;try{body=await request.json() as Record<string,unknown>;}catch{return NextResponse.json({error:"Invalid request."},{status:400});}
  const name=typeof body.name==="string"?body.name.trim():"";const sku=typeof body.sku==="string"?body.sku.trim().toUpperCase():"";const slug=typeof body.slug==="string"?body.slug.trim().toLowerCase():"";const description=typeof body.description==="string"?body.description.trim():"";const categoryId=typeof body.categoryId==="string"?body.categoryId:"";const brandId=typeof body.brandId==="string"&&body.brandId?body.brandId:null;const model=typeof body.model==="string"?body.model.trim():"";const priceKsh=Number(body.priceKsh);const stockQuantity=Number(body.stockQuantity);const warrantyMonths=body.warrantyMonths===""||body.warrantyMonths==null?null:Number(body.warrantyMonths);const isPublished=body.isPublished===true;const isFeatured=body.isFeatured===true;
  if(!name||name.length>160||!/^[-A-Z0-9_]{3,64}$/.test(sku)||! /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)||slug.length>180||!description||description.length>8000||!Number.isFinite(priceKsh)||priceKsh<=0||priceKsh>20000000||!Number.isInteger(stockQuantity)||stockQuantity<0||stockQuantity>100000||!categoryId||!(warrantyMonths===null||(Number.isInteger(warrantyMonths)&&warrantyMonths>=0&&warrantyMonths<=120)))return NextResponse.json({error:"Review the product fields and try again."},{status:400});
  const category=await prisma.category.findFirst({where:{id:categoryId,isActive:true},select:{id:true}});if(!category)return NextResponse.json({error:"Choose an active category."},{status:400});
  let specifications:string|undefined;if(typeof body.specifications==="string"){try{const value=JSON.parse(body.specifications) as unknown;if(!value||typeof value!=="object"||Array.isArray(value)||Object.entries(value).some(([key,text])=>key.length>80||typeof text!=="string"||text.length>240))throw new Error();specifications=JSON.stringify(value);}catch{return NextResponse.json({error:"Specifications must be a JSON object with short text values."},{status:400});}}
  const requestedImages=body.productImages===undefined?undefined:parseProductImages(body.productImages,undefined,name);if(requestedImages===null)return NextResponse.json({error:"Upload up to 12 valid product images and add short color or angle labels."},{status:400});const images=requestedImages;
  try{await prisma.$transaction(async(tx)=>{const previous=await tx.product.findUnique({where:{id},select:{stockQuantity:true}});if(!previous)throw new StockUpdateError("Product not found.");const resolvedBrandId=await resolveProductBrand(tx,brandId,body.brandName);await tx.product.update({where:{id},data:{name,sku,slug,description,categoryId,brandId:resolvedBrandId,model:model||null,priceMinor:Math.round(priceKsh*100),stockQuantity,warrantyMonths,isPublished,isFeatured,...(specifications!==undefined?{specifications}:{})}});if(images!==undefined){await tx.productImage.deleteMany({where:{productId:id}});if(images.length)await tx.productImage.createMany({data:images.map(image=>({...image,productId:id}))});}if(stockQuantity!==previous.stockQuantity)await tx.inventoryMovement.create({data:{productId:id,delta:stockQuantity-previous.stockQuantity,previous:previous.stockQuantity,next:stockQuantity,reason:"Product edit adjustment"}});});return NextResponse.json({ok:true});}catch(error){if(error instanceof StockUpdateError)return NextResponse.json({error:error.message},{status:404});if(error instanceof Error&&error.message==="Choose a valid brand.")return NextResponse.json({error:error.message},{status:400});if(error instanceof Prisma.PrismaClientKnownRequestError&&error.code==="P2002")return NextResponse.json({error:"That product slug or SKU is already in use."},{status:409});return NextResponse.json({error:"Could not update product."},{status:500});}
}

export async function DELETE(request:Request,{params}:{params:Promise<{id:string}>}){
  const auth=requireAdminRequest(request);if(auth)return auth;
  const {id}=await params;
  try{const product=await prisma.product.findUnique({where:{id},select:{id:true,_count:{select:{orderItems:true,inventoryMovements:true}}}});if(!product)return NextResponse.json({error:"Product not found."},{status:404});if(product._count.orderItems||product._count.inventoryMovements){await prisma.product.update({where:{id},data:{isPublished:false,availabilityNote:"Archived by admin"}});return NextResponse.json({ok:true,archived:true});}await prisma.product.delete({where:{id}});return NextResponse.json({ok:true});}catch{return NextResponse.json({error:"Could not delete this product."},{status:500});}
}
