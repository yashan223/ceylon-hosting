import { NextResponse } from "next/server";
import { requireAdmin } from "@/server/auth/admin";
import { getProductById, updateProduct } from "@/server/catalog/products";
import { deleteProductFile } from "@/server/storage/private-files";
import { recordAuditLog } from "@/server/admin/audit";
import type { ProductGalleryItem } from "@/types/product";

type RouteContext = { params: Promise<{ id: string; imageId: string }> };

export const runtime = "nodejs";

export async function DELETE(_request: Request, context: RouteContext) {
  const admin = await requireAdmin();
  const { id, imageId } = await context.params;

  const product = await getProductById(id);
  if (!product) return NextResponse.json({ error: "Product not found." }, { status: 404 });

  const galleryImages: ProductGalleryItem[] = Array.isArray(product.galleryImages)
    ? product.galleryImages
    : [];
  const targetItem = galleryImages.find(
    (item) => item.id === imageId || item.url.endsWith(`/${imageId}`),
  );

  if (targetItem?.key) {
    await deleteProductFile(targetItem.key);
  }

  const existingImages: string[] = Array.isArray(product.images)
    ? product.images
    : product.imageUrl
      ? [product.imageUrl]
      : [];

  const updatedImages = existingImages.filter(
    (url) => url !== targetItem?.url && !url.endsWith(`/${imageId}`),
  );
  const updatedGallery = galleryImages.filter(
    (item) => item.id !== imageId && !item.url.endsWith(`/${imageId}`),
  );

  let newImageUrl = product.imageUrl;
  let newImageKey = product.imageKey;
  let newImageContentType = product.imageContentType;

  if (targetItem?.url === product.imageUrl || product.imageUrl?.endsWith(`/${imageId}`)) {
    if (updatedImages.length > 0) {
      newImageUrl = updatedImages[0];
      const match = updatedGallery.find((g) => g.url === newImageUrl);
      newImageKey = match?.key ?? "";
      newImageContentType = match?.contentType ?? "";
    } else {
      newImageUrl = "";
      newImageKey = "";
      newImageContentType = "";
    }
  }

  await updateProduct(id, {
    imageUrl: newImageUrl,
    imageKey: newImageKey,
    imageContentType: newImageContentType,
    images: updatedImages,
    galleryImages: updatedGallery,
  });

  await recordAuditLog({
    action: "PRODUCT_UPDATED",
    actorId: admin.id,
    actorEmail: admin.email,
    targetType: "product",
    targetId: id,
    targetName: product.name,
    details: `Removed gallery image ${imageId} from product "${product.name}"`,
  });

  return NextResponse.json({
    ok: true,
    images: updatedImages,
    imageUrl: newImageUrl,
  });
}
