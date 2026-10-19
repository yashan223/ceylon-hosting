import { NextResponse } from "next/server";
import { requireAdmin } from "@/server/auth/admin";
import { getDatabase } from "@/server/db/mongodb";
import { recordAuditLog } from "@/server/admin/audit";
import { productTypes, type ProductType } from "@/types/product";

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, context: RouteContext) {
  const admin = await requireAdmin();
  const { id } = await context.params;
  const body = (await request.json()) as Record<string, unknown>;
  const allowed = [
    "name",
    "description",
    "meta",
    "location",
    "locations",
    "price",
    "type",
    "accent",
    "active",
    "available",
    "tag",
    "imageUrl",
    "images",
  ];
  const update = Object.fromEntries(
    Object.entries(body).filter(([key, value]) => allowed.includes(key) && value !== undefined),
  );
  if (Object.keys(update).length === 0)
    return NextResponse.json({ error: "No valid product fields to update." }, { status: 400 });
  for (const field of ["name", "description"] as const) {
    if (field in update) {
      const value = update[field];
      if (typeof value !== "string" || !value.trim())
        return NextResponse.json({ error: "Enter valid product details." }, { status: 400 });
      update[field] = value.trim();
    }
  }
  if ("meta" in update) {
    update.meta = typeof update.meta === "string" ? update.meta.trim() : "";
  }
  if ("location" in update) {
    update.location = typeof update.location === "string" ? update.location.trim() : "";
  }
  if ("locations" in update) {
    if (Array.isArray(update.locations)) {
      const sanitizedLocations = update.locations
        .filter((item): item is string => typeof item === "string")
        .map((s) => s.trim())
        .filter(Boolean);
      update.locations = sanitizedLocations;
      if (!update.location && sanitizedLocations.length > 0) {
        update.location = sanitizedLocations[0];
      }
    } else {
      delete update.locations;
    }
  }
  if (update.type !== undefined && !productTypes.includes(update.type as ProductType))
    return NextResponse.json({ error: "Enter a valid product type." }, { status: 400 });
  if (update.price !== undefined) {
    update.price = Number(update.price);
    if (!Number.isInteger(update.price) || Number(update.price) < 0)
      return NextResponse.json({ error: "Enter a valid price." }, { status: 400 });
  }
  if ("tag" in update) {
    update.tag = typeof update.tag === "string" ? update.tag.trim() : "";
  }
  if ("imageUrl" in update) {
    update.imageUrl = typeof update.imageUrl === "string" ? update.imageUrl.trim() : "";
  }
  if ("images" in update) {
    if (Array.isArray(update.images)) {
      const sanitized = update.images
        .filter((item): item is string => typeof item === "string")
        .map((s) => s.trim())
        .filter(Boolean);
      update.images = sanitized;
      if (!update.imageUrl && sanitized.length > 0) {
        update.imageUrl = sanitized[0];
      }
    } else {
      delete update.images;
    }
  }
  if ("available" in update) {
    update.available = Boolean(update.available);
  }
  if ("active" in update) {
    update.active = Boolean(update.active);
  }
  if ("accent" in update && typeof update.accent === "string") {
    update.accent = update.accent.trim() || "slate";
  }
  const result = await (
    await getDatabase()
  )
    .collection("products")
    .updateOne({ id }, { $set: { ...update, updatedAt: new Date() } });
  if (result.matchedCount === 0)
    return NextResponse.json({ error: "Product not found." }, { status: 404 });

  await recordAuditLog({
    action: "PRODUCT_UPDATED",
    actorId: admin.id,
    actorEmail: admin.email,
    targetType: "product",
    targetId: id,
    targetName: typeof update.name === "string" ? update.name : id,
    details: `Updated fields: ${Object.keys(update).join(", ")}`,
  });

  return NextResponse.json({ ok: true });
}

export async function DELETE(_request: Request, context: RouteContext) {
  const admin = await requireAdmin();
  const { id } = await context.params;
  const result = await (await getDatabase()).collection("products").deleteOne({ id });
  if (result.deletedCount === 0)
    return NextResponse.json({ error: "Product not found." }, { status: 404 });

  await recordAuditLog({
    action: "PRODUCT_DELETED",
    actorId: admin.id,
    actorEmail: admin.email,
    targetType: "product",
    targetId: id,
    details: `Deleted product ID ${id}`,
  });

  return NextResponse.json({ ok: true });
}
