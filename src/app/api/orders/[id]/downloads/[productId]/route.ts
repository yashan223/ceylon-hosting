import { NextResponse } from "next/server";
import { getCurrentUser } from "@/server/auth/session";
import { canDownloadProduct, recordOrderEvent } from "@/server/orders/orders";
import { getProductById } from "@/server/catalog/products";
import { readProductFile, getProductDownloadSignedUrl } from "@/server/storage/private-files";

type RouteContext = { params: Promise<{ id: string; productId: string }> };

export const runtime = "nodejs";

export async function GET(_request: Request, context: RouteContext) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  const { id: orderId, productId } = await context.params;
  if (!(await canDownloadProduct(orderId, user.id, productId)))
    return NextResponse.json(
      { error: "This paid download is not available for your account." },
      { status: 403 },
    );

  const product = await getProductById(productId);
  if (!product?.downloadKey || !product.downloadName)
    return NextResponse.json(
      { error: "This product has no downloadable file yet." },
      { status: 404 },
    );

  try {
    const signedUrl = await getProductDownloadSignedUrl(product.downloadKey, product.downloadName);
    if (signedUrl) {
      await recordOrderEvent(orderId, "download.authorized", user.id, productId);
      return NextResponse.redirect(signedUrl);
    }

    const file = await readProductFile(product.downloadKey);
    await recordOrderEvent(orderId, "download.authorized", user.id, productId);
    return new NextResponse(new Uint8Array(file), {
      headers: {
        "Content-Type": "application/octet-stream",
        "Content-Disposition": `attachment; filename="${product.downloadName.replace(/[^a-zA-Z0-9._-]/g, "_")}"`,
        "Cache-Control": "private, no-store",
      },
    });
  } catch {
    return NextResponse.json({ error: "The product file is unavailable." }, { status: 404 });
  }
}
