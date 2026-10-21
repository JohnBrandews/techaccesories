"use client";

import Image from "next/image";
import { useState } from "react";

type ProductImageData={url:string;altText:string};
export function ProductGallery({images,productName}:{images:ProductImageData[];productName:string}){
  const [active,setActive]=useState(0);const current=images[active];
  return <div className="product-gallery"><div className="detail-image">{current?.url?<Image src={current.url} alt={current.altText||productName} fill sizes="(max-width: 800px) 100vw, 55vw" unoptimized/>:<span>TECHACCESORIES</span>}</div>{images.length>1?<div className="gallery-thumbnails" aria-label="More product images">{images.map((image,index)=><button type="button" key={`${image.url}-${index}`} aria-label={`Show image ${index+1}`} aria-pressed={active===index} onClick={()=>setActive(index)}>{image.url?<Image src={image.url} alt="" fill sizes="90px" unoptimized/>:null}</button>)}</div>:null}</div>;
}
