import { NextResponse } from "next/server";
import { getProductById } from "@/server/catalog/products";
import { readProductFile } from "@/server/storage/private-files";

type RouteContext = { params: Promise<{ id: string; imageId: string }> };

export const runtime = "nodejs";

export async function GET(_request: Request, context: RouteContext) {
  const { id, imageId } = await context.params;
  const product = await getProductById(id);

  if (!product) return new NextResponse("Image not found.", { status: 404 });

  let targetKey = product.galleryImages?.find(
    (item) => item.id === imageId || item.url.endsWith(`/${imageId}`),
  )?.key;
  let targetContentType = product.galleryImages?.find(
    (item) => item.id === imageId || item.url.endsWith(`/${imageId}`),
  )?.contentType;

  if (!targetKey && imageId === "main") {
    targetKey = product.imageKey;
    targetContentType = product.imageContentType;
  }

  if (!targetKey) return new NextResponse("Image not found.", { status: 404 });

  try {
    const image = await readProductFile(targetKey);
    const contentType =
      targetContentType && /^image\/(png|jpe?g|webp|gif|svg\+xml|avif)$/i.test(targetContentType)
        ? targetContentType
        : "application/octet-stream";

    return new NextResponse(new Uint8Array(image), {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=3600",
        "X-Content-Type-Options": "nosniff",
        "Content-Security-Policy": "default-src 'none'; sandbox",
      },
    });
  } catch {
    return new NextResponse("Image not found.", { status: 404 });
  }
}
