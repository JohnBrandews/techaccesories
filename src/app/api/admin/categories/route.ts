import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminRequest } from "@/lib/admin-api";

export async function POST(request:Request){
  const auth=requireAdminRequest(request);if(auth)return auth;
  let body:Record<string,unknown>;try{body=await request.json() as Record<string,unknown>;}catch{return NextResponse.json({error:"Invalid request."},{status:400});}
  const name=typeof body.name==="string"?body.name.trim():"";const description=typeof body.description==="string"?body.description.trim():"";const slug=typeof body.slug==="string"&&body.slug.trim()?body.slug.trim().toLowerCase():name.toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"");
  if(!name||name.length>100||description.length>500||!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)||slug.length>120)return NextResponse.json({error:"Enter a category name and a valid URL slug."},{status:400});
  try{const sortOrder=(await prisma.category.aggregate({_max:{sortOrder:true}}))._max.sortOrder??0;const category=await prisma.category.create({data:{name,slug,description:description||null,sortOrder:sortOrder+1}});return NextResponse.json({id:category.id},{status:201});}catch(error){if(error instanceof Prisma.PrismaClientKnownRequestError&&error.code==="P2002")return NextResponse.json({error:"That category slug is already in use."},{status:409});return NextResponse.json({error:"Could not create category."},{status:500});}
}
