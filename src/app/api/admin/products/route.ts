import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminRequest } from "@/lib/admin-api";
import { resolveProductBrand } from "@/lib/brand";

export async function POST(request:Request) {
  const auth= requireAdminRequest(request); if(auth)return auth;
  let body:Record<string,unknown>;
  try { body=await request.json() as Record<string,unknown>; } catch { return NextResponse.json({error:"Invalid request."},{status:400}); }
  const name=typeof body.name==="string"?body.name.trim():"";
  const description=typeof body.description==="string"?body.description.trim():"";
  const sku=typeof body.sku==="string"?body.sku.trim().toUpperCase():"";
  const categoryId=typeof body.categoryId==="string"?body.categoryId:"";
  const brandId=typeof body.brandId==="string"&&body.brandId?body.brandId:null;
  const slug=typeof body.slug==="string"&&body.slug.trim()?body.slug.trim().toLowerCase():name.toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"");
  const model=typeof body.model==="string"?body.model.trim():"";
  const priceKsh=Number(body.priceKsh);const stockQuantity=Number(body.stockQuantity);const warrantyMonths=body.warrantyMonths===""||body.warrantyMonths==null?null:Number(body.warrantyMonths);
  const imageUrl=typeof body.imageUrl==="string"?body.imageUrl.trim():"";
  if(!name||name.length>160||!description||description.length>8000||!/^[-A-Z0-9_]{3,64}$/.test(sku)||! /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)||slug.length>180||!Number.isFinite(priceKsh)||priceKsh<=0||priceKsh>20000000||!Number.isInteger(stockQuantity)||stockQuantity<0||stockQuantity>100000||!categoryId||!(warrantyMonths===null||(Number.isInteger(warrantyMonths)&&warrantyMonths>=0&&warrantyMonths<=120))) return NextResponse.json({error:"Review the required product fields and try again."},{status:400});
  if(imageUrl&&!(imageUrl.startsWith("/")||imageUrl.startsWith("https://"))) return NextResponse.json({error:"Image URL must be a local path or HTTPS URL."},{status:400});
  let specifications:Record<string,string>={};
  if(typeof body.specifications==="string"&&body.specifications.trim()){
    try{const parsed=JSON.parse(body.specifications) as unknown;if(!parsed||typeof parsed!=="object"||Array.isArray(parsed))throw new Error();for(const [key,value] of Object.entries(parsed)){if(key.length>80||typeof value!=="string"||value.length>240)throw new Error();}specifications=parsed as Record<string,string>;}catch{return NextResponse.json({error:"Specifications must be a JSON object with short text values."},{status:400});}
  }
  const category=await prisma.category.findFirst({where:{id:categoryId,isActive:true}});
  if(!category)return NextResponse.json({error:"Choose an active category."},{status:400});
  try{
    const product=await prisma.$transaction(async(tx)=>{
      const resolvedBrandId=await resolveProductBrand(tx,brandId,body.brandName);
      const created=await tx.product.create({data:{name,slug,description,sku,model:model||null,categoryId,brandId:resolvedBrandId,priceMinor:Math.round(priceKsh*100),stockQuantity,warrantyMonths,specifications:JSON.stringify(specifications),isPublished:true,isFeatured:body.isFeatured===true,images:imageUrl?{create:{url:imageUrl,altText:name,sortOrder:0}}:undefined}});
      if(stockQuantity>0)await tx.inventoryMovement.create({data:{productId:created.id,delta:stockQuantity,previous:0,next:stockQuantity,reason:"Initial stock"}});
      return created;
    });
    return NextResponse.json({id:product.id,slug:product.slug},{status:201});
  }catch(error){if(error instanceof Error&&error.message==="Choose a valid brand.")return NextResponse.json({error:error.message},{status:400});if(error instanceof Prisma.PrismaClientKnownRequestError&&error.code==="P2002")return NextResponse.json({error:"That product slug or SKU is already in use."},{status:409});return NextResponse.json({error:"Could not save the product."},{status:500});}
}
