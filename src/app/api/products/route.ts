import { NextResponse } from "next/server";
import { getActiveProducts } from "@/server/catalog/products";

export const dynamic = "force-dynamic";

export async function GET() {
  const products = await getActiveProducts();
  return NextResponse.json({ products });
}
