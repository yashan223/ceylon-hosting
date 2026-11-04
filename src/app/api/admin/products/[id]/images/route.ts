import { NextResponse } from "next/server";
import { randomBytes } from "node:crypto";
import { getAdminApiUser } from "@/server/auth/admin";
import { getProductById, updateProduct } from "@/server/catalog/products";
import { uploadProductFile } from "@/server/storage/private-files";
import { recordAuditLog } from "@/server/admin/audit";
import type { Product, ProductGalleryItem } from "@/types/product";

type RouteContext = { params: Promise<{ id: string }> };

export const runtime = "nodejs";

export async function POST(request: Request, context: RouteContext) {
  const admin = await getAdminApiUser();
  if (!admin) return NextResponse.json({ error: "Admin access required." }, { status: 401 });

  const { id } = await context.params;
  const product = await getProductById(id);
  if (!product) return NextResponse.json({ error: "Product not found." }, { status: 404 });

  const contentType = request.headers.get("content-type") || "";

  if (contentType.includes("application/json")) {
    const body = (await request.json().catch(() => ({}))) as {
      uploaded?: Array<{ storagePath: string; fileName: string; contentType?: string }>;
    };

    const uploaded = Array.isArray(body.uploaded) ? body.uploaded : [];
    if (uploaded.length === 0) {
      return NextResponse.json({ error: "No uploaded images provided." }, { status: 400 });
    }

    const newGalleryItems: ProductGalleryItem[] = [];
    const newUrls: string[] = [];

    for (const item of uploaded) {
      const imageId = `${Date.now().toString(36)}-${randomBytes(4).toString("hex")}`;
      const url = `/api/products/${encodeURIComponent(id)}/images/${encodeURIComponent(imageId)}`;
      newGalleryItems.push({
        id: imageId,
        url,
        key: item.storagePath,
        contentType: item.contentType || "image/jpeg",
        fileName: item.fileName,
      });
      newUrls.push(url);
    }

    const existingImages: string[] = Array.isArray(product.images)
      ? [...product.images]
      : product.imageUrl
        ? [product.imageUrl]
        : [];

    const existingGallery: ProductGalleryItem[] = Array.isArray(product.galleryImages)
      ? [...product.galleryImages]
      : [];

    const updatedImages = [...existingImages, ...newUrls];
    const updatedGallery = [...existingGallery, ...newGalleryItems];

    const updatePayload: Partial<Product> = {
      images: updatedImages,
      galleryImages: updatedGallery,
    };

    if (!product.imageUrl && newGalleryItems.length > 0) {
      updatePayload.imageUrl = newGalleryItems[0].url;
      updatePayload.imageKey = newGalleryItems[0].key;
      updatePayload.imageContentType = newGalleryItems[0].contentType;
    }

    await updateProduct(id, updatePayload);

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

  const newGalleryItems: ProductGalleryItem[] = [];
  const newUrls: string[] = [];

  try {
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
  } catch (err) {
    console.error("Failed to upload image file:", err);
    return NextResponse.json({ error: "Failed to store image files." }, { status: 502 });
  }

  const existingImages: string[] = Array.isArray(product.images)
    ? [...product.images]
    : product.imageUrl
      ? [product.imageUrl]
      : [];

  const existingGallery: ProductGalleryItem[] = Array.isArray(product.galleryImages)
    ? [...product.galleryImages]
    : [];

  const updatedImages = [...existingImages, ...newUrls];
  const updatedGallery = [...existingGallery, ...newGalleryItems];

  const updatePayload: Partial<Product> = {
    images: updatedImages,
    galleryImages: updatedGallery,
  };

  if (!product.imageUrl && newGalleryItems.length > 0) {
    updatePayload.imageUrl = newGalleryItems[0].url;
    updatePayload.imageKey = newGalleryItems[0].key;
    updatePayload.imageContentType = newGalleryItems[0].contentType;
  }

  await updateProduct(id, updatePayload);

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
  const admin = await getAdminApiUser();
  if (!admin) return NextResponse.json({ error: "Admin access required." }, { status: 401 });

  const { id } = await context.params;
  const body = (await request.json().catch(() => ({}))) as { images?: unknown };
  if (!Array.isArray(body.images) || !body.images.every((item) => typeof item === "string")) {
    return NextResponse.json({ error: "Invalid images array." }, { status: 400 });
  }

  const product = await getProductById(id);
  if (!product) return NextResponse.json({ error: "Product not found." }, { status: 404 });

  const images = body.images.map((s) => s.trim()).filter(Boolean);
  const updatePayload: Partial<Product> = {
    images,
  };

  if (images.length > 0) {
    updatePayload.imageUrl = images[0];
    const matchingItem = product.galleryImages?.find(
      (g: ProductGalleryItem) => g.url === images[0],
    );
    if (matchingItem) {
      updatePayload.imageKey = matchingItem.key;
      updatePayload.imageContentType = matchingItem.contentType;
    }
  } else {
    updatePayload.imageUrl = "";
  }

  await updateProduct(id, updatePayload);

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
