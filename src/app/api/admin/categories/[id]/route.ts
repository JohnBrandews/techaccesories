import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminRequest } from "@/lib/admin-api";

export async function PATCH(request:Request,{params}:{params:Promise<{id:string}>}){
  const auth=requireAdminRequest(request);if(auth)return auth;
  const {id}=await params;let body:Record<string,unknown>;try{body=await request.json() as Record<string,unknown>;}catch{return NextResponse.json({error:"Invalid request."},{status:400});}
  const data:{isActive?:boolean;sortOrder?:number}={};if(typeof body.isActive==="boolean")data.isActive=body.isActive;if(body.sortOrder!==undefined){const sortOrder=Number(body.sortOrder);if(!Number.isInteger(sortOrder)||sortOrder<0||sortOrder>10000)return NextResponse.json({error:"Sort order must be from 0 to 10,000."},{status:400});data.sortOrder=sortOrder;}
  if(!Object.keys(data).length)return NextResponse.json({error:"No category changes supplied."},{status:400});
  try{await prisma.category.update({where:{id},data});return NextResponse.json({ok:true});}catch{return NextResponse.json({error:"Could not update this category."},{status:404});}
}
