import { NextResponse } from "next/server";
import { requireAdmin } from "@/server/auth/admin";
import { getDatabase } from "@/server/db/mongodb";
import { productTypes, type Product, type ProductType } from "@/types/product";

type ProductRecord = Omit<Product, "createdAt" | "updatedAt"> & {
  createdAt: Date;
  updatedAt: Date;
};

function productInput(body: Record<string, unknown>) {
  const type = body.type;
  const name = typeof body.name === "string" ? body.name.trim() : "";
  const description = typeof body.description === "string" ? body.description.trim() : "";
  const meta = typeof body.meta === "string" ? body.meta.trim() : "";
  const price = typeof body.price === "number" ? body.price : Number(body.price);
  if (
    !name ||
    !description ||
    !productTypes.includes(type as ProductType) ||
    !Number.isInteger(price) ||
    price < 0
  )
    return null;
  return {
    type: type as ProductType,
    name,
    description,
    meta,
    price,
    accent: typeof body.accent === "string" && body.accent.trim() ? body.accent.trim() : "slate",
    active: body.active !== false,
    available: body.available !== false,
    tag: typeof body.tag === "string" && body.tag.trim() ? body.tag.trim() : undefined,
    imageUrl:
      typeof body.imageUrl === "string" && body.imageUrl.trim() ? body.imageUrl.trim() : undefined,
    images: Array.isArray(body.images)
      ? body.images
          .filter((item): item is string => typeof item === "string")
          .map((s) => s.trim())
          .filter(Boolean)
      : undefined,
  };
}

import { recordAuditLog } from "@/server/admin/audit";

export async function POST(request: Request) {
  const admin = await requireAdmin();
  const input = productInput((await request.json()) as Record<string, unknown>);
  if (!input)
    return NextResponse.json(
      { error: "Enter a valid name, type, description, and price." },
      { status: 400 },
    );
  const now = new Date();
  const id = `${input.name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")}-${Date.now().toString(36)}`;
  const product: ProductRecord = { id, ...input, createdAt: now, updatedAt: now };
  await (await getDatabase()).collection("products").insertOne(product);

  await recordAuditLog({
    action: "PRODUCT_CREATED",
    actorId: admin.id,
    actorEmail: admin.email,
    targetType: "product",
    targetId: id,
    targetName: input.name,
    details: `Created new ${input.type} item "${input.name}" at Rs. ${input.price}`,
  });

  return NextResponse.json(
    { product: { ...product, createdAt: now.toISOString(), updatedAt: now.toISOString() } },
    { status: 201 },
  );
}
