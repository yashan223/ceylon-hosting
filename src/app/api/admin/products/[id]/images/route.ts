import { NextResponse } from "next/server";
import { randomBytes } from "node:crypto";
import type { Document, UpdateFilter } from "mongodb";
import { requireAdmin } from "@/server/auth/admin";
import { getDatabase } from "@/server/db/mongodb";
import { uploadProductFile } from "@/server/storage/private-files";
import { recordAuditLog } from "@/server/admin/audit";
import type { ProductGalleryItem } from "@/types/product";

type RouteContext = { params: Promise<{ id: string }> };

export const runtime = "nodejs";

export async function POST(request: Request, context: RouteContext) {
  const admin = await requireAdmin();
  const { id } = await context.params;
  const formData = await request.formData();
  const files: File[] = [];

  const allFiles = formData.getAll("files");
  for (const item of allFiles) {
    if (item instanceof File) files.push(item);
  }
  const singleFile = formData.get("file");
  if (singleFile instanceof File && !files.includes(singleFile)) {
    files.push(singleFile);
  }

  if (files.length === 0) {
    return NextResponse.json({ error: "Choose at least one image file." }, { status: 400 });
  }

  for (const file of files) {
    if (!file.type.startsWith("image/")) {
      return NextResponse.json({ error: "All uploaded files must be images." }, { status: 400 });
    }
    if (file.size === 0 || file.size > 10 * 1024 * 1024) {
      return NextResponse.json(
        { error: "Images must be between 1 byte and 10 MB." },
        { status: 400 },
      );
    }
  }

  const database = await getDatabase();
  const product = await database.collection("products").findOne({ id });
  if (!product) return NextResponse.json({ error: "Product not found." }, { status: 404 });

  const newGalleryItems: ProductGalleryItem[] = [];
  const newUrls: string[] = [];

  for (const file of files) {
    const uploaded = await uploadProductFile(id, file);
    const imageId = `${Date.now().toString(36)}-${randomBytes(4).toString("hex")}`;
    const url = `/api/products/${encodeURIComponent(id)}/images/${encodeURIComponent(imageId)}`;
    newGalleryItems.push({
      id: imageId,
      url,
      key: uploaded.key,
      contentType: uploaded.contentType,
      fileName: uploaded.fileName,
    });
    newUrls.push(url);
  }

  const existingImages: string[] = Array.isArray(product.images)
    ? [...product.images]
    : product.imageUrl
      ? [product.imageUrl]
      : [];

  const updatedImages = [...existingImages, ...newUrls];
  const setPayload: Record<string, unknown> = {
    images: updatedImages,
    updatedAt: new Date(),
  };

  if (!product.imageUrl && newGalleryItems.length > 0) {
    setPayload.imageUrl = newGalleryItems[0].url;
    setPayload.imageKey = newGalleryItems[0].key;
    setPayload.imageContentType = newGalleryItems[0].contentType;
  }

  await database.collection("products").updateOne({ id }, {
    $set: setPayload,
    $push: { galleryImages: { $each: newGalleryItems } },
  } as UpdateFilter<Document>);

  await recordAuditLog({
    action: "PRODUCT_UPDATED",
    actorId: admin.id,
    actorEmail: admin.email,
    targetType: "product",
    targetId: id,
    targetName: product.name,
    details: `Added ${newGalleryItems.length} gallery image(s) to product "${product.name}"`,
  });

  return NextResponse.json({
    ok: true,
    addedCount: newGalleryItems.length,
    images: updatedImages,
  });
}

export async function PUT(request: Request, context: RouteContext) {
  const admin = await requireAdmin();
  const { id } = await context.params;
  const body = (await request.json()) as { images?: unknown };
  if (!Array.isArray(body.images) || !body.images.every((item) => typeof item === "string")) {
    return NextResponse.json({ error: "Invalid images array." }, { status: 400 });
  }

  const database = await getDatabase();
  const product = await database.collection("products").findOne({ id });
  if (!product) return NextResponse.json({ error: "Product not found." }, { status: 404 });

  const images = body.images.map((s) => s.trim()).filter(Boolean);
  const setPayload: Record<string, unknown> = {
    images,
    updatedAt: new Date(),
  };

  if (images.length > 0) {
    setPayload.imageUrl = images[0];
    const matchingItem = product.galleryImages?.find(
      (g: ProductGalleryItem) => g.url === images[0],
    );
    if (matchingItem) {
      setPayload.imageKey = matchingItem.key;
      setPayload.imageContentType = matchingItem.contentType;
    }
  } else {
    setPayload.imageUrl = "";
  }

  await database.collection("products").updateOne({ id }, { $set: setPayload });

  await recordAuditLog({
    action: "PRODUCT_UPDATED",
    actorId: admin.id,
    actorEmail: admin.email,
    targetType: "product",
    targetId: id,
    targetName: product.name,
    details: `Updated gallery images for "${product.name}"`,
  });

  return NextResponse.json({ ok: true, images });
}
